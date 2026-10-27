/* Presentation only: the illustration never supplies prediction scores. */
(()=>{
  const main=document.querySelector('main');
  const brand=document.querySelector('.brand-icon');
  brand.textContent='';const logo=document.createElement('img');logo.src='ripple-mark.svg';logo.alt='';logo.width=44;logo.height=44;brand.append(logo);
  const hero=document.createElement('section');hero.className='atelier-hero';hero.setAttribute('aria-label','Welcome to RIPPLE');
  hero.innerHTML=`<div class="hero-copy"><div class="edition"><span></span> THE BEAUTIFUL GAME. A DIFFERENT PERSPECTIVE.</div><h1>See the space.<br><em>Shape the game.</em></h1><p>A little curiosity. A clearer picture. Explore the passing lanes, challenge a decision, and discover what could happen next.</p><div class="hero-actions"><button class="primary" id="enterStudio">Enter the tactics studio <span>↗</span></button><button id="heroScreenshot">Bring your screenshot <span>↗</span></button></div><div class="hero-note">An experimental football intelligence studio</div></div><div class="hero-art"><div class="art-heading"><span>THE ART OF THE NEXT PASS</span><span>01 / FIELD NOTES</span></div><svg viewBox="0 0 520 330" role="img" aria-label="Illustrative passing lane: switch between open space and a defender closing the route"><defs><pattern id="fieldGrid" width="42" height="42" patternUnits="userSpaceOnUse"><path d="M42 0H0V42" fill="none" stroke="#dcc49a" stroke-opacity=".07"/></pattern></defs><rect width="520" height="330" fill="url(#fieldGrid)"/><g fill="none" stroke="#b9c8b9" stroke-opacity=".25"><rect x="28" y="26" width="464" height="278" rx="2"/><path d="M260 26v278M28 94h75v142H28M492 94h-75v142h75"/><circle cx="260" cy="165" r="54"/></g><ellipse cx="367" cy="90" rx="64" ry="42" fill="#dcc49a" fill-opacity=".08" stroke="#dcc49a" stroke-opacity=".35" stroke-dasharray="4 7"/><path class="art-route" d="M145 238Q216 117 367 90" fill="none" stroke="#dcc49a" stroke-width="2" stroke-dasharray="7 8"/><circle class="art-orbit" cx="145" cy="238" r="32" fill="none" stroke="#dcc49a" stroke-opacity=".3"/><g fill="#e6d3ae" stroke="#142e29" stroke-width="4"><circle cx="145" cy="238" r="16"/><circle cx="367" cy="90" r="16"/><circle cx="416" cy="253" r="12"/><circle cx="95" cy="83" r="12"/></g><g fill="#617b70" stroke="#a3b5a9" stroke-width="1"><circle cx="320" cy="241" r="12"/><circle cx="215" cy="60" r="12"/><circle id="artDefender" cx="277" cy="205" r="13"/></g><g fill="#142e29" font-size="12" font-family="sans-serif" text-anchor="middle"><text x="145" y="242">8</text><text x="367" y="94">10</text></g><circle cx="162" cy="229" r="5" fill="white"/><text x="312" y="42" fill="#dcc49a" font-size="10" letter-spacing="2">A WINDOW OF POSSIBILITY</text></svg><div class="art-controls"><button id="toggleLane" aria-pressed="false">Close the lane <span>↗</span></button><p id="laneCaption" aria-live="polite">Space invites the pass.</p></div><span class="art-disclaimer">Interactive illustration · not a prediction</span></div>`;
  hero.id='welcome';main.prepend(hero);
  const paths=document.createElement('section');paths.className='atelier-paths';paths.setAttribute('aria-label','Explore the studio');
  paths.innerHTML=[['snapshot','01','From frame to field','Your view. Your analysis.','⌗'],['insights','02','Question the obvious','Explore the why behind a route.','↗'],['outlook','03','Change the story','Explore score-aware scenarios.','◷']].map(([view,n,title,desc,icon])=>`<button data-explore="${view}"><span class="path-top">${n}<i aria-hidden="true">${icon}</i></span><strong>${title}</strong><span>${desc}</span><b aria-hidden="true">↗</b></button>`).join('');
  hero.after(paths);
  const assurance=document.createElement('section');assurance.className='home-assurance';assurance.setAttribute('aria-label','How RIPPLE works');
  assurance.innerHTML='<div><span class="eyebrow">FROM CURIOSITY TO CLARITY</span><h2>One decision.<br>A different perspective.</h2></div><div><strong>01 / Explore locally</strong><p>Move players, compare passing lanes and read the timing evidence. No AI account needed.</p></div><div><strong>02 / Keep your work</strong><p>Name a board and return to it on this device. Download a JSON backup to move it elsewhere.</p><button id="homeSaved">Open saved boards ↗</button></div><div><strong>03 / Know the limits</strong><p>Scores rank routes under assumptions. Screenshot probabilities and match-outcome scenarios remain experimental.</p></div>';
  paths.after(assurance);
  const go=view=>document.querySelector('.workspace-rail [data-view="'+view+'"]').click();
  document.getElementById('enterStudio').onclick=()=>{go('analysis');document.getElementById('tactics').scrollIntoView({block:'start',behavior:window.matchMedia?.('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});};
  document.getElementById('heroScreenshot').onclick=()=>go('snapshot');
  paths.onclick=e=>{const b=e.target.closest('[data-explore]');if(b)go(b.dataset.explore);};
  document.getElementById('toggleLane').onclick=e=>{const button=e.currentTarget,closed=button.getAttribute('aria-pressed')!=='true';button.setAttribute('aria-pressed',String(closed));button.innerHTML=(closed?'Open the lane':'Close the lane')+' <span>↗</span>';hero.classList.toggle('lane-closed',closed);document.getElementById('laneCaption').textContent=closed?'One defender. A different decision.':'Space invites the pass.';};
  const footer=document.createElement('footer');footer.className='atelier-footer';footer.innerHTML='<a href="#welcome" class="footer-brand"><img src="ripple-mark.svg" width="32" height="32" alt=""> RIPPLE</a><span>Every decision starts a ripple.</span><small>Explore. Question. Understand.<br>Experimental analysis, with assumptions in view.</small>';main.after(footer);
  for(const link of [document.querySelector('.brand'),footer.querySelector('a')]){link.href='#welcome';link.onclick=e=>{e.preventDefault();go('home');hero.scrollIntoView({block:'start'});};}
  const openLibrary=(saving=false)=>{go('analysis');const library=document.querySelector('.playbook-library');library.open=true;library.scrollIntoView({block:'start'});document.getElementById(saving?'scenarioName':'scenarioList').focus();};
  document.getElementById('quickSave').onclick=()=>openLibrary(true);
  const saved=document.createElement('button');saved.id='openSavedBoards';saved.textContent='Open saved boards';saved.onclick=()=>openLibrary();document.getElementById('quickSave').after(saved);
  const backup=document.createElement('button');backup.id='downloadBoardBackup';backup.textContent='Download board JSON';backup.onclick=()=>document.getElementById('saveBoard').click();
  const portable=document.createElement('div');portable.className='portable-boards';portable.innerHTML='<p>Keep a file backup, or restore a JSON file downloaded with an earlier Save board.</p><label for="restoreBoardBackup">Restore downloaded board</label><input id="restoreBoardBackup" type="file" accept="application/json,.json">';
  portable.prepend(backup);document.querySelector('.playbook-content').append(portable);
  document.getElementById('restoreBoardBackup').onchange=async e=>{await document.getElementById('snapshotJSON').onchange(e);document.getElementById('libraryStatus').textContent=document.getElementById('snapshotStatus').textContent;e.target.value='';};
  document.getElementById('homeSaved').onclick=()=>openLibrary();
  const workflow=document.querySelector('.workspace-workflow'),guide=document.createElement('details'),summary=document.createElement('summary');
  summary.textContent='A quick guide to this workspace';guide.append(summary);
  while(workflow.firstChild)guide.append(workflow.firstChild);
  workflow.append(guide);
  // Keep advanced assumptions available without competing with the pitch.
  const assumptions=document.getElementById('reaction').closest('.panel');
  if(assumptions){const details=document.createElement('details');details.className='cinema-assumptions';const label=document.createElement('summary');label.textContent='Movement assumptions';details.append(label);assumptions.querySelector('h2')?.remove();while(assumptions.firstChild)details.append(assumptions.firstChild);assumptions.append(details);}
  const journey=document.createElement('ol');journey.className='snapshot-journey';journey.setAttribute('aria-label','Screenshot analysis steps');
  for(const [i,text]of ['Add a screenshot','Calibrate the pitch','Mark visible players','Explore a route'].entries()){const item=document.createElement('li');const number=document.createElement('b');number.textContent='0'+(i+1);item.append(number,document.createTextNode(text));journey.append(item);}
  snapshotPanel.querySelector('h2').after(journey);
  function updateJourney(){const step=!snapshotImage?0:calibration.length<4?1:[...mappedPoints.keys()].filter(k=>k!=='ball').length<2?2:3;[...journey.children].forEach((el,i)=>{el.classList.toggle('current',i===step);if(i===step)el.setAttribute('aria-current','step');else el.removeAttribute('aria-current');});}
  new MutationObserver(updateJourney).observe(document.getElementById('mappingInstruction'),{childList:true,characterData:true,subtree:true});
  new MutationObserver(updateJourney).observe(document.getElementById('snapshotStatus'),{childList:true,characterData:true,subtree:true});updateJourney();
  const stage=document.createElement('section');stage.className='workspace-stage';
  stage.innerHTML='<div><span class="stage-edition"></span><h2></h2><p></p></div><div class="stage-route" aria-hidden="true"><i></i><i></i><i></i><span>EVERY DECISION STARTS A RIPPLE</span></div>';
  document.querySelector('.workspace-bar').after(stage);
  const chapters={analysis:['01 / THE TACTICAL ATELIER','Make room for the next pass.','Shape the pitch. Select a route. Explore the evidence.'],snapshot:['02 / FROM FRAME TO FIELD','Start with what you can see.','Bring a screenshot, mark visible players and explore an experimental estimate.'],replay:['03 / THE REPLAY ROOM','A decision before the reveal.','Choose a passing route before uncovering the synthetic outcome.'],insights:['04 / THE EVIDENCE ROOM','Look beyond the highlighted line.','Question the recommendation and challenge its assumptions.'],outlook:['05 / POSSIBLE FUTURES','Pass. Shoot. Keep.','Explore how score, time and assumed outcomes change the picture.'],report:['06 / YOUR FIELD NOTES','A decision worth keeping.','Export your current board and take the reasoning with you.']};
  function updateStage(){const copy=chapters[document.body.dataset.view];stage.hidden=!copy;if(copy&&!stage.classList.contains('playground')){stage.querySelector('.stage-edition').textContent=copy[0];stage.querySelector('h2').textContent=copy[1];stage.querySelector('p').textContent=copy[2];}}
  new MutationObserver(updateStage).observe(document.body,{attributes:true,attributeFilter:['data-view']});updateStage();
  const nested=document.querySelector('.cinema-assumptions .settings-fold');if(nested){nested.querySelector('summary')?.remove();nested.replaceWith(...nested.childNodes);}
  const upload=document.getElementById('snapshotImage').closest('.toolbar');
  if(upload){const intake=document.createElement('section');intake.className='snapshot-intake';intake.innerHTML='<div class="intake-heading"><span aria-hidden="true">⌗</span><div><h3>Bring the match into focus.</h3><p>A frame is your starting point. You control the mapping.</p></div></div>';upload.before(intake);intake.append(upload);}
  document.querySelectorAll('.studio-grid>div').forEach((el,i)=>{el.classList.add('insight-tool');const label=document.createElement('span');label.className='tool-number';label.textContent=i===0?'01 / EXPLAIN':'02 / CHALLENGE';el.prepend(label);});
  replayPanel.querySelector('.toolbar')?.classList.add('replay-console');
  document.querySelector('#match-outlook details')?.classList.add('match-context');
  const actions=document.getElementById('wpActions')?.closest('.scroll');
  if(actions){actions.classList.add('action-workbench');const guide=document.createElement('div');guide.className='action-guide';guide.innerHTML='<div><span>↗</span><h3>Pass</h3><p>Find the next connection.</p></div><div><span>◎</span><h3>Shoot</h3><p>Explore the chance at goal.</p></div><div><span>↻</span><h3>Keep</h3><p>Consider retaining possession.</p></div>';actions.before(guide);}
  const report=document.getElementById('report-studio');
  if(report){const cover=document.createElement('div');cover.className='report-cover';cover.innerHTML='<span>RIPPLE / FIELD NOTES</span><h3>The next pass.<br>A clearer perspective.</h3><p>Your board. Your assumptions. Your analysis.</p><div aria-hidden="true">↗</div>';report.prepend(cover);}
})();

/* Interaction layer: previews never edit analytical state. */
(()=>{
  const reduced=()=>window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const jump=node=>node?.scrollIntoView?.({block:'center',behavior:reduced()?'instant':'smooth'});
  const button=(id,text,fn)=>{const b=document.createElement('button');b.id=id;b.textContent=text;b.onclick=fn;return b;};
  const controls=document.createElement('div');controls.className='route-player';
  controls.innerHTML='<div><span class="eyebrow">ROUTE PREVIEW</span><p id="routePreviewStatus" role="status">Tap a recommendation or preview its route on hover.</p></div><div class="toolbar"><button id="routePlay">Play route</button><button id="routePause" disabled>Pause</button><button id="routeStop" disabled>Reset preview</button><label>Playback speed<select id="routeSpeed"><option value="0.5">0.5×</option><option value="1" selected>1×</option><option value="2">2×</option></select></label></div>';
  $('pitch').closest('.pitch-wrap').after(controls);
  let frame=null,layer=null,elapsed=0,last=0,playing=false,previewCandidate=null;
  function clearRoute(){if(frame!==null)cancelAnimationFrame(frame);frame=null;layer?.remove();layer=null;playing=false;elapsed=0;previewCandidate=null;$('routePause').disabled=$('routeStop').disabled=true;$('routePause').textContent='Pause';$('pitch').querySelectorAll('.player').forEach(p=>p.classList.remove('route-muted','route-focus'));}
  function light(c,risk=false){
    layer?.remove();layer=el('g',{'pointer-events':'none','data-cinema-preview':'true'});
    $('routeStop').disabled=false;
    el('line',{x1:state.ball.x,y1:state.ball.y,x2:c.target.x,y2:c.target.y,stroke:'#ffe0a0','stroke-width':1.1,'stroke-dasharray':c.viable?'none':'2 1'},layer);
    $('pitch').querySelectorAll('.player').forEach(p=>{const relevant=[state.owner,c.receiver,c.critical?.defender].includes(p.dataset.id);p.classList.toggle('route-muted',!relevant);p.classList.toggle('route-focus',relevant);});
    if(risk&&c.critical){const d=byId(c.critical.defender),q=c.critical.point;el('circle',{cx:q.x,cy:q.y,r:2.5,fill:'#ffae8c40',stroke:'#ffae8c','stroke-width':.6},layer);el('line',{x1:d.x,y1:d.y,x2:q.x,y2:q.y,stroke:'#ffae8c','stroke-width':.7,'stroke-dasharray':'1 .7'},layer);}
    return el('circle',{cx:state.ball.x,cy:state.ball.y,r:.95,fill:'#fff6d7',stroke:'#8a6a32','stroke-width':.3},layer);
  }
  const hover=e=>{const card=e.target.closest('[data-route]');if(!card||playing||previewCandidate)return;const c=result.all.find(c=>c.key===card.dataset.route);if(c){light(c);$('routePreviewStatus').textContent=`Previewing ${c.receiver}. Click to select; board unchanged.`;}};
  $('cards').addEventListener('pointerover',hover);$('cards').addEventListener('focusin',hover);
  const selectedHighlight=e=>{if(e.target.closest('[data-route]')&&(e.type==='click'||e.key==='Enter'||e.key===' ')){const c=selectedRoute();if(c)light(c);}};
  $('cards').addEventListener('click',selectedHighlight);$('cards').addEventListener('keydown',selectedHighlight);
  for(const event of ['pointerleave','focusout'])$('cards').addEventListener(event,()=>{if(!previewCandidate){clearRoute();$('routePreviewStatus').textContent='Preview cleared. Tap a recommendation to select it.';}});
  $('routePlay').onclick=()=>{
    clearRoute();stopPreview();const c=selectedRoute();if(!c||!Number.isFinite(c.flight)||!c.distance){$('routePreviewStatus').textContent='Choose a reachable route first.';return;}
    previewCandidate=structuredClone(c);const ball=light(c);playing=true;last=0;$('routePause').disabled=$('routeStop').disabled=false;
    const tick=now=>{if(!playing)return;if(last)elapsed+=(now-last)*Number($('routeSpeed').value);last=now;const progress=reduced()?1:Math.min(1,elapsed/4200),t=progress*(c.prep+c.flight),flight=Math.max(0,Math.min(c.flight,t-c.prep)),f=Math.min(1,(c.speed*flight-.5*flight*flight)/c.distance);ball.setAttribute('cx',state.ball.x+(c.target.x-state.ball.x)*f);ball.setAttribute('cy',state.ball.y+(c.target.y-state.ball.y)*f);$('routePreviewStatus').textContent=`Illustrative route · ${t.toFixed(1)} model seconds. Not observed tracking.`;if(progress<1)frame=requestAnimationFrame(tick);else{playing=false;frame=null;$('routePause').disabled=true;}};
    $('routePause').onclick=()=>{playing=!playing;$('routePause').textContent=playing?'Pause':'Resume';if(playing){last=0;frame=requestAnimationFrame(tick);}else if(frame!==null){cancelAnimationFrame(frame);frame=null;}};
    frame=requestAnimationFrame(tick);
  };
  $('routeStop').onclick=()=>{clearRoute();$('routePreviewStatus').textContent='Preview reset. Board unchanged.';};
  $('animateCandidate').addEventListener('click',clearRoute);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)clearRoute();});

  // Evidence buttons point to the same selected route, not a new recommendation.
  const evidenceTools=document.createElement('div');evidenceTools.className='toolbar evidence-links';
  evidenceTools.append(button('showRouteRisk','Show interception risk on pitch',()=>{clearRoute();const c=selectedRoute();if(c){light(c,true);$('routePreviewStatus').textContent=`Highlighted ${c.critical.defender} and the weakest sampled route point.`;jump($('pitch'));}}));
  $('evidence').before(evidenceTools);
  const twins=document.createElement('div');twins.id='sensitivityViews';twins.className='sensitivity-views';$('windowResult').after(twins);
  function miniPitch(board,c,label){
    const figure=document.createElement('figure'),caption=document.createElement('figcaption');caption.textContent=label;
    const svg=document.createElementNS(NS,'svg');svg.setAttribute('viewBox','-2 -2 109 72');svg.setAttribute('role','img');svg.setAttribute('aria-label',label);
    el('rect',{width:105,height:68,fill:'#173b30',stroke:'#c4ceb4','stroke-width':.3},svg);el('path',{d:'M52.5 0V68 M0 14H16.5V54H0 M105 14H88.5V54H105',fill:'none',stroke:'#c4ceb4','stroke-width':.3},svg);
    if(c)el('line',{x1:board.ball.x,y1:board.ball.y,x2:c.target.x,y2:c.target.y,stroke:'#e5c28a','stroke-width':.8},svg);
    for(const p of board.players)el('circle',{cx:p.x,cy:p.y,r:p.id===c?.critical?.defender?2:1.4,fill:p.team==='blue'?'#65a5ff':'#f49a82',stroke:'#fff','stroke-width':p.id===c?.critical?.defender?.6:.1},svg);
    figure.append(svg,caption);return figure;
  }
  $('testWindow').addEventListener('click',()=>{
    twins.replaceChildren();const c=selectedRoute();if(!c)return;const r=MatchIntelligence.sensitivity(state,c,PassingModel);if(!r.baselineViable)return;
    const sample=r.closure||r.samples.at(-1),copy=structuredClone(state),d=copy.players.find(p=>p.id===r.defender),q=c.critical.point,length=Math.hypot(q.x-d.x,q.y-d.y);if(length){d.x+=(q.x-d.x)*sample.shift/length;d.y+=(q.y-d.y)*sample.shift/length;}
    twins.append(miniPitch(state,c,'Before · current positions'),miniPitch(copy,c,`After · defender moved ${sample.shift.toFixed(2)} m · ${sample.viable?'still viable':'rejected'} at this sample`));
  });

  // Screenshot steps navigate existing controls and never erase calibration/marks.
  const journey=document.querySelector('.snapshot-journey'),hint=document.createElement('p');hint.id='wizardHint';hint.className='wizard-hint';hint.setAttribute('role','status');journey.after(hint);
  const fold=(node,label,open=false)=>{const details=document.createElement('details'),summary=document.createElement('summary');details.className='wizard-fold';details.open=open;summary.textContent=label;node.before(details);details.append(summary,node);return details;};
  const uploadFold=fold($('pasteFrame'),'1. Add or change screenshot',true);uploadFold.append(document.querySelector('.sample-upload'),document.querySelector('.snapshot-intake'));
  const calibrationFold=fold($('frameRegion').parentElement,'2. Choose the visible pitch area',true);
  fold($('markerChecklist'),'All player labels · mark only the visible players');
  fold($('visionReview'),'Optional AI suggestions');fold($('scanKits').closest('.challenge-panel'),'Optional kit-colour assistant');
  let previousImage=null,previousCalibrated=false;
  const destinations=[()=>uploadFold,()=>$('frameRegion'),()=>$('mappingTarget'),()=>$('framePasser')];
  [...journey.children].forEach((li,i)=>{const text=li.textContent.replace(/^(\d+)/,'$1 · '),b=button('snapshotStep'+i,text,()=>{if(i===0||snapshotImage&&(i===1||calibration.length===4)){if(i===0)uploadFold.open=true;if(i===1)calibrationFold.open=true;jump(destinations[i]());if(i>0)destinations[i]().focus();}else{hint.textContent=i===1?'Upload a screenshot first.':'Finish the four calibration corners first.';}});li.replaceChildren(b);});
  function wizard(){const calibrated=!!snapshotImage&&calibration.length===4,ready=calibrated&&!$('measureFrame').disabled,step=!snapshotImage?0:!calibrated?1:ready?3:2;if(snapshotImage!==previousImage){uploadFold.open=!snapshotImage;calibrationFold.open=true;previousImage=snapshotImage;}if(calibrated!==previousCalibrated){calibrationFold.open=!calibrated;previousCalibrated=calibrated;}journey.dataset.step=String(step);[...journey.children].forEach((li,i)=>{li.classList.toggle('current',i===step);li.querySelector('button').setAttribute('aria-current',i===step?'step':'false');});hint.textContent=['Upload or paste a frame to begin.','Choose visible pitch landmarks, then mark the four corners in order.','Mark a passer, a teammate and any visible opponents. Unseen players stay unknown.','Ready to analyse. Choose two marked teammates; you can keep adding visible opponents.'][step];document.querySelector('.snapshot-intake').classList.toggle('upload-complete',!!snapshotImage);}
  new MutationObserver(wizard).observe($('mappingInstruction'),{childList:true,subtree:true,characterData:true});new MutationObserver(wizard).observe($('frameResult'),{childList:true,subtree:true,characterData:true});wizard();

  // Neutral decision numbers only: no future outcome leaks in the timeline.
  const markers=document.createElement('div');markers.id='replayMarkers';markers.className='film-timeline';markers.setAttribute('aria-label','Replay decision markers');$('decisionSeek').after(markers);
  function timeline(){markers.replaceChildren();if(!replayActive||!replayMatch)return;replayMatch.decisions.forEach((_,i)=>{const b=button('',String(i+1),()=>{$('decisionSeek').value=String(i);$('decisionSeek').dispatchEvent(new Event('input',{bubbles:true}));});b.setAttribute('aria-label',`Go to decision ${i+1}`);b.setAttribute('aria-current',i===replayIndex?'step':'false');markers.append(b);});$('decisionStory').classList.toggle('outcome-revealed',replayRevealed);}
  new MutationObserver(timeline).observe($('replayClock'),{childList:true});timeline();

  // Existing Explore handlers remain the single action-selection path.
  const actionCards=document.createElement('div');actionCards.id='cinemaActions';actionCards.className='cinema-actions';document.querySelector('.action-guide').replaceWith(actionCards);
  function actionTiles(){actionCards.replaceChildren();for(const row of $('wpActions').children){const b=button('', '',()=>{row.querySelector('button').click();actionTiles();jump($('wpSelected'));});b.className='action-tile';b.dataset.kind=row.dataset.kind;b.setAttribute('aria-pressed',String(row.classList.contains('selected-action')));const title=document.createElement('strong'),info=document.createElement('span');title.textContent=row.cells[0].textContent;info.textContent=row.dataset.kind==='pass'?`Pass heuristic ${row.cells[1].textContent} · ${row.cells[4].textContent}`:row.dataset.kind==='shot'?`Shot opportunity ${row.cells[2].textContent} · geometry only`:'Explore retaining possession under your assumptions';b.append(title,info);actionCards.append(b);}}
  new MutationObserver(actionTiles).observe($('wpActions'),{childList:true});$('wpActions').addEventListener('click',actionTiles);actionTiles();
  const tableDetails=document.createElement('details'),tableLabel=document.createElement('summary'),table=document.querySelector('.action-workbench');tableLabel.textContent='Detailed action evidence';tableDetails.className='action-details';tableDetails.append(tableLabel);table.before(tableDetails);tableDetails.append(table);
  const liveLabel=document.createElement('label');liveLabel.className='live-scenario-switch';liveLabel.innerHTML='<input id="liveScenario" type="checkbox"> Update this illustrative scenario while I edit assumptions';$('wpEvaluate').before(liveLabel);
  const recalculate=()=>{if($('liveScenario').checked&&!$('wpEvaluate').disabled)$('wpEvaluate').click();};$('liveScenario').onchange=recalculate;
  for(const id of ['wpRetention','wpSuccess','wpCreation','wpGoal','wpCounter','wpWindow'])$(id).addEventListener('input',recalculate);

  const reportPreview=document.createElement('section');reportPreview.id='liveReportPreview';reportPreview.className='live-report-preview';reportPreview.setAttribute('aria-label','Current report preview');document.querySelector('.report-cover').after(reportPreview);
  function updateReport(){reportPreview.replaceChildren();const title=document.createElement('h3');title.textContent='Your current board';const c=selectedRoute();if(c){const label=document.createElement('label'),select=document.createElement('select');label.textContent='Route to feature in your report ';select.id='reportRoute';const choices=[...result.top];if(!choices.some(r=>r.key===c.key))choices.push(c);for(const r of choices)select.add(new Option(`${r.receiver} · ${r.target.label} · ${r.speed} m/s`,r.key));select.value=c.key;select.onchange=()=>{routeKey=select.value;inspectReceiver=null;render();$('reportRoute')?.focus();};label.append(select);reportPreview.append(label);}reportPreview.append(title,miniPitch(state,c,'Read-only board preview · export includes current evidence'));const copy=document.createElement('p');copy.textContent=c?`${c.receiver} · ${c.target.label} · heuristic ${c.score.toFixed(0)}/100 · route margin ${signed(c.routeMargin)}. Experimental estimates, not completion probabilities.`:'Assign a passer to include route evidence.';reportPreview.append(copy);}
  updateReport();
  const toast=document.createElement('p');toast.id='saveToast';toast.className='save-toast';toast.setAttribute('role','status');toast.hidden=true;document.body.append(toast);let toastTimer;
  new MutationObserver(()=>{toast.textContent=$('libraryStatus').textContent;toast.hidden=!toast.textContent;clearTimeout(toastTimer);toastTimer=setTimeout(()=>{toast.hidden=true;},4000);}).observe($('libraryStatus'),{childList:true});

  const dock=document.createElement('nav');dock.className='phone-action-dock';dock.setAttribute('aria-label','Current workspace actions');document.body.append(dock);
  const dockActions={analysis:[['Play route','routePlay'],['Save board','quickSave']],snapshot:[['Upload','snapshotImage'],['Analyse route','measureFrame']],replay:[['Play / pause','autoReplay'],['Reveal outcome','revealPass']],insights:[['Explain','askAnalysis'],['Test window','testWindow']],outlook:[['Calculate impact','wpEvaluate']],report:[['Export report','downloadReport'],['Save board','quickSave']]};
  function dockUpdate(){dock.replaceChildren();for(const [label,id]of dockActions[document.body.dataset.view]||[]){const target=$(id),b=button('',label,()=>{if(!target.disabled){target.click();if(id!=='snapshotImage')jump(target);}});b.disabled=target.disabled;dock.append(b);}dock.hidden=!dock.children.length;}
  const seen=new Set();function viewChange(){clearRoute();const view=document.body.dataset.view,stage=document.querySelector('.workspace-stage');stage.classList.toggle('compact-stage',seen.has(view));seen.add(view);dockUpdate();if(view==='report')updateReport();}
  new MutationObserver(viewChange).observe(document.body,{attributes:true,attributeFilter:['data-view']});
  for(const id of ['measureFrame','autoReplay','revealPass','wpEvaluate','askAnalysis','testWindow'])new MutationObserver(dockUpdate).observe($(id),{attributes:true,attributeFilter:['disabled']});
  const oldRender=render;render=function(){clearRoute();twins.replaceChildren();oldRender();$('routePlay').disabled=!selectedRoute();$('routePreviewStatus').textContent='Select a route, then play an illustrative preview.';if(document.body.dataset.view==='report')updateReport();dockUpdate();};
  viewChange();
})();

/* Six different entrances, each with a useful interaction rather than a banner. */
(()=>{
  const stage=document.querySelector('.workspace-stage');stage.classList.add('playground');
  const sections={
    analysis:['THE PLAYMAKER','Your pitch.<br><em>Your next move.</em>','Choose a scene. Move players. Compare passes.','Scenes replace the current board', [['Open receiver','scene:open'],['Blocked lane','scene:blocked'],['Under pressure','scene:pressure']]],
    replay:['THE SCREENING ROOM','Pause the game.<br><em>Trust your instinct.</em>','Make your call before the story unfolds.','Synthetic replay · outcomes stay hidden until revealed', [['Start the match','startReplay'],['Jump to timeline','jump:decisionSeek']]],
    snapshot:['THE FRAME LAB','One frame.<br><em>A new perspective.</em>','Turn the players you can see into a question worth exploring.','Original practice illustration · not real match footage', [['Try the practice frame','loadSample'],['Bring my screenshot','snapshotImage']]],
    insights:['THE DISCOVERY ROOM','A good pass.<br><em>But why?</em>','Pull on a thread. See what changes.','Explore evidence for the selected route', [['Find the weak point','showRouteRisk'],['Move the defender','testWindow'],['Explain this pass','askAnalysis']]],
    outlook:['THE MATCH CLOCK','Same pitch.<br><em>Different stakes.</em>','Move the clock. Watch the possibilities change.','Experimental match model · assumes constant goal rates', []],
    report:['THE PRINT ROOM','Make it<br><em>worth keeping.</em>','Choose a cover mood, then take your analysis with you.','Cover moods change this preview only; exports retain the standard report', [['Forest','mood:forest'],['Ivory','mood:ivory'],['Midnight','mood:midnight'],['Open report preview','jump:liveReportPreview']]]
  };
  const art=document.createElement('div');art.className='playground-art';
  stage.replaceChildren();const copy=document.createElement('div');copy.className='playground-copy';stage.append(copy,art);
  const svg=()=>`<svg viewBox="0 0 420 260" role="img" aria-label="Illustrative football pitch"><rect x="20" y="20" width="380" height="220" rx="8" fill="#1b493a" stroke="#c8d1b3"/><g fill="none" stroke="#b9c9ad" opacity=".5"><path d="M210 20v220M20 70h65v120H20M400 70h-65v120h65"/><circle cx="210" cy="130" r="38"/></g><path class="playground-lane" d="M110 180Q170 80 310 70" fill="none" stroke="#efd29a" stroke-width="3" stroke-dasharray="6 8"/><g fill="#f1d8a4" stroke="#17382e" stroke-width="3"><circle cx="110" cy="180" r="12"/><circle cx="310" cy="70" r="12"/><circle cx="330" cy="195" r="10"/></g><g fill="#e29a83"><circle cx="220" cy="100" r="10"/><circle cx="245" cy="185" r="10"/></g><circle class="playground-ball" cx="110" cy="180" r="5" fill="white"/></svg>`;
  function action(key){if(key.startsWith('mood:')){art.dataset.mood=key.split(':')[1];return;}if(key.startsWith('jump:')){$(key.slice(5))?.scrollIntoView({block:'center',behavior:'instant'});return;}if(key.startsWith('scene:')){if(replayActive){$('playgroundStatus').textContent='Exit replay before replacing the board.';return;}document.querySelector(`[data-scene="${key.slice(6)}"]`).click();$('playgroundStatus').textContent='Scene loaded. Scroll down to move players and compare routes.';return;}const target=$(key);if(target.disabled){$('playgroundStatus').textContent='This tool is unavailable in the current state. Check the controls below.';return;}if(key==='snapshotImage'){const details=target.closest('details');if(details)details.open=true;}target.click();if(key==='loadSample')$('imageWorkspace').scrollIntoView({block:'start',behavior:'instant'});if(['testWindow','askAnalysis'].includes(key))$(key==='testWindow'?'sensitivityViews':'analysisAnswer').scrollIntoView({block:'center',behavior:'instant'});}
  function refresh(){const view=document.body.dataset.view,data=sections[view];if(!data)return;copy.replaceChildren();art.replaceChildren();art.className='playground-art art-'+view;art.dataset.mood='forest';const eyebrow=document.createElement('span');eyebrow.className='eyebrow';eyebrow.textContent=data[0];const title=document.createElement('h2');title.innerHTML=data[1];const desc=document.createElement('p');desc.textContent=data[2];copy.append(eyebrow,title,desc);const actions=document.createElement('div');actions.className='playground-actions';for(const [name,key]of data[4]){const b=document.createElement('button');b.textContent=name;b.dataset.playAction=key;b.onclick=()=>{action(key);if(key.startsWith('mood:'))actions.querySelectorAll('button').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));};actions.append(b);}copy.append(actions);const note=document.createElement('p');note.className='playground-note';note.textContent=data[3];copy.append(note);const status=document.createElement('p');status.id='playgroundStatus';status.setAttribute('role','status');copy.append(status);
    if(view==='report'){art.innerHTML='<div class="print-sheet"><span>RIPPLE / FIELD NOTES</span><strong>Every pass<br>has a story.</strong><div class="print-line"></div><p>Explore. Question. Understand.</p><b>↗</b></div>';}
    else if(view==='outlook'){art.innerHTML='<div class="clock-face"><span>THE MATCH CLOCK</span><strong id="playClockNumber"></strong><small>minutes played</small></div><label class="clock-control">Explore match time<input id="playClock" type="range" min="0" max="90" step="1"></label><div id="playClockOdds" class="clock-odds"></div>';const range=$('playClock');range.value=$('wpMinute').value;range.oninput=()=>{$('wpMinute').value=range.value;$('wpMinute').dispatchEvent(new Event('input',{bubbles:true}));syncClock();};syncClock();}
    else{art.innerHTML=svg();const label=document.createElement('div');label.className='art-ticket';label.textContent={analysis:'01 / DRAW YOUR NEXT MOVE',replay:'▶ 18 DECISIONS. YOUR CALL.',snapshot:'⌗ CAPTURE → MAP → EXPLORE',insights:'◎ FOLLOW THE EVIDENCE'}[view];art.append(label);if(view==='snapshot'){const scan=document.createElement('div');scan.className='frame-scan';art.append(scan);}if(view==='replay'){const strip=document.createElement('div');strip.className='screening-strip';strip.innerHTML='<span>01</span><span>02</span><span>03</span><span>?</span>';art.prepend(strip);}if(view==='analysis'){const b=document.createElement('button');b.className='art-toy';b.textContent='Switch the illustrated lane ↗';b.setAttribute('aria-pressed','false');b.onclick=()=>{const on=art.classList.toggle('alternate-lane');b.setAttribute('aria-pressed',String(on));};art.append(b);}}
  }
  function syncClock(){if(!$('playClock'))return;$('playClock').disabled=replayActive;$('playClockNumber').textContent=$('wpMinute').value+'′';$('playClock').value=$('wpMinute').value;const legend=$('wpDashboard').querySelector('.outcome-legend');$('playClockOdds').textContent=legend?.textContent||$('wpError').textContent||'Set valid match assumptions below.';}
  new MutationObserver(syncClock).observe($('wpDashboard'),{childList:true});
  new MutationObserver(refresh).observe(document.body,{attributes:true,attributeFilter:['data-view']});refresh();
})();

