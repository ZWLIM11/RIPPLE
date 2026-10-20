const replayPanel=document.createElement('section');
replayPanel.className='panel wide replay-studio';
replayPanel.innerHTML=`<div class="eyebrow">Synthetic match studio</div><h2>Before the pass</h2>
<p>Inspect the decision-time board, choose a candidate pass, then reveal the observed synthetic outcome.
Alternative recommendations remain estimates; a successful outcome does not prove the original choice was best.</p>
<div class="toolbar"><label>Match variation <select id="matchSeed"><option value="17">Attacking moves</option><option value="91">Goal sequence</option><option value="73">Possession changes</option></select></label><button id="startReplay" class="primary">Load synthetic match</button><button id="autoReplay" disabled>Play sequence</button>
<button id="previousDecision" disabled>← Previous</button><button id="nextDecision" disabled>Next →</button><button id="exitReplay" disabled>Edit board / exit replay</button>
<span id="replayClock" class="pill">Ready</span></div>
<div id="replayWorkspace" hidden>
<label for="decisionSeek">Decision timeline</label><input id="decisionSeek" type="range" min="0" value="0" step="1">
<div class="toolbar"><label>Player Focus <select id="replayFocus"><option value="all">Whole match</option></select></label>
<label>Explanation <select id="replayAudience"><option value="fan">Fan</option><option value="analyst">Analyst</option></select></label>
<button id="pickCandidate">Choose inspected candidate</button><button id="revealPass" class="primary">Reveal observed outcome</button>
<button id="exportReplay">Export observed events</button></div>
<div class="notice" id="decisionStory" aria-live="polite"></div>
<p id="chosenPass" class="fine"></p><p id="replayStats"></p>
<div class="split"><div><h3>Observed event evidence</h3><div class="scroll" id="replayEvidence"></div></div>
<div><h3>Your match recap</h3><p id="replayRecap"></p><p class="fine">Verified event recap. Use the prediction studio for optional Foundry explanations.</p></div></div>
</div><p class="fine">18 synthetic passing decisions. Board positions are locked during replay; use Edit board to explore alternatives.
Estimated route animation is available in the prediction studio. Synthetic outcomes do not validate recommendation accuracy.</p>`;
document.querySelector('.layout').prepend(replayPanel);
initial().players.forEach(p=>$('replayFocus').add(new Option(`${p.team} #${p.number} · ${p.role}`,p.id)));
let replayMatch=null,replayIndex=0,replayRevealed=false,replayActive=false,replayTimer=null,replayChoice=null;
const replayTime=t=>`${String(Math.floor(t/60)).padStart(2,'0')}:${String(t%60).padStart(2,'0')}`;
const replayName=id=>{const p=initial().players.find(p=>p.id===id);return `${p.team} #${p.number}`;};
const lockedIds=['free','reset','place','makeOwner','px','py','facing','preferred','weak','reaction','acceleration','maxSpeed','offside','snapshotImage','snapshotJSON','applyImage','objective'];
function lockReplay(active){
  lockedIds.forEach(id=>$(id).disabled=active || id==='applyImage'&&mappedPoints.size!==23);
  document.querySelectorAll('[data-scene],[data-step]').forEach(b=>b.disabled=active);
  $('pitch').style.pointerEvents=active?'none':'';
  $('pitch').inert=active;
}
function stopReplay(){clearInterval(replayTimer);replayTimer=null;$('autoReplay').textContent='Play sequence';}
function loadDecision(index){
  imageLoadVersion++;
  replayIndex=index;replayRevealed=false;replayChoice=null;
  applySnapshot(structuredClone(replayMatch.decisions[index].before));
  replayActive=true;lockReplay(true);renderReplay();
}
function renderReplay(){
  if(!replayMatch)return;
  const event=replayMatch.decisions[replayIndex],seen=ReplayModel.observed(replayMatch,replayIndex,replayRevealed);
  const focus=$('replayFocus').value,stats=ReplayModel.stats(seen,focus),analyst=$('replayAudience').value==='analyst';
  $('decisionSeek').value=replayIndex;$('decisionSeek').max=replayMatch.decisions.length-1;
  $('replayClock').textContent=`${replayTime(replayRevealed?event.endTime:event.time)} · ${replayIndex+1}/${replayMatch.decisions.length}`;
  $('previousDecision').disabled=!replayActive||replayIndex===0;
  $('nextDecision').disabled=!replayActive||replayIndex===replayMatch.decisions.length-1;
  $('pickCandidate').disabled=!replayActive||replayRevealed;
  $('revealPass').disabled=!replayActive||replayRevealed;
  const recommendation=result.top.find(c=>c.viable);
  let story;
  if(!replayRevealed){
    story=`${replayName(event.passer)} is on the ball. Inspect a route and choose your candidate before revealing the action. `;
    story+=recommendation?(analyst?`Top viable receiver ${replayName(recommendation.receiver)}: interception margin ${signed(recommendation.routeMargin)}, preparation ${fmt(recommendation.prep)} s.`
      :`The model finds an open route to ${replayName(recommendation.receiver)} under the current assumptions.`)
      :'No candidate is currently viable under the movement assumptions.';
  }else{
    const assessment=PassingModel.evaluate(event.before,event.candidate);
    story=`Observed: ${replayName(event.passer)} attempted a ${event.candidate.foot}-foot pass to ${replayName(event.candidate.receiver)}. Outcome: ${event.outcome}.`;
    if(event.shot)story+=` The receiver then took a shot${event.shot.goal?' and scored':''}.`;
    if(analyst)story+=` At the decision moment, this candidate had interception margin ${signed(assessment.routeMargin)} and ${assessment.viable?'was viable':'was rejected'} under the heuristic. Evidence: ${event.id}.`;
    else story+=` The pre-pass model ${assessment.viable?'considered this route viable':'flagged risks for this route'}. Estimated risk and observed outcome are different.`;
  }
  $('decisionStory').textContent=story;
  $('chosenPass').textContent=replayChoice?`Your candidate: ${replayName(replayChoice.receiver)}, ${replayChoice.foot} foot, ${replayChoice.speed} m/s, target (${replayChoice.target.x.toFixed(1)}, ${replayChoice.target.y.toFixed(1)}) m.${replayRevealed?' No alternative outcome has been simulated.':''}`:'No candidate chosen yet. You may also reveal without choosing.';
  $('replayStats').textContent=`${focus==='all'?'Whole match':replayName(focus)} · ${stats.completed}/${stats.attempts} completed passes · ${stats.shots} shots · ${stats.goals} goals`;
  const focused=seen.filter(e=>focus==='all'||e.passer===focus||e.candidate.receiver===focus);
  $('replayEvidence').replaceChildren();
  for(const e of focused.slice(-8).reverse()){
    const p=document.createElement('p');p.className='fine';
    p.textContent=`${replayTime(e.time)} · ${e.id}: ${replayName(e.passer)} → ${replayName(e.candidate.receiver)} · ${e.outcome}`;
    $('replayEvidence').append(p);
  }
  if(!focused.length)$('replayEvidence').textContent='No observed events for this view yet.';
  $('replayRecap').textContent=stats.attempts||stats.shots?
    `${focus==='all'?'Both teams':replayName(focus)} recorded ${stats.completed} completed passes from ${stats.attempts} attempts, ${stats.interceptions} intercepted passes, and ${stats.shots} shots (${stats.goals} goals) in the observed sequence. ${focused.length?`Latest supporting event: ${focused.at(-1).id}.`:''}`
    :'Reveal a decision to begin the recap. Future outcomes are excluded.';
}
$('startReplay').onclick=()=>{
  stopReplay();$('startReplay').disabled=true;$('startReplay').textContent='Preparing match…';
  try{
    replayMatch=ReplayModel.generate(initial(),PassingModel,Number($('matchSeed').value));
    $('replayWorkspace').hidden=false;$('autoReplay').disabled=false;$('exitReplay').disabled=false;
    $('decisionSeek').disabled=false;loadDecision(0);
  }finally{$('startReplay').disabled=false;$('startReplay').textContent='Restart synthetic match';}
};
$('revealPass').onclick=()=>{replayRevealed=true;renderReplay();};
$('pickCandidate').onclick=()=>{const c=selectedRoute();if(c){replayChoice=structuredClone(c);renderReplay();}};
$('nextDecision').onclick=()=>{stopReplay();if(replayIndex<replayMatch.decisions.length-1)loadDecision(replayIndex+1);};
$('previousDecision').onclick=()=>{stopReplay();if(replayIndex>0)loadDecision(replayIndex-1);};
$('decisionSeek').oninput=e=>{stopReplay();loadDecision(Number(e.target.value));};
$('replayFocus').onchange=renderReplay;$('replayAudience').onchange=renderReplay;
$('autoReplay').onclick=()=>{
  if(replayTimer){stopReplay();return;}
  if(replayIndex===replayMatch.decisions.length-1&&replayRevealed)loadDecision(0);
  $('autoReplay').textContent='Pause';
  replayTimer=setInterval(()=>{
    if(!replayRevealed){replayRevealed=true;renderReplay();}
    else if(replayIndex<replayMatch.decisions.length-1)loadDecision(replayIndex+1);
    else stopReplay();
  },2200);
};
$('exitReplay').onclick=()=>{
  stopReplay();replayActive=false;lockReplay(false);
  $('autoReplay').disabled=true;$('exitReplay').disabled=true;$('decisionSeek').disabled=true;
  $('previousDecision').disabled=true;$('nextDecision').disabled=true;
  // Hide the historical narrative while the user edits a different decision state.
  $('replayWorkspace').hidden=true;$('replayClock').textContent='Board editing · replay stopped';
  $('status').textContent='Explore this decision board. Restart synthetic match to return to replay.';
};
$('exportReplay').onclick=()=>{
  const payload={schemaVersion:1,synthetic:true,seed:replayMatch.seed,assumptions:replayMatch.assumptions,
    events:ReplayModel.observed(replayMatch,replayIndex,replayRevealed)};
  const url=URL.createObjectURL(new Blob([JSON.stringify(payload,null,2)],{type:'application/json'})),a=document.createElement('a');
  a.href=url;a.download='pass-detective-observed-events.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
};
