/* An isolated experiment: does not replace passing rankings or screenshot analysis. */
const matchPanel=document.createElement('section');matchPanel.className='panel wide outcome-panel';matchPanel.id='match-outlook';
(()=>{
  const field=(id,label,value,min,max,step=1)=>`<label>${label}<input id="${id}" type="number" value="${value}" min="${min}" max="${max}" step="${step}"></label>`;
  matchPanel.innerHTML=`<div class="eyebrow">EXPERIMENTAL MODEL · USER ASSUMPTIONS</div><h2>What could change the result?</h2>
  <p>Explore match outcomes from score, time and assumed goal rates. Then compare possible actions from your tactics board. These estimates have not been calibrated on real matches.</p>
  <details open><summary>1. Set the match context</summary><div class="outcome-grid">
  <label>Home team<input id="wpHome" value="Home" maxlength="40"></label><label>Away team<input id="wpAway" value="Away" maxlength="40"></label>
  ${field('wpHomeScore','Home score',1,0,49)}${field('wpAwayScore','Away score',1,0,49)}${field('wpMinute','Elapsed minutes',80,0,120,.1)}${field('wpStoppage','Added minutes after 90',0,0,30,.1)}
  <label>Analysed board team<select id="wpTeam"><option value="blue">Blue</option><option value="coral">Coral</option></select></label>
  <label>Analysed team plays as<select id="wpSide"><option value="home">Home</option><option value="away">Away</option></select></label>
  ${field('wpHomeRate','Home goals per 90 · assumed',1.5,0,10,.1)}${field('wpAwayRate','Away goals per 90 · assumed',1.2,0,10,.1)}
  </div><button id="wpReset">Reset match assumptions</button></details>
  <p id="wpError" role="alert"></p><div id="wpDashboard" aria-live="polite"></div>
  <details><summary>How this baseline works</summary><p>Each team scores independently at a constant rate: expected remaining goals = goals per 90 × remaining minutes / 90. Future goal counts follow a Poisson distribution. Home advantage is represented only by the goal rates you enter. Score and time affect results; possession, red cards and tactical state do not change these rates. Regulation plus added time only; no extra time or penalties.</p></details>
  <section class="share-board" aria-label="Experimental tactical guidance"><div class="eyebrow">OPTIONAL · EXPERIMENTAL GUIDANCE</div><h3>What are you playing for?</h3><label for="wpIntent">Tactical intention</label><select id="wpIntent"><option value="off">Off · explore without guidance</option><option value="auto">Follow the score</option><option value="protect">Protect the lead</option><option value="win">Find a winning goal</option><option value="equalise">Chase an equaliser</option></select><div id="wpGuidance" role="status"></div><p class="fine">This guide explains tradeoffs. It does not change your passing objective, rank actions, adjust probabilities or make rejected passes feasible. Compare actions below using your own assumptions.</p></section>
  <h3>2. Compare board actions</h3><p id="wpBoardNote"></p><p>Shot opportunity is a geometry heuristic out of 100, not xG. It uses distance, goal angle, nearby defenders and straight-line blockers. Receiving positions hold defenders stationary; they do not forecast a future frame.</p>
  <div class="scroll"><table><thead><tr><th>Action</th><th>Pass heuristic</th><th>Shot opportunity</th><th>Distance / angle</th><th>Scenario impact</th><th>Explore</th></tr></thead><tbody id="wpActions"></tbody></table></div>
  <section aria-label="Calculated action comparisons"><h3>Your calculated comparisons</h3><p>Explore an action, enter assumptions, then calculate. Each card keeps the assumptions used for that calculation. Compare the same time window; these are illustrative scenarios, not an automatic best-action recommendation.</p><div id="wpComparisons" class="outcome-comparisons" aria-live="polite"></div></section><h3>3. Explore an action’s possible outcomes</h3><p id="wpSelected">Choose an action above.</p>
  <p>Enter your own hypothetical probabilities. They are not inferred from the heuristic scores. The same inputs can produce the same impact for different actions. Change them only when your scenario assumptions differ.</p>
  <div class="outcome-grid">
  ${field('wpRetention','Possession retained · assumed %',80,0,100)}${field('wpSuccess','Pass completes · assumed %',75,0,100)}${field('wpCreation','Shot created after completion · assumed %',30,0,100)}${field('wpGoal','Shot scores if taken · assumed %',10,0,100)}${field('wpCounter','Opponent goal after failure / turnover · assumed %',5,0,100)}${field('wpWindow','Action + counter window · seconds',15,1,120)}
  </div><button id="wpEvaluate" class="primary" disabled>Calculate illustrative impact</button><div id="wpScenario" aria-live="polite"></div>
  <p class="fine">The branches replace all goal generation during the selected action window. The Poisson baseline resumes afterwards, so an explicit goal is not counted twice. No-goal possession branches share the same future rates; rebounds and counters after a completed pass followed by a missed shot are omitted. This is a scenario comparison, not a validated tactical recommendation.</p>`;
  document.querySelector('.layout').append(matchPanel);
  let actions=[],selected=null,scenarios=new Map(),signature='',importVersion=0;
  const persistence=document.createElement('div');persistence.className='toolbar';
  persistence.innerHTML='<button id="wpSaveSession">Save match scenario</button><button id="wpLoadSession">Load saved scenario</button><button id="wpExport">Export match JSON</button><label>Import match JSON<input id="wpImport" type="file" accept=".json,application/json"></label><p id="wpStorageStatus" role="status"></p>';
  matchPanel.append(persistence);
  const fieldIds=['wpHome','wpAway','wpHomeScore','wpAwayScore','wpMinute','wpStoppage','wpTeam','wpSide','wpHomeRate','wpAwayRate','wpSuccess','wpCreation','wpGoal','wpCounter','wpWindow','wpRetention','wpIntent'];
  const num=id=>{const el=$(id);if(el.value===''||!el.checkValidity())throw Error(`Check ${el.parentElement.textContent.trim()}.`);return Number(el.value);};
  const context=()=>({homeScore:num('wpHomeScore'),awayScore:num('wpAwayScore'),minute:num('wpMinute'),stoppage:num('wpStoppage'),homeRate:num('wpHomeRate'),awayRate:num('wpAwayRate'),side:$('wpSide').value});
  const pct=n=>(100*n).toFixed(1)+'%', pp=n=>(n>=0?'+':'')+(100*n).toFixed(2)+' pp';
  function clearScenario(){scenarios.clear();$('wpComparisons').replaceChildren();$('wpScenario').replaceChildren();$('motionPlot')?.replaceChildren();if($('motionResult'))$('motionResult').textContent='State changed. Plot again.';}
  function assumptions(a,p){
    const parts=a.kind==='keep'?[`Retention ${pct(p.success)}`, 'No own-team shot']:a.kind==='shot'?[`Shot scoring ${pct(p.goal)}`]:[`Completion ${pct(p.success)}`,`Shot creation after completion ${pct(p.creation)}`,`Shot scoring ${pct(p.goal)}`];
    parts.push(`Opponent goal after ${a.kind==='keep'?'turnover':a.kind==='shot'?'miss':'failed pass'} ${pct(p.counter)}`,`Window ${p.seconds}s`);
    return parts.join(' · ');
  }
  function comparisons(){
    const box=$('wpComparisons');box.replaceChildren();
    for(const a of actions){const saved=scenarios.get(a.key);if(!saved)continue;
      const card=document.createElement('article');card.className='outcome-card';
      const title=document.createElement('h4');title.textContent=a.label;card.append(title);
      const values=OutcomeModel.percentages(saved.expectedOutcomes),baseline=OutcomeModel.percentages(saved.baselineOutcomes);
      const list=document.createElement('dl');
      ['win','draw','loss'].forEach((key,i)=>{const row=document.createElement('div'),term=document.createElement('dt'),value=document.createElement('dd');term.textContent=key[0].toUpperCase()+key.slice(1);value.textContent=`${values[i].toFixed(1)}% · ${pp(saved.changes[key])} vs baseline ${baseline[i].toFixed(1)}%`;row.append(term,value);list.append(row);});
      const note=document.createElement('p');note.className='fine';note.textContent='Assumptions used: '+assumptions(a,saved.assumptions);
      const bar=document.createElement('div');bar.className='outcome-bar scenario-bar';bar.setAttribute('role','img');bar.setAttribute('aria-label',`Illustrative win ${values[0].toFixed(1)}%, draw ${values[1].toFixed(1)}%, loss ${values[2].toFixed(1)}%`);
      values.forEach(v=>{const segment=document.createElement('span');segment.style.width=v+'%';bar.append(segment);});
      card.append(bar,list,note);box.append(card);
    }
    if(!box.children.length)box.textContent='No calculated actions yet. Choose an action card, enter your assumptions, then calculate.';
  }
  function draw(){
    $('wpGuidance').replaceChildren();$('wpError').textContent='';$('wpDashboard').replaceChildren();$('wpActions').replaceChildren();
    try{
      const s=context(),o=OutcomeModel.outcome(s),percent=OutcomeModel.percentages(o);
      const team=$(s.side==='home'?'wpHome':'wpAway').value||s.side;
      const heading=document.createElement('h3');heading.textContent=`${team}: ${s.homeScore}–${s.awayScore} · ${s.minute} minutes`;
      const bar=document.createElement('div');bar.className='outcome-bar';bar.setAttribute('role','img');bar.setAttribute('aria-label',`Win ${percent[0]}%, draw ${percent[1]}%, loss ${percent[2]}%`);
      for(let i=0;i<3;i++){const segment=document.createElement('span');segment.style.width=percent[i]+'%';bar.append(segment);}
      const legend=document.createElement('p');legend.className='outcome-legend';legend.textContent=`Win ${percent[0].toFixed(1)}% · Draw ${percent[1].toFixed(1)}% · Loss ${percent[2].toFixed(1)}%`;
      $('wpDashboard').append(heading,bar,legend);
      const guidance=OutcomeModel.guidance(s,$('wpIntent').value),guideTitle=document.createElement('h4'),guideText=document.createElement('p');guideTitle.textContent=guidance.title;guideText.textContent=guidance.text;$('wpGuidance').append(guideTitle,guideText);
      const owner=state.players.find(p=>p.id===state.owner),teamId=$('wpTeam').value;
      actions=[];
      if(owner?.team===teamId&&!replayActive){
        const seen=new Set();
        for(const c of [...result.all].filter(c=>c.viable).sort((a,b)=>b.score-a.score)){
          if(seen.has(c.receiver))continue;seen.add(c.receiver);
          actions.push({key:c.key,kind:'pass',label:`Pass to ${c.receiver} · ${c.target.label} · ${c.speed} m/s · ${c.foot}`,pass:c.score,shot:OutcomeModel.shot(state,c.target,teamId),seconds:c.total,target:c.target});
          if(actions.length===3)break;
        }
        actions.push({key:'keep-'+owner.id,kind:'keep',label:'Keep possession · hold or recycle',pass:null,shot:null,seconds:0});
        actions.push({key:'direct-'+owner.id,kind:'shot',label:`Direct shot · ${owner.id}`,pass:null,shot:OutcomeModel.shot(state,state.ball,teamId),seconds:0,target:{x:teamId==='blue'?105:0,y:34}});
      }
      $('wpBoardNote').textContent=replayActive?'Exit synthetic replay to explore a separate match scenario.':!owner?'Assign a passer on the tactics board first.':owner.team!==teamId?'The analysed team must match the tactics-board passer. Change the team above or the passer.':`${actions.filter(a=>a.kind==='pass').length} feasible passing options plus hypothetical keep-possession and direct-shot scenarios. Rejected passes are excluded. Open Tactics board to drag players, then return here.`;
      for(const a of actions){
        const tr=document.createElement('tr'),saved=scenarios.get(a.key);tr.dataset.action=a.key;tr.dataset.kind=a.kind;
        for(const value of [a.label,a.pass===null?'—':a.pass.toFixed(0)+' / 100',a.shot?a.shot.score.toFixed(0)+' / 100':'—',a.shot?`${a.shot.distance.toFixed(1)} m / ${a.shot.angleDegrees.toFixed(1)}°`:'No assumed shot',saved?pp(saved.wpa)+' · illustrative':'Not estimated']){const td=document.createElement('td');td.textContent=value;tr.append(td);}
        const td=document.createElement('td'),b=document.createElement('button');b.textContent='Explore';b.setAttribute('aria-label','Explore '+a.label);b.onclick=()=>{selected=a.key;selection();};td.append(b);tr.append(td);$('wpActions').append(tr);
      }
      comparisons();selection();
    }catch(e){$('wpError').textContent=e.message;actions=[];selected=null;$('wpEvaluate').disabled=true;clearScenario();}
  }
  function selection(){
    $('motionPlot')?.replaceChildren();if($('motionResult'))$('motionResult').textContent='Selection changed. Plot again.';
    const a=actions.find(a=>a.key===selected);
    document.querySelectorAll('#wpActions tr').forEach(row=>{row.classList.toggle('selected-action',row.dataset.action===selected);row.querySelector('button').setAttribute('aria-pressed',String(row.dataset.action===selected));});
    $('wpEvaluate').disabled=!a;
    $('wpSuccess').disabled=$('wpCreation').disabled=a?.kind!=='pass';
    $('wpGoal').disabled=a?.kind==='keep';
    for(const id of ['wpSuccess','wpCreation'])$(id).parentElement.hidden=a?.kind==='keep'||a?.kind==='shot';
    $('wpGoal').parentElement.hidden=a?.kind==='keep';
    $('wpRetention').disabled=a?.kind!=='keep';
    $('wpRetention').parentElement.hidden=a?.kind!=='keep';
    if($('motionRun'))$('motionRun').disabled=!a||a.kind==='keep';
    $('wpSelected').textContent=a?.kind==='keep'?'Hold or recycle possession without an own-team shot during the selected window. Retention and turnover are assumptions, not inferred from pressure. Both no-goal branches use identical future rates; possession itself adds no learned advantage. Consuming time can favour a lead or hurt a trailing team. No dribble path or safe recycling pass is guaranteed.':a?`${a.label}. ${a.shot.blockers} marked blockers; nearest opponent ${a.shot.pressure===null?'unknown':a.shot.pressure.toFixed(1)+' m'}; goalkeeper distance ${a.shot.keeperDistance===null?'unknown':a.shot.keeperDistance.toFixed(1)+' m'}. Shooting score excludes goalkeeper reach and player skill.`:'Choose an action above.';
    $('wpScenario').replaceChildren();
  }
  $('wpEvaluate').onclick=()=>{
    $('wpScenario').replaceChildren();
    try{
      const a=actions.find(a=>a.key===selected);if(!a)throw Error('Choose a current action first.');
      const p={success:a.kind==='keep'?num('wpRetention')/100:a.kind==='shot'?1:num('wpSuccess')/100,creation:a.kind==='keep'?0:a.kind==='shot'?1:num('wpCreation')/100,goal:a.kind==='keep'?0:num('wpGoal')/100,counter:num('wpCounter')/100,seconds:num('wpWindow')};
      if(p.seconds<a.seconds)throw Error('Action window must include the pass preparation and flight time.');
      const r=OutcomeModel.scenario(context(),a.kind,p);scenarios.set(a.key,{...r,assumptions:{...p}});draw();
      const summary=document.createElement('p');summary.textContent=`Illustrative ${a.label}: immediate goal ${pct(r.immediateGoal)}. Expected win ${pct(r.expectedOutcomes.win)}, draw ${pct(r.expectedOutcomes.draw)}, loss ${pct(r.expectedOutcomes.loss)}. Changes versus baseline: win ${pp(r.changes.win)}, draw ${pp(r.changes.draw)}, loss ${pp(r.changes.loss)} (percentage points). User assumptions: ${assumptions(a,p)}.`;
      const list=document.createElement('ul');for(const b of r.branches){const li=document.createElement('li');li.textContent=`${b.label}: ${pct(b.probability)} branch weight; win ${pct(b.win)}, draw ${pct(b.draw)}, loss ${pct(b.loss)} afterwards.`;list.append(li);}
      $('wpScenario').append(summary,list);
    }catch(e){$('wpScenario').textContent=e.message;}
  };
  for(const id of ['wpHome','wpAway','wpHomeScore','wpAwayScore','wpMinute','wpStoppage','wpTeam','wpSide','wpHomeRate','wpAwayRate'])$(id).addEventListener('input',()=>{clearScenario();draw();});
  for(const id of ['wpSuccess','wpCreation','wpGoal','wpCounter','wpWindow','wpRetention'])$(id).addEventListener('input',()=>{if(id==='wpWindow')clearScenario();else scenarios.delete(selected);draw();$('wpScenario').textContent='Assumptions changed. Calculate again to update this scenario.';});
  $('wpIntent').addEventListener('change',()=>{importVersion++;clearScenario();draw();});
  $('wpReset').onclick=()=>{importVersion++;for(const [id,value]of Object.entries({wpHome:'Home',wpAway:'Away',wpHomeScore:1,wpAwayScore:1,wpMinute:80,wpStoppage:0,wpTeam:'blue',wpSide:'home',wpHomeRate:1.5,wpAwayRate:1.2,wpIntent:'off'}))$(id).value=value;clearScenario();draw();};
  const old=render;render=function(){old();const next=JSON.stringify([state.players,state.ball,state.owner,state.cfg,state.objective,replayActive]);if(next!==signature){importVersion++;signature=next;clearScenario();draw();}};
  function packet(){
    if(replayActive)throw Error('Exit replay before saving a match scenario.');
    OutcomeModel.validate(context());
    for(const id of ['wpSuccess','wpCreation','wpGoal','wpCounter','wpWindow','wpRetention'])num(id);
    return {version:1,kind:'ripple-match-scenario',board:{schemaVersion:1,kind:'pass-detective-board',state:structuredClone(state)},fields:Object.fromEntries(fieldIds.map(id=>[id,$(id).value])),selected,interpretation:'User assumptions; not calibrated predictions. Reload recomputes results.'};
  }
  function restore(data){
    if(replayActive)throw Error('Exit replay before importing a match scenario.');
    if(data?.version!==1||data.kind!=='ripple-match-scenario'||!data.fields)throw Error('Unsupported match scenario file.');
    const next=SnapshotModel.validate(data.board,initial()),f={wpRetention:'80',wpIntent:'off',...data.fields};
    for(const id of fieldIds){
      if(typeof f[id]!=='string'||f[id].length>80)throw Error('Invalid scenario field.');
      const el=$(id);
      if(el.type==='number'){
        const n=Number(f[id]);if(!f[id].trim()||!Number.isFinite(n)||n<Number(el.min)||n>Number(el.max))throw Error('Invalid numeric assumption.');
        const probe=el.cloneNode();probe.disabled=false;probe.value=f[id];if(!probe.checkValidity())throw Error('Invalid numeric precision.');
      }else if(el.tagName==='SELECT'&&![...el.options].some(o=>o.value===f[id]))throw Error('Invalid team selection.');
    }
    OutcomeModel.validate({homeScore:+f.wpHomeScore,awayScore:+f.wpAwayScore,minute:+f.wpMinute,stoppage:+f.wpStoppage,homeRate:+f.wpHomeRate,awayRate:+f.wpAwayRate,side:f.wpSide});
    // Validate the complete input before touching live state.
    applySnapshot(next);for(const id of fieldIds)$(id).value=f[id];selected=typeof data.selected==='string'?data.selected:null;clearScenario();draw();
    $('wpStorageStatus').textContent='Scenario restored. Review assumptions and calculate to regenerate the result.';
  }
  $('wpSaveSession').onclick=()=>{try{localStorage.setItem('ripple.match.v1',JSON.stringify(packet()));$('wpStorageStatus').textContent='Match scenario saved on this device.';}catch(e){$('wpStorageStatus').textContent='Not saved: '+e.message;}};
  $('wpLoadSession').onclick=()=>{importVersion++;try{const text=localStorage.getItem('ripple.match.v1');if(!text)throw Error('No saved match scenario.');restore(JSON.parse(text));}catch(e){$('wpStorageStatus').textContent='Not loaded: '+e.message;}};
  $('wpExport').onclick=()=>{try{const data=packet(),url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='ripple-match-scenario.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);$('wpStorageStatus').textContent='Scenario export prepared; it includes the tactical board and assumptions.';}catch(e){$('wpStorageStatus').textContent='Not exported: '+e.message;}};
  $('wpImport').onchange=async e=>{const version=++importVersion,file=e.target.files[0];if(!file)return;try{if(file.size>200000)throw Error('Use a JSON file below 200 KB.');const text=await file.text();if(version!==importVersion)return;restore(JSON.parse(text));}catch(error){$('wpStorageStatus').textContent='Not imported: '+error.message;}finally{if(version===importVersion)e.target.value='';}};
  const motion=document.createElement('details');motion.innerHTML=`<summary>Optional motion lab · assumed trajectories</summary><p>Explore route shape and constant receiver velocity. This does not change pass feasibility, xG or match probabilities. Curve is a geometric arc; loft uses ideal ballistic airtime without drag. No defender interception or player acceleration is evaluated here.</p><div class="outcome-grid">${field('motionSpeed','Ground speed · m/s',16,1,35,.1)}${field('motionCurve','Sideways bend · m',0,-15,15,.1)}${field('motionHeight','Peak height · m (0 = ground)',0,0,15,.1)}${field('motionVX','Receiver horizontal velocity · m/s',0,-10,10,.1)}${field('motionVY','Receiver vertical velocity · m/s',0,-10,10,.1)}</div><button id="motionRun">Plot selected action</button><p id="motionResult" role="status"></p><div id="motionPlot"></div>`;
  matchPanel.append(motion);
  $('motionRun').onclick=()=>{try{
    const a=actions.find(a=>a.key===selected);if(!a)throw Error('Explore an action in the comparison table first.');
    if(a.kind==='keep')throw Error('Keep possession has no assumed trajectory.');
    const t=OutcomeModel.trajectory(state.ball,a.target,{speed:num('motionSpeed'),curve:num('motionCurve'),height:num('motionHeight'),vx:num('motionVX'),vy:num('motionVY')});
    $('motionResult').textContent=`Assumed route: ${t.length.toFixed(1)} m horizontally, ${t.duration.toFixed(2)} s travel, ${t.horizontalSpeed.toFixed(1)} m/s average horizontal speed. Receiver shifts ${t.receiverShift.toFixed(1)} m under constant velocity.${t.outsidePitch?' Route leaves the pitch.':''} Loft ignores the ground-speed input. Position uncertainty and interceptions are not evaluated.`;
    const path=t.points.map((p,i)=>`${i?'L':'M'}${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(' ');
    $('motionPlot').innerHTML=`<svg viewBox="-2 -2 109 72" role="img" aria-label="Illustrative route, with receiver velocity line" style="width:100%;max-width:650px;background:#174d3b;border-radius:12px"><rect x="0" y="0" width="105" height="68" fill="none" stroke="white" stroke-width=".3"/><path d="${path}" fill="none" stroke="#ddf58d" stroke-width=".7"/><line x1="${a.target.x}" y1="${a.target.y}" x2="${t.receiverAfter.x}" y2="${t.receiverAfter.y}" stroke="#ffac91" stroke-width=".8"/><circle cx="${a.target.x}" cy="${a.target.y}" r="1" fill="white"/></svg>`;
    if(num('motionHeight')>0){const elevation=t.points.map((p,i)=>`${i?'L':'M'}${i} ${16-p.z}`).join(' ');$('motionPlot').insertAdjacentHTML('beforeend',`<p>Height profile across the route (vertical scale in metres, exaggerated relative to pitch view)</p><svg viewBox="-1 0 102 18" role="img" aria-label="Ball elevation profile" style="width:100%;max-width:650px;background:#174d3b;border-radius:12px"><path d="M0 16H100" stroke="white" stroke-width=".2"/><path d="${elevation}" fill="none" stroke="#ddf58d" stroke-width=".5"/></svg>`);}
  }catch(e){$('motionResult').textContent=e.message;$('motionPlot').replaceChildren();}};
  matchPanel.addEventListener('input',()=>{importVersion++;$('motionPlot').replaceChildren();$('motionResult').textContent='Inputs changed. Plot again.';});
  draw();
})();
