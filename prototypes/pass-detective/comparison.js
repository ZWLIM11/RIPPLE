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

// On-demand, bounded search; never runs while dragging or changes the live board.
const flipPanel=document.createElement('div');flipPanel.className='share-board';
flipPanel.innerHTML='<h3>What changes the recommendation?</h3><p>Test the three opponents closest to the leading route, moving one at a time toward that segment in 1 m steps, up to 6 m. This is a sampled sensitivity check, not movement prediction or a guaranteed minimum.</p><button id="findDecisionFlip">Find a decision flip</button><p id="decisionFlipResult" role="status">Start with a tactics-board scenario, then run the check.</p>';
comparePanel.append(flipPanel);
$('findDecisionFlip').onclick=()=>{
  try{
    if(replayActive)throw Error('Exit replay before testing a decision.');
    const r=MatchIntelligence.decisionFlip(state,PassingModel);
    $('decisionFlipResult').textContent=r.defender?`Moving ${r.defender} ${r.moved.toFixed(1)} m toward the original route, from (${r.from.x.toFixed(1)}, ${r.from.y.toFixed(1)}) to (${r.to.x.toFixed(1)}, ${r.to.y.toFixed(1)}), changes the leading receiver from ${r.baseline} to ${r.next||'none: no viable pass'}. First change found in this search; all other settings stay fixed. Heuristic ranking only.`:`No receiver change found in ${r.tested} tested positions. ${r.baseline} stays first within this limited search. Other directions, players or smaller movements could change it.`;
  }catch(e){$('decisionFlipResult').textContent=e.message;}
};
let flipSignature='';const renderBeforeFlip=render;
render=function(){renderBeforeFlip();const next=JSON.stringify([state.players,state.ball,state.owner,state.cfg,state.objective,replayActive]);if(next!==flipSignature){flipSignature=next;$('decisionFlipResult').textContent='Board changed. Run the sensitivity check again.';}};
