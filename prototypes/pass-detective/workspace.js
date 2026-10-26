/* Workspace routing, local draft history, and portable analysis reports. */
(()=>{
  const main=document.querySelector('main'),layout=document.querySelector('.layout');
  document.body.classList.add('workspace-app');
  document.querySelector('header').innerHTML='<a class="brand" href="#tactics" aria-label="RIPPLE home"><span class="brand-icon">≋</span> RIPPLE<span class="brand-tag">FOOTBALL INTELLIGENCE</span></a><div class="header-right"><span class="live-dot"></span><span>Local analysis</span></div>';
  const rail=document.createElement('nav');rail.className='workspace-rail';rail.setAttribute('aria-label','Workspace');
  rail.innerHTML='<div class="rail-caption">WORKSPACE</div>'+[
    ['analysis','01','Tactics board'],['replay','02','Match replay'],['snapshot','03','Screenshot lab'],['insights','04','Pass insights'],['report','05','Reports & model'],['outlook','06','Match outlook']
  ].map(([id,n,name])=>`<button data-view="${id}"><span>${n}</span>${name}<b>↗</b></button>`).join('')+
    '<div class="rail-bottom"><div class="rail-ball">◎</div><strong>Every pass has a story.</strong><p>Explore the space.<br>Understand the decision.</p><span>PASS DETECTIVE / V2</span></div>';
  document.body.insertBefore(rail,main);
  const mobileNav=document.createElement('div');mobileNav.className='mobile-workspace';
  mobileNav.innerHTML='<label for="workspaceSelect">Workspace</label><select id="workspaceSelect" aria-label="Choose workspace">'+[...rail.querySelectorAll('button')].map(b=>`<option value="${b.dataset.view}">${b.childNodes[1].textContent}</option>`).join('')+'</select>';
  rail.after(mobileNav);

  const bar=document.createElement('div');bar.className='workspace-bar';
  bar.innerHTML='<div><div class="eyebrow" id="viewEyebrow">THE NEXT MOVE</div><h1 id="viewTitle">Tactics board</h1><p id="viewDescription">Shape the play. Compare the options.</p></div><div class="workspace-actions"><label for="appLanguage">Language</label><select id="appLanguage"><option value="en">English</option><option value="ms">Bahasa Melayu</option></select><button id="undoBoard" title="Undo board edit">↶ Undo</button><button id="redoBoard" title="Redo board edit">↷ Redo</button><button id="quickSave">Save board</button></div>';
  main.prepend(bar);
  const draft=document.createElement('div');draft.className='draft-bar';
  draft.innerHTML='<span id="draftStatus" role="status">Autosave ready · stored on this device</span><button id="clearDraft">Clear saved draft</button>';
  bar.after(draft);
  const intro=$('getting-started');
  intro.className='workspace-intro';
  intro.innerHTML='<div><span class="eyebrow">FIRST TIME HERE?</span><strong>One pass. Three ways to understand it.</strong><p>Try a scene → select a receiver → inspect the evidence.</p></div><button id="guidedStart" class="primary">Try guided example ↗</button>';
  const starters=document.createElement('div');starters.className='workspace-starters';
  starters.innerHTML='<button data-start-view="snapshot"><strong>Analyse a screenshot</strong><span>Map visible players and compare a passing route.</span></button><button data-start-view="outlook"><strong>Explore match outcomes</strong><span>Compare pass, shoot and keep-possession scenarios.</span></button>';
  intro.append(starters);
  const workflow=document.createElement('section');workflow.className='workspace-workflow';workflow.setAttribute('aria-label','Workspace guide');
  workflow.innerHTML='<div><span class="eyebrow">YOUR NEXT STEPS</span><p id="workflowSteps"></p><span id="workflowLimit" class="fine"></span></div><button id="workflowNext"></button>';
  draft.after(workflow);
  const journeys={
    analysis:['1. Choose a scene → 2. Select a passing card → 3. Read the explanation','Board edits save on this device. Scores are heuristic rankings, not success percentages.','insights','Explain this pass →'],
    snapshot:['1. Upload or paste → 2. Calibrate pitch lines → 3. Mark visible players → 4. Analyse a route','Two teammates are enough to start. Unseen players remain unknown; results are experimental.','analysis','Open tactics board →'],
    outlook:['1. Set score and time → 2. Explore an action → 3. Enter assumptions → 4. Calculate and compare','Win, draw and loss estimates use your assumptions. They are not validated predictions.','report','Open reports →'],
    replay:['1. Load a synthetic match → 2. Choose a pass → 3. Reveal the outcome','Replay locks board editing. Exit replay before changing player positions.','insights','Explore pass insights →'],
    insights:['1. Select a route → 2. Explain it → 3. Test a what-if change','Explanations describe model evidence; hypothetical routes are not observed outcomes.','report','Export your analysis →'],
    report:['1. Review the evidence → 2. Download the report → 3. Share the file','The analysis report covers your tactical board. Match outlook has its own scenario JSON export.','analysis','Back to tactics →']
  };
  const boardSection=$('tactics').parentElement,aside=$('pass-options').parentElement;
  const roster=$('roster').closest('.panel'),model=[...layout.children].find(p=>p.textContent.includes('How the model ranks passes'));
  const report=document.createElement('section');report.className='panel wide report-studio';report.id='report-studio';
  report.innerHTML='<div class="eyebrow">TAKE THE ANALYSIS WITH YOU</div><h2>A decision worth sharing.</h2><p>Download a self-contained report with the current pitch, selected pass, timing evidence and assumptions. Open the HTML file in a browser and choose Print to save a PDF.</p><div class="toolbar"><button id="downloadReport" class="primary">Download analysis report ↗</button><button id="downloadPitch">Download pitch SVG</button></div><p id="reportStatus" role="status"></p><div class="model-result"><span class="pill">RESEARCH ONLY</span><h3>CatBoost completion-context model</h3><p>44,847 held-out passes · 64 matches · 2022 World Cup</p><div class="research-metrics"><div><strong>0.7286</strong><span>ROC AUC</span></div><div><strong>0.2263</strong><span>Log loss</span></div><div><strong>0.93%</strong><span>Improvement vs logistic</span></div></div><p>The minimum improvement gate was 2%. This model did not pass and cannot compare alternative receivers. The board uses timing calculations and heuristic rankings, not completion probabilities.</p><p>Next research requires intended-target spatial data, a fresh holdout, calibration and evaluation against the app’s inputs.</p></div>';
  layout.append(report);
  const views={
    outlook:['MATCH SCENARIOS','Match outlook','Explore the result under explicit assumptions.',[matchPanel]],
    analysis:['THE NEXT MOVE','Tactics board','Shape the play. Compare the options.',[boardSection,aside,$('route-evidence'),$('compare-pass')]],
    replay:['READ THE GAME','Match replay','Choose your pass before the synthetic outcome is revealed.',[replayPanel,boardSection,aside]],
    snapshot:['FROM FRAME TO FIELD','Screenshot lab','Analyse the players visible in your screenshot.',[snapshotPanel]],
    insights:['BEHIND THE DECISION','Pass insights','Understand the selected route and challenge its assumptions.',[studioPanel,boardSection,aside,$('route-evidence'),$('compare-pass')]],
    report:['EVIDENCE, NOT GUESSWORK','Reports & model','Keep your analysis. Know the model’s limits.',[report,roster,model]]
  };
  let currentView='analysis';
  function showView(name,focus=false){
    if(!views[name])name='analysis';
    if(name!=='replay'&&replayTimer)stopReplay();
    currentView=name;$('workspaceSelect').value=name;const journey=journeys[name];$('workflowSteps').textContent=journey[0];$('workflowLimit').textContent=journey[1];$('workflowNext').textContent=journey[3];const [eyebrow,title,description,panels]=views[name];
    for(const panel of layout.children)panel.hidden=!panels.includes(panel);
    replayPanel.style.order='-1';
    studioPanel.style.order='-1';
    layout.classList.toggle('single-workspace',!['analysis','replay','insights'].includes(name));
    intro.hidden=name!=='analysis';
    $('viewEyebrow').textContent=eyebrow;$('viewTitle').textContent=title;$('viewDescription').textContent=description;
    rail.querySelectorAll('button').forEach(b=>{b.classList.toggle('active',b.dataset.view===name);b.setAttribute('aria-current',b.dataset.view===name?'page':'false');});
    document.body.dataset.view=name;
    if(focus){$('viewTitle').tabIndex=-1;$('viewTitle').focus();}
    window.RippleLocale?.refresh();
  }
  $('workspaceSelect').onchange=()=>showView($('workspaceSelect').value,true);
  $('workflowNext').onclick=()=>showView(journeys[currentView][2],true);
  starters.onclick=e=>{const b=e.target.closest('[data-start-view]');if(b)showView(b.dataset.startView,true);};
  const destinations={'tactics':'analysis','player-settings':'analysis','pass-options':'analysis','movement-settings':'analysis','route-evidence':'insights','explanations':'insights','compare-pass':'insights','match-replay':'replay','snapshot-import':'snapshot','report-studio':'report'};
  rail.addEventListener('click',e=>{const b=e.target.closest('[data-view]');if(b)showView(b.dataset.view,true);});
  document.addEventListener('click',e=>{
    const a=e.target.closest('a[href^="#"]');if(!a)return;
    const dest=destinations[a.hash.slice(1)];if(dest)showView(dest);
  });
  window.addEventListener('hashchange',()=>{const dest=destinations[location.hash.slice(1)];if(dest)showView(dest);});
  const contextActions=document.createElement('div');contextActions.className='toolbar context-actions';
  contextActions.innerHTML='<button id="openInsights" class="primary">Explain selected pass ↗</button><button id="openReport">Export report ↗</button>';
  $('pass-options').append(contextActions);
  $('openInsights').onclick=()=>showView('insights',true);$('openReport').onclick=()=>showView('report',true);
  $('guidedStart').onclick=()=>{
    if(replayActive)$('exitReplay').click();
    document.querySelector('[data-scene="open"]').click();showView('analysis');
    $('tactics').focus();$('tactics').scrollIntoView({block:'start'});
  };
  $('quickSave').onclick=()=>$('saveBoard').click();
  const originalApply=$('applyImage').onclick;
  $('applyImage').onclick=()=>{
    const previous=state;originalApply();
    if(state!==previous){showView('analysis',true);$('player-settings').querySelector('details.settings-fold').open=true;}
  };
  $('appLanguage').onchange=()=>{$('studioLanguage').value=$('appLanguage').value;$('studioLanguage').dispatchEvent(new Event('change'));};
  $('studioLanguage').addEventListener('change',()=>{$('appLanguage').value=language();});
  document.querySelector('.footnote').textContent='Experimental passing analysis · Positions and movement settings are assumptions. Match outlook probabilities use explicit experimental assumptions.';
  // Fold secondary editing controls without removing their keyboard-accessible inputs.
  for(const [id,label] of [['player-settings','Player settings'],['movement-settings','Movement assumptions']]){
    const panel=$(id),details=document.createElement('details'),summary=document.createElement('summary');
    summary.textContent=label;details.className='settings-fold';
    while(panel.firstChild)details.append(panel.firstChild);
    details.prepend(summary);panel.append(details);
  }
  $('pitch').addEventListener('keydown',e=>{
    if(!replayActive&&(e.key==='Enter'||e.key===' ')&&e.target.closest('[data-id]')){
      $('player-settings').querySelector('.settings-fold').open=true;$('player').focus();
    }
  });
  // Drafts are versioned, validated on restore and never overwritten by replay.
  const storageKey='ripple.board.v1';
  let history=[structuredClone(state)],cursor=0,restoring=false,pending=null;
  const signature=s=>JSON.stringify({players:s.players,ball:s.ball,owner:s.owner,cfg:s.cfg,objective:s.objective});
  const payload=s=>({schemaVersion:1,kind:'pass-detective-board',state:structuredClone(s)});
  function controls(){
    $('undoBoard').disabled=replayActive||cursor===0;
    $('redoBoard').disabled=replayActive||cursor>=history.length-1;
  }
  function save(){
    try{localStorage.setItem(storageKey,JSON.stringify(payload(state)));$('draftStatus').textContent='Saved on this device · '+new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});}
    catch{$('draftStatus').textContent='Autosave unavailable. Use Save board to keep your work.';}
  }
  function flush(){
    clearTimeout(pending);pending=null;
    if(restoring||replayActive)return;
    if(signature(state)!==signature(history[cursor])){
      history=history.slice(0,cursor+1);history.push(structuredClone(state));
      if(history.length>60)history.shift();cursor=history.length-1;save();
    }
    controls();
  }
  function restore(s){
    restoring=true;
    try{const pinned=pinnedPass;applySnapshot(structuredClone(s));pinnedPass=pinned;render();save();}
    finally{restoring=false;controls();}
  }
  try{
    const raw=localStorage.getItem(storageKey);
    if(raw){const saved=SnapshotModel.validate(JSON.parse(raw),initial());restoring=true;applySnapshot(saved);restoring=false;history=[structuredClone(state)];$('draftStatus').textContent='Your saved board was restored.';}
  }catch{$('draftStatus').textContent='Saved draft could not be restored. Start a new board or load JSON.';}
  const previousRender=render;
  render=function(){
    previousRender();controls();
    if(!restoring&&!replayActive){clearTimeout(pending);pending=setTimeout(flush,300);}
  };
  $('undoBoard').onclick=()=>{if(replayActive)return;flush();if(cursor>0)restore(history[--cursor]);};
  $('redoBoard').onclick=()=>{if(replayActive)return;flush();if(cursor<history.length-1)restore(history[++cursor]);};
  $('clearDraft').onclick=()=>{
    flush();
    try{localStorage.removeItem(storageKey);$('draftStatus').textContent='Saved draft cleared. Your current board stays open; the next edit will save again.';}
    catch{$('draftStatus').textContent='Cannot access local storage. Download your board instead.';}
  };
  // Commit a completed gesture immediately; debounce keyboard slider adjustments.
  document.addEventListener('pointerup',flush);
  document.addEventListener('change',flush);
  $('startReplay').addEventListener('click',flush,true);
  $('startReplay').addEventListener('click',controls);
  $('exitReplay').addEventListener('click',controls);
  window.addEventListener('pagehide',flush);
  document.addEventListener('keydown',e=>{
    if(!(e.ctrlKey||e.metaKey)||e.altKey||/INPUT|TEXTAREA|SELECT/.test(e.target.tagName))return;
    if(e.key.toLowerCase()==='z'){e.preventDefault();(e.shiftKey?$('redoBoard'):$('undoBoard')).click();}
  });
  const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function pitchSVG(){
    const svg=$('pitch').cloneNode(true);svg.querySelector('#estimated-motion')?.remove();
    svg.setAttribute('xmlns',NS);svg.setAttribute('width','1130');svg.setAttribute('height','780');
    svg.style.background='#123f36';
    return new XMLSerializer().serializeToString(svg);
  }
  function download(content,type,name){
    const url=URL.createObjectURL(new Blob([content],{type})),a=document.createElement('a');
    a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1500);
  }
  function reportHTML(){
    const c=selectedRoute(),ms=language()==='ms',t=(en,my)=>ms?my:en;
    const rows=c?[
      [t('Receiver','Penerima'),c.receiver],[t('Target','Sasaran'),`${c.target.x.toFixed(1)}, ${c.target.y.toFixed(1)} m`],
      [t('Heuristic score (not probability)','Skor heuristik (bukan kebarangkalian)'),`${c.score.toFixed(0)} / 100`],
      [t('Passing foot / launch speed','Kaki hantaran / kelajuan awal'),`${c.foot} / ${c.speed} m/s`],
      [t('Route margin','Margin laluan'),signed(c.routeMargin)],[t('Control margin','Margin kawalan'),signed(c.controlMargin)],
      [t('Release margin','Margin pelepasan'),signed(c.releaseMargin)],
      [t('Assessment','Penilaian'),c.issues.join('; ')||t('Viable under current assumptions','Berdaya maju mengikut andaian semasa')]
    ]:[];
    const facts=c?MatchIntelligence.facts(state,c,PassingModel):[];
    return `<!doctype html><html lang="${ms?'ms':'en'}"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>RIPPLE · ${t('Analysis report','Laporan analisis')}</title><style>body{font:16px system-ui;color:#172e2a;max-width:1000px;margin:40px auto;padding:24px}svg{width:100%;height:auto;border-radius:12px}td,th{padding:12px;text-align:left;border-bottom:1px solid #ddd}table{width:100%}p{line-height:1.6}small{color:#54645c}@media print{body{margin:0;padding:0;font-size:11pt}svg{max-height:420px}tr{break-inside:avoid}}</style><h1>RIPPLE / ${t('Passing analysis','Analisis hantaran')}</h1><p>${escape(new Date().toISOString())} · ${t(replayActive?'Synthetic replay snapshot':'User-edited board',replayActive?'Petikan ulangan sintetik':'Papan suntingan pengguna')}</p>${pitchSVG()}<h2>${t('Selected pass','Hantaran dipilih')}</h2>${c?`<table>${rows.map(([a,b])=>`<tr><th>${escape(a)}</th><td>${escape(ms?(window.RippleLocale?.translate(String(b))||b):b)}</td></tr>`).join('')}</table>`:`<p>${t('Assign a passer to analyse a route.','Tetapkan penghantar untuk menganalisis laluan.')}</p>`}<h2>${t('Evidence','Bukti')}</h2>${facts.map(f=>`<p>${escape(ms?f.ms:f.en)}</p>`).join('')}<h2>${t('Assumptions & limits','Andaian dan batasan')}</h2><p>${t('Stationary starting velocities; straight ground passes. Scores are heuristic rankings, not probabilities. Alternative outcomes have not been observed.','Halaju permulaan sifar; hantaran leret lurus. Skor ialah kedudukan heuristik, bukan kebarangkalian. Hasil alternatif belum diperhatikan.')}</p><p>${t('Reaction','Reaksi')}: ${state.cfg.reaction}s · ${t('Acceleration','Pecutan')}: ${state.cfg.acceleration}m/s² · ${t('Maximum speed','Kelajuan maksimum')}: ${state.cfg.maxSpeed}m/s · Offside: ${state.cfg.offside}</p><small>${t('Print this file from your browser to save a PDF.','Cetak fail ini melalui pelayar untuk menyimpan PDF.')}</small></html>`;
  }
  $('downloadReport').onclick=()=>{download(reportHTML(),'text/html;charset=utf-8','ripple-analysis.html');$('reportStatus').textContent='Report downloaded. Open it in a browser to read or print to PDF.';};
  $('downloadPitch').onclick=()=>{download(pitchSVG(),'image/svg+xml','ripple-pitch.svg');$('reportStatus').textContent='Pitch SVG downloaded.';};
  // Small explicit surface for verification and other UI modules.
  window.RippleWorkspace={showView,flush,reportHTML,pitchSVG,get view(){return currentView;}};
  controls();showView(destinations[location.hash.slice(1)]||'analysis');
})();

