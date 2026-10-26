// Classic script: shares the existing board's lexical state; works directly from file://.
let pinnedPass = null;
const comparePanel = document.createElement('div');
comparePanel.className = 'panel wide';
comparePanel.innerHTML = `<h2>Challenge this candidate pass</h2>
<p class="fine">Pin the inspected route, then move a defender or adjust the assumptions.
Compare the same receiver, fixed target location, launch speed and passing foot.
Moving the receiver does not move the pinned target. These are estimates, not observed outcomes.</p>
<div class="toolbar"><button id="pinPass" class="primary">Pin inspected candidate</button>
<button id="clearPin" disabled>Clear comparison</button><button id="exportComparison" disabled>Download evidence JSON</button></div>
<div id="comparisonResult" aria-live="polite"><p class="fine">No candidate pinned yet.</p></div>`;
$('evidence').parentElement.after(comparePanel);

function comparisonResult() {
  if (!pinnedPass) return null;
  if (!state.owner || state.owner !== pinnedPass.state.owner) return null;
  return PassingModel.evaluate(state, pinnedPass.candidate);
}
function safeNumber(value) { return Number.isFinite(value) ? value.toFixed(2) : 'unreachable'; }
function changeText(before, after) {
  if (!Number.isFinite(before) || !Number.isFinite(after)) return '—';
  const delta = after - before;
  return `${delta >= 0 ? '+' : ''}${delta.toFixed(2)}`;
}
function renderComparison() {
  $('pinPass').disabled = !selectedRoute();
  $('clearPin').disabled = !pinnedPass;
  $('exportComparison').disabled = !pinnedPass;
  const container = $('comparisonResult');
  if (!pinnedPass) { container.innerHTML = '<p class="fine">No candidate pinned yet.</p>'; return; }
  const current = comparisonResult();
  if (!current) {
    container.textContent = 'Comparison paused: restore the original passer and possession, or pin a new candidate.';
    $('exportComparison').disabled = true;
    return;
  }
  const prior = pinnedPass.result;
  const originalReceiver = pinnedPass.state.players.find(p => p.id === prior.receiver);
  const rows = [
    ['Heuristic score / 100', 'score'],
    ['Interception margin · s', 'routeMargin'],
    ['Receiver-control margin · s', 'controlMargin'],
    ['Before-release margin · s', 'releaseMargin'],
    ['Preparation · s', 'prep'],
    ['Ball travel · s', 'flight'],
    ['Receiver arrival · s', 'receiverArrival']
  ];
  container.innerHTML = `<p><b>${originalReceiver.team} #${originalReceiver.number}</b> · ${prior.foot} foot · ${prior.speed} m/s · fixed target (${prior.target.x.toFixed(1)}, ${prior.target.y.toFixed(1)}) m</p>
  <div class="scroll"><table><thead><tr><th>Evidence</th><th>Pinned</th><th>Current</th><th>Change</th></tr></thead><tbody>
  ${rows.map(([label,key]) => `<tr><td>${label}</td><td>${safeNumber(prior[key])}</td><td>${safeNumber(current[key])}</td><td>${changeText(prior[key],current[key])}</td></tr>`).join('')}
  </tbody></table></div>
  <p><b>${prior.viable ? 'Viable estimate' : 'Rejected'} → ${current.viable ? 'Viable estimate' : 'Rejected'}</b></p>
  <p class="fine">Pinned: ${prior.issues.join('; ') || 'No rejection conditions.'}<br>Current: ${current.issues.join('; ') || 'No rejection conditions.'}</p>
  <p class="fine">${state.objective !== pinnedPass.state.objective ? 'Objective changed: scores use different ranking weights. Compare timing margins directly.' : 'Both scores use the same objective.'} Multiple board changes may affect the result; this comparison does not isolate a cause.</p>`;
}
$('pinPass').onclick = () => {
  const route = selectedRoute();
  if (!route) return;
  pinnedPass = {
    state: structuredClone(state),
    candidate: structuredClone({key:route.key,receiver:route.receiver,target:route.target,speed:route.speed,foot:route.foot}),
    result: structuredClone(route)
  };
  renderComparison();
};
$('clearPin').onclick = () => { pinnedPass = null; renderComparison(); };
$('exportComparison').onclick = () => {
  const current = comparisonResult();
  if (!current) return;
  const payload = {schemaVersion:1,kind:'candidate-pass-comparison',synthetic:true,
    interpretation:'Heuristic estimates only. Fixed candidate target; no observed outcome or calibrated success probability.',
    nonFiniteValues:'Unreachable/non-finite numbers are represented as null.',
    pinned:pinnedPass,current:{state:structuredClone(state),result:current}};
  const url = URL.createObjectURL(new Blob([JSON.stringify(payload, (_,v) => typeof v === 'number' && !Number.isFinite(v) ? null : v, 2)],{type:'application/json'}));
  const a=document.createElement('a');a.href=url;a.download='pass-detective-comparison.json';a.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
};
const renderBoard = render;
render = function() { renderBoard(); renderComparison(); };
renderComparison();

