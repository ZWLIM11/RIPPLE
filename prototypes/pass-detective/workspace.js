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
  const bar=document.createElement('div');bar.className='workspace-bar';
  bar.innerHTML='<div><div class="eyebrow" id="viewEyebrow">THE NEXT MOVE</div><h1 id="viewTitle">Tactics board</h1><p id="viewDescription">Shape the play. Compare the options.</p></div><div class="workspace-actions"><label for="appLanguage">Language</label><select id="appLanguage"><option value="en">English</option><option value="ms">Bahasa Melayu</option></select><button id="undoBoard" title="Undo board edit">↶ Undo</button><button id="redoBoard" title="Redo board edit">↷ Redo</button><button id="quickSave">Save board</button></div>';
  main.prepend(bar);
  const draft=document.createElement('div');draft.className='draft-bar';
  draft.innerHTML='<span id="draftStatus" role="status">Autosave ready · stored on this device</span><button id="clearDraft">Clear saved draft</button>';
  bar.after(draft);
  const intro=$('getting-started');
  intro.className='workspace-intro';
  intro.innerHTML='<div><span class="eyebrow">FIRST TIME HERE?</span><strong>One pass. Three ways to understand it.</strong><p>Try a scene → select a receiver → inspect the evidence.</p></div><button id="guidedStart" class="primary">Try guided example ↗</button>';
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
    currentView=name;const [eyebrow,title,description,panels]=views[name];
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