// Presentation runs on a frozen copy, never on the editable board.
(()=>{
 const start=document.createElement('button');start.id='startDemo';start.textContent='Start guided demo →';start.className='primary';document.querySelector('.workspace-actions').append(start);
 const dialog=document.createElement('dialog');dialog.id='guidedDemo';dialog.className='guided-demo';dialog.setAttribute('aria-labelledby','demoTitle');
 dialog.innerHTML='<div class="toolbar"><span class="eyebrow">GUIDED DEMO · EXPERIMENTAL</span><button id="demoExit">Exit demo</button></div><p id="demoContext" class="fine"></p><p id="demoProgress" role="status"></p><h2 id="demoTitle" tabindex="-1"></h2><p id="demoCopy"></p><div id="demoPitch"></div><div id="demoEvidence"></div><div class="toolbar demo-navigation"><button id="demoBack">← Back</button><button id="demoRestart">Restart</button><button id="demoNext" class="primary">Next →</button></div>';
 document.body.append(dialog);
 let board=null,changed=null,flip=null,step=0,context=null,returnFocus=null;
 const best=s=>PassingModel.candidates(s).map(c=>PassingModel.evaluate(s,c)).filter(c=>c.viable).sort((a,b)=>b.score-a.score)[0];
 const name=id=>id?MatchIntelligence.name(id):'No viable receiver';
 function pitch(s,route){
  const box=$('demoPitch');box.replaceChildren();const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','-2 -2 109 72');svg.setAttribute('role','img');svg.setAttribute('aria-label','Demo pitch: '+(route?'leading route to '+name(route.receiver):'no viable route'));box.append(svg);
  const add=(tag,attrs,text)=>{const e=document.createElementNS(svg.namespaceURI,tag);for(const [k,v]of Object.entries(attrs))e.setAttribute(k,v);if(text)e.textContent=text;svg.append(e);};
  add('rect',{x:0,y:0,width:105,height:68,fill:'#155144',stroke:'#cbd8cf','stroke-width':.3});add('path',{d:'M52.5 0V68 M0 14H16.5V54H0 M105 14H88.5V54H105',fill:'none',stroke:'#cbd8cf','stroke-width':.3});
  if(route)add('line',{x1:s.ball.x,y1:s.ball.y,x2:route.target.x,y2:route.target.y,stroke:'#d9fa83','stroke-width':.8});
  for(const p of s.players){add('circle',{cx:p.x,cy:p.y,r:1.6,fill:p.team==='blue'?'#398bff':'#f07867',stroke:p.id===s.owner?'#d9fa83':'white','stroke-width':.3});add('text',{x:p.x,y:p.y+.6,'text-anchor':'middle',fill:'white','font-size':1.7},String(p.number));}
  add('circle',{cx:s.ball.x,cy:s.ball.y,r:.6,fill:'white'});
  if(step>=2&&flip){add('circle',{cx:flip.from.x,cy:flip.from.y,r:2.3,fill:'none',stroke:'white','stroke-dasharray':'.7 .5','stroke-width':.4});add('line',{x1:flip.from.x,y1:flip.from.y,x2:flip.to.x,y2:flip.to.y,stroke:'white','stroke-width':.6});}
 }
 function show(){
  const original=best(board),next=best(changed),active=step>=2?changed:board,route=step>=2?next:original;
  $('demoProgress').textContent=`Step ${step+1} of 5`;
  $('demoContext').textContent=`Snapshot of your board · ${context.homeScore}–${context.awayScore}, ${context.minute} minutes · analysed side: ${context.side} · objective: ${board.objective==='safe'?'Keep possession':'Progress the attack'}. Demo never edits your board.`;
  $('demoTitle').textContent=['Read the situation','Understand the leading pass','Test a defender movement','See what changed','Explore match impact'][step];
  const copies=[`${name(board.owner)} has possession. The highlighted route leads under the current objective and movement assumptions.`,original?`${name(original.receiver)} leads with a heuristic score of ${original.score.toFixed(0)}/100. This is a ranking, not a completion percentage.`:'No viable pass is available under these assumptions. The demo will not invent a recommendation.',flip?`Hypothetical change: move ${name(flip.defender)} ${flip.moved.toFixed(1)} m toward the original route. The hollow marker shows the original position; the white line shows displacement.`:'No receiver change was found in the bounded search. No defender is moved; other movements could produce a different result.',flip?`${name(original?.receiver)} → ${name(next?.receiver)}. Only one defender position changed. Re-evaluating interception and control timing changes the heuristic ranking; this does not prove an actual pass would fail.`:'The leading receiver stays unchanged within this limited search. That is a valid result, not proof that the route is robust to every movement.','Compare hypothetical actions over the same window. These probabilities come from explicit assumptions, not the passing scores. They do not select a validated best action.'];
  $('demoCopy').textContent=copies[step];pitch(active,route);$('demoEvidence').replaceChildren();
  if(step===1&&original){const p=document.createElement('p');p.textContent=`Interception margin ${original.routeMargin.toFixed(2)} s · Control margin ${original.controlMargin.toFixed(2)} s · Preparation + flight ${original.total.toFixed(2)} s. Positive margins mean estimated time to spare; all movement inputs are assumptions.`;$('demoEvidence').append(p);}
  if(step===4){
   const remaining=(90+context.stoppage-context.minute)*60,seconds=Math.max(15,Math.ceil(route?.total||0));
   if(remaining<seconds){$('demoEvidence').textContent='Not enough match time remains for this action window. Change the match context outside the demo to explore another scenario.';}
   else {const p=document.createElement('p');p.textContent=`Example assumptions: pass completes 75%; shot created after completion 30%; shot scores 10%; possession retained 80%; opponent goal after failure 5%; window ${seconds}s. Future goal rates: home ${context.homeRate}, away ${context.awayRate} per 90. These are demo assumptions.`;$('demoEvidence').append(p);
    const owner=active.players.find(p=>p.id===active.owner);
    if(!owner||owner.team!==$('wpTeam').value){const note=document.createElement('p');note.textContent='Match outlook analysed team must match the passer before comparing actions.';$('demoEvidence').append(note);}
    else for(const kind of ['pass','shot','keep']){if(kind==='pass'&&!route)continue;const r=OutcomeModel.scenario(context,kind,{success:kind==='keep'?.8:.75,creation:.3,goal:.1,counter:.05,seconds});const values=OutcomeModel.percentages(r.expectedOutcomes),row=document.createElement('p');row.textContent=`${kind==='pass'?'Pass to '+name(route.receiver):kind==='shot'?'Direct shot':'Keep possession'}: Win ${values[0]}% · Draw ${values[1]}% · Loss ${values[2]}%. Win change ${(r.wpa*100).toFixed(2)} percentage points.`;$('demoEvidence').append(row);}
   }
  }
  $('demoBack').disabled=step===0;$('demoNext').disabled=step===4;$('demoTitle').focus();dialog.scrollTop=0;
 }
 start.onclick=()=>{
  if(replayActive){start.textContent='Exit replay before starting demo';return;}
  try{
   for(const id of ['wpHomeScore','wpAwayScore','wpMinute','wpStoppage','wpHomeRate','wpAwayRate'])if(!$(id).value||!$(id).checkValidity())throw Error('Invalid match context');
   context={homeScore:Number($('wpHomeScore').value),awayScore:Number($('wpAwayScore').value),minute:Number($('wpMinute').value),stoppage:Number($('wpStoppage').value),homeRate:Number($('wpHomeRate').value),awayRate:Number($('wpAwayRate').value),side:$('wpSide').value};OutcomeModel.validate(context);
   board=structuredClone(state);changed=structuredClone(board);flip=null;
   try{const found=MatchIntelligence.decisionFlip(board,PassingModel);if(found.defender){flip=found;Object.assign(changed.players.find(p=>p.id===flip.defender),flip.to);}}catch{/* No viable baseline: explicitly shown by the demo. */}
   step=0;returnFocus=document.activeElement;start.textContent='Start guided demo →';if(dialog.showModal)dialog.showModal();else dialog.setAttribute('open','');show();
  }catch(e){start.textContent='Review match score/time inputs before demo';}
 };
 const exit=()=>{if(dialog.close)dialog.close();else dialog.removeAttribute('open');returnFocus?.focus();};
 $('demoExit').onclick=exit;dialog.addEventListener('cancel',e=>{e.preventDefault();exit();});
 $('demoNext').onclick=()=>{if(step<4){step++;show();}};$('demoBack').onclick=()=>{if(step>0){step--;show();}};$('demoRestart').onclick=()=>{step=0;show();};
})();