// On-demand search and isolated SVG preview; only Apply changes the board.
const flipPanel=document.createElement('div');flipPanel.className='share-board';
flipPanel.innerHTML=`<h3>What changes the recommendation?</h3><p>Test the three opponents closest to the leading route, moving one at a time toward that segment in 1 m steps, up to 6 m. This is a sampled sensitivity check, not movement prediction or a guaranteed minimum.</p><div class="toolbar"><button id="findDecisionFlip">Find a decision flip</button><button id="previewDecisionFlip" disabled>Preview movement</button><button id="applyDecisionFlip" disabled>Apply movement</button><button id="undoDecisionFlip" disabled>Undo movement</button></div><p id="decisionFlipResult" role="status">Start with a tactics-board scenario, then run the check.</p><div id="decisionFlipPreview" hidden></div>`;
comparePanel.append(flipPanel);
let flipResult=null,flipApplied=null,flipSignature='';
const flipBoardSignature=()=>JSON.stringify([state.players,state.ball,state.owner,state.cfg,state.objective,replayActive]);
function clearFlipPreview(){ $('decisionFlipPreview').replaceChildren();$('decisionFlipPreview').hidden=true; }
function flipControls(){
  const ready=!!flipResult&&!replayActive;
  $('previewDecisionFlip').disabled=!ready;$('applyDecisionFlip').disabled=!ready||$('decisionFlipPreview').hidden;
  $('undoDecisionFlip').disabled=!flipApplied||replayActive;
}
const flipBest=s=>PassingModel.candidates(s).map(c=>PassingModel.evaluate(s,c)).filter(c=>c.viable).sort((a,b)=>b.score-a.score)[0];
$('findDecisionFlip').onclick=()=>{
  flipResult=null;clearFlipPreview();
  try{
    if(replayActive)throw Error('Exit replay before testing a decision.');
    const r=MatchIntelligence.decisionFlip(state,PassingModel);
    if(r.defender)flipResult=r;
    flipSignature=flipBoardSignature();
    $('decisionFlipResult').textContent=r.defender?`Moving ${r.defender} ${r.moved.toFixed(1)} m toward the original route changes the leading receiver from ${r.baseline} to ${r.next||'none: no viable pass'}. Preview the hypothetical change before applying it. First change found in this limited search; heuristic ranking only.`:`No receiver change found in ${r.tested} tested positions. ${r.baseline} stays first within this limited search. Other directions, players or smaller movements could change it.`;
  }catch(e){$('decisionFlipResult').textContent=e.message;}
  flipControls();
};
$('previewDecisionFlip').onclick=()=>{
  if(!flipResult||replayActive||flipSignature!==flipBoardSignature())return;
  const r=flipResult,copy=structuredClone(state),defender=copy.players.find(p=>p.id===r.defender);
  Object.assign(defender,r.to);
  const before=flipBest(state),after=flipBest(copy),box=$('decisionFlipPreview');box.replaceChildren();box.hidden=false;
  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
  svg.setAttribute('viewBox','-2 -2 109 72');svg.setAttribute('role','img');svg.setAttribute('aria-label',`Hypothetical movement of ${r.defender}. Dashed gold: original route. Solid mint: new route. White arrow: defender movement.`);
  svg.style.cssText='display:block;width:100%;max-width:800px;background:#155144;border-radius:12px;margin:16px 0';box.append(svg);
  const add=(tag,attrs,text)=>{const e=document.createElementNS(svg.namespaceURI,tag);for(const [k,v] of Object.entries(attrs))e.setAttribute(k,v);if(text)e.textContent=text;svg.append(e);return e;};
  add('rect',{x:0,y:0,width:105,height:68,fill:'none',stroke:'#b8d6c7','stroke-width':.3});
  add('path',{d:'M52.5 0V68 M0 14H16.5V54H0 M105 14H88.5V54H105',fill:'none',stroke:'#b8d6c7','stroke-width':.3});
  for(const [route,color,dash] of [[before,'#f4d68a','2 1'],[after,'#b9fa70','none']])if(route){
    add('line',{x1:state.ball.x,y1:state.ball.y,x2:route.target.x,y2:route.target.y,stroke:color,'stroke-width':.8,'stroke-dasharray':dash});
    add('circle',{cx:route.target.x,cy:route.target.y,r:2.3,fill:'none',stroke:color,'stroke-width':.5});
  }
  for(const p of state.players){add('circle',{cx:p.x,cy:p.y,r:1.5,fill:p.team==='blue'?'#398bff':'#f07867',stroke:'#fff','stroke-width':.15});add('text',{x:p.x,y:p.y+.6,fill:'#fff','font-size':1.7,'text-anchor':'middle'},String(p.number));}
  add('circle',{cx:state.ball.x,cy:state.ball.y,r:.6,fill:'#fff'});
  add('circle',{cx:r.to.x,cy:r.to.y,r:2,fill:'none',stroke:'#fff','stroke-width':.6,'stroke-dasharray':'.6 .4'});
  add('line',{x1:r.from.x,y1:r.from.y,x2:r.to.x,y2:r.to.y,stroke:'#fff','stroke-width':.6});
  const angle=Math.atan2(r.to.y-r.from.y,r.to.x-r.from.x),ax=r.to.x-1.2*Math.cos(angle),ay=r.to.y-1.2*Math.sin(angle);
  add('path',{d:`M${ax-.7*Math.sin(angle)} ${ay+.7*Math.cos(angle)} L${r.to.x} ${r.to.y} L${ax+.7*Math.sin(angle)} ${ay-.7*Math.cos(angle)}`,fill:'none',stroke:'#fff','stroke-width':.6});
  const legend=document.createElement('p');legend.className='fine';legend.textContent=`Preview only · board unchanged. Dashed gold: original pass to ${r.baseline}. Solid mint: ${r.next?'new pass to '+r.next:'no viable new pass'}. White arrow and hollow marker: hypothetical defender move. Route lines show targets, not observed ball flight.`;box.append(legend);flipControls();
};
$('applyDecisionFlip').onclick=()=>{
  if(!flipResult||replayActive||flipSignature!==flipBoardSignature()||$('decisionFlipPreview').hidden)return;
  const r=flipResult;
  // Flush any preceding edit so this movement has its own undo boundary.
  document.dispatchEvent(new Event('change'));
  Object.assign(byId(r.defender),r.to);routeKey=null;inspectReceiver=null;render();
  document.dispatchEvent(new Event('change'));
  flipApplied=flipBoardSignature();flipControls();
  $('decisionFlipResult').textContent=`Applied hypothetical movement of ${r.defender}. Recommendations now use the changed board. Undo movement restores the preceding board.`;
};
$('undoDecisionFlip').onclick=()=>{
  if(!flipApplied||replayActive||flipApplied!==flipBoardSignature())return;
  $('undoBoard').click();flipApplied=null;flipControls();
  $('decisionFlipResult').textContent='Movement undone. Run the check again to preview another decision flip.';
};
const renderBeforeFlip=render;
render=function(){renderBeforeFlip();const next=flipBoardSignature();if(next!==flipSignature){flipSignature=next;flipResult=null;flipApplied=null;clearFlipPreview();$('decisionFlipResult').textContent='Board changed. Run the sensitivity check again.';}flipControls();};
