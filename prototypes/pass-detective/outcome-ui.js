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
  <h3>2. Compare board actions</h3><p id="wpBoardNote"></p><p>Shot opportunity is a geometry heuristic out of 100, not xG. It uses distance, goal angle, nearby defenders and straight-line blockers. Receiving positions hold defenders stationary; they do not forecast a future frame.</p>
  <div class="scroll"><table><thead><tr><th>Action</th><th>Pass heuristic</th><th>Shot opportunity</th><th>Distance / angle</th><th>Scenario impact</th><th>Explore</th></tr></thead><tbody id="wpActions"></tbody></table></div>
  <h3>3. Explore an action’s possible outcomes</h3><p id="wpSelected">Choose an action above.</p>
  <p>Enter your own hypothetical probabilities. They are not inferred from the heuristic scores. The same inputs can produce the same impact for different actions. Change them only when your scenario assumptions differ.</p>
  <div class="outcome-grid">
  ${field('wpSuccess','Pass completes · assumed %',75,0,100)}${field('wpCreation','Shot created after completion · assumed %',30,0,100)}${field('wpGoal','Shot scores if taken · assumed %',10,0,100)}${field('wpCounter','Counter goal after failed pass / shot · assumed %',5,0,100)}${field('wpWindow','Action + counter window · seconds',15,1,120)}
  </div><button id="wpEvaluate" class="primary" disabled>Calculate illustrative impact</button><div id="wpScenario" aria-live="polite"></div>
  <p class="fine">The branches replace all goal generation during the selected action window. The Poisson baseline resumes afterwards, so an explicit goal is not counted twice. No-goal possession branches share the same future rates; rebounds and counters after a completed pass followed by a missed shot are omitted. This is a scenario comparison, not a validated tactical recommendation.</p>`;
  document.querySelector('.layout').append(matchPanel);
  let actions=[],selected=null,scenarios=new Map(),signature='';
  const num=id=>{const el=$(id);if(el.value===''||!el.checkValidity())throw Error(`Check ${el.parentElement.textContent.trim()}.`);return Number(el.value);};
  const context=()=>({homeScore:num('wpHomeScore'),awayScore:num('wpAwayScore'),minute:num('wpMinute'),stoppage:num('wpStoppage'),homeRate:num('wpHomeRate'),awayRate:num('wpAwayRate'),side:$('wpSide').value});
  const pct=n=>(100*n).toFixed(1)+'%', pp=n=>(n>=0?'+':'')+(100*n).toFixed(2)+' pp';
  function clearScenario(){scenarios.clear();$('wpScenario').replaceChildren();}
  function draw(){
    $('wpError').textContent='';$('wpDashboard').replaceChildren();$('wpActions').replaceChildren();
    try{
      const s=context(),o=OutcomeModel.outcome(s),percent=OutcomeModel.percentages(o);
      const team=$(s.side==='home'?'wpHome':'wpAway').value||s.side;
      const heading=document.createElement('h3');heading.textContent=`${team}: ${s.homeScore}–${s.awayScore} · ${s.minute} minutes`;
      const bar=document.createElement('div');bar.className='outcome-bar';bar.setAttribute('role','img');bar.setAttribute('aria-label',`Win ${percent[0]}%, draw ${percent[1]}%, loss ${percent[2]}%`);
      for(let i=0;i<3;i++){const segment=document.createElement('span');segment.style.width=percent[i]+'%';bar.append(segment);}
      const legend=document.createElement('p');legend.className='outcome-legend';legend.textContent=`Win ${percent[0].toFixed(1)}% · Draw ${percent[1].toFixed(1)}% · Loss ${percent[2].toFixed(1)}%`;
      $('wpDashboard').append(heading,bar,legend);
      const owner=state.players.find(p=>p.id===state.owner),teamId=$('wpTeam').value;
      actions=[];
      if(owner?.team===teamId&&!replayActive){
        const seen=new Set();
        for(const c of [...result.all].filter(c=>c.viable).sort((a,b)=>b.score-a.score)){
          if(seen.has(c.receiver))continue;seen.add(c.receiver);
          actions.push({key:c.key,kind:'pass',label:`Pass to ${c.receiver} · ${c.target.label} · ${c.speed} m/s · ${c.foot}`,pass:c.score,shot:OutcomeModel.shot(state,c.target,teamId),seconds:c.total});
          if(actions.length===3)break;
        }
        actions.push({key:'direct-'+owner.id,kind:'shot',label:`Direct shot · ${owner.id}`,pass:null,shot:OutcomeModel.shot(state,state.ball,teamId),seconds:0});
      }
      $('wpBoardNote').textContent=replayActive?'Exit synthetic replay to explore a separate match scenario.':!owner?'Assign a passer on the tactics board first.':owner.team!==teamId?'The analysed team must match the tactics-board passer. Change the team above or the passer.':`${actions.filter(a=>a.kind==='pass').length} feasible passing options plus a hypothetical direct shot. Rejected passes are excluded. Open Tactics board to drag players, then return here.`;
      for(const a of actions){
        const tr=document.createElement('tr'),saved=scenarios.get(a.key);
        for(const value of [a.label,a.pass===null?'—':a.pass.toFixed(0)+' / 100',a.shot.score.toFixed(0)+' / 100',`${a.shot.distance.toFixed(1)} m / ${a.shot.angleDegrees.toFixed(1)}°`,saved?pp(saved.wpa)+' · illustrative':'Not estimated']){const td=document.createElement('td');td.textContent=value;tr.append(td);}
        const td=document.createElement('td'),b=document.createElement('button');b.textContent='Explore';b.setAttribute('aria-label','Explore '+a.label);b.onclick=()=>{selected=a.key;selection();};td.append(b);tr.append(td);$('wpActions').append(tr);
      }
      selection();
    }catch(e){$('wpError').textContent=e.message;actions=[];selected=null;$('wpEvaluate').disabled=true;clearScenario();}
  }
  function selection(){
    const a=actions.find(a=>a.key===selected);
    $('wpEvaluate').disabled=!a;
    $('wpSuccess').disabled=$('wpCreation').disabled=a?.kind==='shot';
    $('wpSelected').textContent=a?`${a.label}. ${a.shot.blockers} marked blockers; nearest opponent ${a.shot.pressure===null?'unknown':a.shot.pressure.toFixed(1)+' m'}; goalkeeper distance ${a.shot.keeperDistance===null?'unknown':a.shot.keeperDistance.toFixed(1)+' m'}. Shooting score excludes goalkeeper reach and player skill.`:'Choose an action above.';
    $('wpScenario').replaceChildren();
  }
  $('wpEvaluate').onclick=()=>{
    $('wpScenario').replaceChildren();
    try{
      const a=actions.find(a=>a.key===selected);if(!a)throw Error('Choose a current action first.');
      const p={success:a.kind==='shot'?1:num('wpSuccess')/100,creation:a.kind==='shot'?1:num('wpCreation')/100,goal:num('wpGoal')/100,counter:num('wpCounter')/100,seconds:num('wpWindow')};
      if(p.seconds<a.seconds)throw Error('Action window must include the pass preparation and flight time.');
      const r=OutcomeModel.scenario(context(),a.kind,p);scenarios.set(a.key,r);draw();
      const summary=document.createElement('p');summary.textContent=`Illustrative ${a.label}: immediate goal ${pct(r.immediateGoal)}; expected win ${pct(r.expected)} versus baseline ${pct(r.baseline)}; change ${pp(r.wpa)} (percentage points). User assumptions: completion ${pct(p.success)}, shot creation ${pct(p.creation)}, shot scoring ${pct(p.goal)}, counter goal after failure ${pct(p.counter)}; window ${p.seconds}s.`;
      const list=document.createElement('ul');for(const b of r.branches){const li=document.createElement('li');li.textContent=`${b.label}: ${pct(b.probability)} branch weight; ${pct(b.win)} win probability afterwards.`;list.append(li);}
      $('wpScenario').append(summary,list);
    }catch(e){$('wpScenario').textContent=e.message;}
  };
  for(const id of ['wpHome','wpAway','wpHomeScore','wpAwayScore','wpMinute','wpStoppage','wpTeam','wpSide','wpHomeRate','wpAwayRate'])$(id).addEventListener('input',()=>{clearScenario();draw();});
  for(const id of ['wpSuccess','wpCreation','wpGoal','wpCounter','wpWindow'])$(id).addEventListener('input',()=>{scenarios.delete(selected);draw();$('wpScenario').textContent='Assumptions changed. Calculate again to update this scenario.';});
  $('wpReset').onclick=()=>{for(const [id,value]of Object.entries({wpHome:'Home',wpAway:'Away',wpHomeScore:1,wpAwayScore:1,wpMinute:80,wpStoppage:0,wpTeam:'blue',wpSide:'home',wpHomeRate:1.5,wpAwayRate:1.2}))$(id).value=value;clearScenario();draw();};
  const old=render;render=function(){old();const next=JSON.stringify([state.players,state.ball,state.owner,state.cfg,state.objective,replayActive]);if(next!==signature){signature=next;clearScenario();draw();}};
  draw();
})();