/* Keep instructions available without competing with the working tools. */
(()=>{
  const text=(selector,copy)=>{const node=document.querySelector(selector);if(node)node.textContent=copy;};
  text('.hero-copy>p','Move players. Explore passing lanes. See what changes.');
  text('.home-assurance>div:nth-child(2) p','Move players and compare routes. No AI account needed.');
  text('.home-assurance>div:nth-child(3) p','Save on this device, or download a JSON backup.');
  text('.home-assurance>div:nth-child(4) p','Experimental estimates. Scores are not success probabilities.');
  text('#pasteFrame>p','Paste with Ctrl+V / ⌘V, or upload a screenshot. On phone, upload a saved image.');
  text('.sample-upload p','Try mapping an example pitch. No upload needed.');
  text('.intake-heading p','Upload → calibrate → mark → analyse.');
  text('#snapshot-import>p.fine','Mark the players you can see. Two teammates are enough; unseen players stay unknown.');
  text('#imageWorkspace>p.notice','Experimental geometry only. One frame cannot establish movement or pass safety.');
  text('.studio-tools>p.notice','Experimental estimates. Scores are not completion probabilities.');
  text('#match-replay>p:not([class])','Choose a pass, then reveal the synthetic outcome.');
  text('#match-outlook>p:not([id]):not([class])','Explore win, draw and loss using your assumptions. Not calibrated predictions.');
  text('#report-studio>p:not([id]):not([class])','Export your board and evidence. Print the HTML report to save a PDF.');
  document.querySelectorAll('.section-help>summary').forEach(node=>{if(node.textContent==='How to use this section')node.textContent='Quick help';});
  // Fold static prose only. Dynamic results, status/error messages and controls stay put.
  const candidates=[...document.querySelectorAll('.layout p')].filter(p=>!p.id&&!p.closest('details')&&!p.matches('.notice,.status,[role],[aria-live]')&&!p.querySelector('button,input,select,a')&&p.textContent.length>180&&!p.closest('#evidence,#cards,#wpScenario,#wpComparisons,#analysisAnswer,#windowResult,#frameResult,#missingPlayerResult,#replayEvidence,#replayRecap,#liveReportPreview,.model-result,#visionReview'));
  for(const p of candidates){const fold=document.createElement('details'),summary=document.createElement('summary');fold.className='copy-details';summary.textContent=p.closest('#match-outlook')?'Assumptions & limits':p.closest('#snapshot-import')?'Mapping guidance':p.closest('#match-replay')?'About this replay':'How this works';p.before(fold);fold.append(summary,p);}
  const extra=document.querySelector('.studio-extra');if(extra){const details=document.createElement('details'),summary=document.createElement('summary');details.className='copy-details';summary.textContent='Turning points & contributions';extra.before(details);details.append(summary,extra);}
})();
