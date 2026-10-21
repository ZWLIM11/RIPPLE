/* Device-local scenarios, portable board links and decision practice. */
(()=>{
  const pack=s=>({schemaVersion:1,kind:'pass-detective-board',state:s});
  const validate=s=>SnapshotModel.validate(pack(s),initial());
  const message=(id,text)=>{$(id).textContent=text;};
  const libraryKey='ripple.library.v1';
  let entries=[],pendingShared=null,challenge=false,journal=[],focusReturn=null;
  function readLibrary(){
    const raw=localStorage.getItem(libraryKey);if(!raw)return [];
    if(raw.length>300000)throw Error('Library is too large.');
    const data=JSON.parse(raw);
    if(data.version!==1||!Array.isArray(data.entries)||data.entries.length>20)throw Error('Invalid library.');
    return data.entries.map(e=>{
      if(typeof e.id!=='string'||typeof e.name!=='string'||!e.name.trim()||e.name.length>60)throw Error('Invalid scenario.');
      return {id:e.id,name:e.name,state:validate(e.state)};
    });
  }
  const library=document.createElement('details');library.className='playbook-library';
  library.innerHTML='<summary><span>My playbook</span><span class="fine">Save · revisit · share</span></summary><div class="playbook-content"><p>Keep up to 20 named scenarios on this device. Save the current board, or pick a saved scenario to load it. Download JSON for a backup.</p><label for="scenarioName">Scenario name</label><div class="playbook-row"><input id="scenarioName" maxlength="60" placeholder="e.g. Breaking the high press"><button id="saveScenario" class="primary">Save new scenario</button></div><label for="scenarioList">Saved scenarios</label><div class="playbook-row"><select id="scenarioList" aria-label="Saved scenarios"></select><button id="loadScenario">Load</button><button id="renameScenario">Rename</button><button id="deleteScenario">Remove</button></div><p id="libraryStatus" role="status" class="fine"></p></div>';
  $('tactics').before(library);
  function list(){
    const selected=$('scenarioList').value;$('scenarioList').replaceChildren();
    if(!entries.length)$('scenarioList').add(new Option('No saved scenarios yet',''));
    for(const e of entries)$('scenarioList').add(new Option(e.name,e.id));
    if(entries.some(e=>e.id===selected))$('scenarioList').value=selected;
    for(const id of ['loadScenario','renameScenario','deleteScenario'])$(id).disabled=!entries.length||replayActive;
    $('saveScenario').disabled=replayActive;
  }
  function store(next){
    try{localStorage.setItem(libraryKey,JSON.stringify({version:1,entries:next}));entries=next;list();return true;}
    catch{message('libraryStatus','Storage unavailable or full. Download board JSON to keep your work.');return false;}
  }
  function name(){const n=$('scenarioName').value.trim();if(!n)throw Error('Enter a scenario name first.');return n;}
  $('saveScenario').onclick=()=>{
    if(replayActive)return;
    try{
      if(entries.length>=20)throw Error('Your playbook is full. Remove a scenario or download a backup.');
      const e={id:Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,8),name:name(),state:validate(state)};
      if(store([...entries,e])){$('scenarioList').value=e.id;message('libraryStatus','Scenario saved on this device.');}
    }catch(e){message('libraryStatus',e.message);}
  };
  $('loadScenario').onclick=()=>{
    if(replayActive)return;const e=entries.find(e=>e.id===$('scenarioList').value);if(!e)return;
    RippleWorkspace.flush();applySnapshot(validate(e.state));RippleWorkspace.flush();$('scenarioName').value=e.name;
    message('libraryStatus','Scenario loaded. Undo restores your previous board.');
  };
  $('renameScenario').onclick=()=>{
    if(replayActive)return;
    try{const n=name();if(store(entries.map(e=>e.id===$('scenarioList').value?{...e,name:n}:e)))message('libraryStatus','Scenario renamed.');}
    catch(e){message('libraryStatus',e.message);}
  };
  let removed=null;
  const undoRemove=document.createElement('button');undoRemove.id='undoRemoveScenario';undoRemove.textContent='Undo remove';undoRemove.hidden=true;$('libraryStatus').after(undoRemove);
  $('deleteScenario').onclick=()=>{
    if(replayActive)return;const e=entries.find(e=>e.id===$('scenarioList').value);if(!e)return;
    if(store(entries.filter(x=>x!==e))){removed=e;undoRemove.hidden=false;message('libraryStatus','Scenario removed. You can undo this removal until the page is closed.');}
  };
  undoRemove.onclick=()=>{if(removed&&entries.length<20&&store([...entries,removed])){removed=null;undoRemove.hidden=true;message('libraryStatus','Scenario restored.');}};
  try{entries=readLibrary();}catch{message('libraryStatus','Saved library could not be read. Existing storage is unchanged; download any open board before saving.');}list();

  // Compact numeric tuples omit identity metadata, images and notes. Validation is shared with JSON imports.
  function encode(s){
    s=validate(s);const p={v:1,p:s.players.map(p=>[p.id,p.x,p.y,p.facing,p.preferred,p.weak]),b:s.ball,o:s.owner,s:s.selected,c:s.cfg,g:s.objective};
    return btoa(JSON.stringify(p)).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');
  }
  function decode(code){
    if(code.length>12000||!code||!/^[A-Za-z0-9_-]+$/.test(code))throw Error('Invalid board link.');
    const p=JSON.parse(atob(code.replaceAll('-','+').replaceAll('_','/')));
    if(p.v!==1||!Array.isArray(p.p)||p.p.length!==22)throw Error('Unsupported board link.');
    const base=initial();return validate({players:p.p.map(a=>{
      if(!Array.isArray(a)||a.length!==6)throw Error('Invalid player.');
      return {...base.players.find(p=>p.id===a[0]),id:a[0],x:a[1],y:a[2],facing:a[3],preferred:a[4],weak:a[5]};
    }),ball:p.b,owner:p.o,selected:p.s,cfg:p.c,objective:p.g});
  }
  const share=document.createElement('section');share.className='share-board';
  share.innerHTML='<div class="eyebrow">PASS IT ON</div><h3>Share the situation.</h3><p>Create a link to this board’s positions and movement settings. Anyone with the link can read them. Images, saved scenarios and challenge notes are excluded.</p><div class="toolbar"><button id="createBoardLink" class="primary">Create board link</button><button id="copyBoardLink" disabled>Copy link</button></div><label for="boardLink">Board link</label><input id="boardLink" readonly placeholder="Create a link to the current board"><p id="shareStatus" class="fine" role="status"></p>';
  $('report-studio').prepend(share);
  $('createBoardLink').onclick=()=>{
    try{$('boardLink').value=location.origin+location.pathname+'#board='+encode(state);$('copyBoardLink').disabled=false;message('shareStatus','Link ready. It captures this board now; later edits do not change the link.');}
    catch{message('shareStatus','This board cannot be shared. Check its positions and passer.');}
  };
  $('copyBoardLink').onclick=async()=>{
    try{await navigator.clipboard.writeText($('boardLink').value);message('shareStatus','Link copied.');}
    catch{$('boardLink').focus();$('boardLink').select();message('shareStatus','Select and copy the link above. Clipboard access is unavailable.');}
  };
  const incoming=document.createElement('section');incoming.className='incoming-board';incoming.hidden=true;
  incoming.innerHTML='<div><strong>Someone shared a board with you</strong><p id="sharedSummary"></p></div><div class="toolbar"><button id="loadSharedBoard" class="primary">Load shared board</button><button id="dismissSharedBoard">Dismiss</button></div>';
  document.querySelector('.workspace-bar').after(incoming);
  function receive(){
    if(!location.hash.startsWith('#board='))return;
    incoming.hidden=false;pendingShared=null;
    try{pendingShared=decode(location.hash.slice(7));message('sharedSummary','22 players · '+(pendingShared.owner||'no passer')+' · Review this board by loading it. Your named scenarios stay saved. Undo returns to your current board.');$('loadSharedBoard').disabled=false;}
    catch{message('sharedSummary','This link is invalid or unsupported. Your current board has not changed.');$('loadSharedBoard').disabled=true;}
  }
  $('dismissSharedBoard').onclick=()=>{incoming.hidden=true;pendingShared=null;history.replaceState(null,'',location.pathname+location.search);};
  $('loadSharedBoard').onclick=()=>{
    if(!pendingShared)return;if(replayActive)$('exitReplay').click();RippleWorkspace.flush();
    applySnapshot(validate(pendingShared));RippleWorkspace.flush();RippleWorkspace.showView('analysis');$('dismissSharedBoard').click();
  };
  window.addEventListener('hashchange',receive);receive();

  // A CSS fullscreen workspace also works on browsers without the Fullscreen API.
  const board=$('tactics'),focusbar=document.createElement('div');focusbar.className='pitch-focus-bar';
  focusbar.innerHTML='<button id="focusPitch">Expand pitch ↗</button><label for="pitchZoom">Pitch zoom</label><select id="pitchZoom"><option value="1">100%</option><option value="1.5">150%</option><option value="2">200%</option></select><span class="fine">Drag a player. Scroll the grass to pan.</span>';
  board.querySelector('.pitch-wrap').before(focusbar);
  const focusEdit=document.createElement('div');focusEdit.className='focus-edit';focusEdit.hidden=true;
  focusEdit.innerHTML='<span id="focusSelection"></span><button id="focusMakeOwner">Make selected player the passer</button><button id="closePitch">Done / close pitch</button>';
  focusbar.after(focusEdit);
  let background=[];
  function toggleFocus(open){
    if(open){
      focusReturn=document.activeElement;background=[];
      for(let node=board;node.parentElement&&node!==document.body;node=node.parentElement)
        for(const sibling of node.parentElement.children)if(sibling!==node){background.push([sibling,sibling.inert]);sibling.inert=true;}
    }
    board.classList.toggle('pitch-focus',open);document.body.classList.toggle('pitch-focused',open);focusEdit.hidden=!open;
    $('focusPitch').textContent=open?'Exit expanded pitch':'Expand pitch ↗';$('focusPitch').setAttribute('aria-expanded',String(open));
    if(open){board.setAttribute('role','dialog');board.setAttribute('aria-modal','true');board.setAttribute('aria-label','Expanded tactical pitch');$('closePitch').focus();}
    else{board.removeAttribute('role');board.removeAttribute('aria-modal');board.removeAttribute('aria-label');background.forEach(([e,inert])=>e.inert=inert);focusReturn?.focus();}
  }
  $('focusPitch').onclick=()=>toggleFocus(!board.classList.contains('pitch-focus'));
  $('closePitch').onclick=()=>toggleFocus(false);
  $('focusMakeOwner').onclick=()=>{if(!replayActive)$('makeOwner').click();};
  $('pitchZoom').onchange=()=>{const zoom=Number($('pitchZoom').value);$('pitch').style.width=`max(${zoom*100}%, ${zoom*720}px)`;$('pitch').style.maxWidth='none';};
  document.addEventListener('keydown',e=>{
    if(!board.classList.contains('pitch-focus'))return;
    if(e.key==='Escape'){e.preventDefault();toggleFocus(false);}
    if(e.key==='Tab'){
      const els=[...board.querySelectorAll('button:not(:disabled),select:not(:disabled),input:not(:disabled),[tabindex="0"]')].filter(e=>e.getClientRects().length&&!e.closest('[hidden]'));
      const first=els[0],last=els.at(-1);
      if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}
      else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}
    }
  });
  function touchTargets(){
    for(const g of $('pitch').querySelectorAll('.player')){
      const p=state.players.find(p=>p.id===g.dataset.id),hit=document.createElementNS(NS,'circle');
      for(const [k,v] of Object.entries({cx:p.x,cy:p.y,r:2.6,fill:'transparent','pointer-events':'all',class:'touch-target'}))hit.setAttribute(k,v);
      g.prepend(hit);
    }
    message('focusSelection','Selected: '+state.selected);$('focusMakeOwner').disabled=replayActive;
  }
  const oldRender=render;render=function(){oldRender();touchTargets();list();};touchTargets();

  const assist=document.createElement('div');assist.className='mapping-assist';
  assist.innerHTML='<div class="toolbar"><button id="nextMissing">Next missing marker →</button><button id="removeMarker">Remove selected marker</button></div><p id="mappingWarnings" role="status" class="fine"></p>';
  $('markerChecklist').before(assist);
  function duplicates(){
    const points=[...mappedPoints];const pairs=[];
    for(let i=0;i<points.length;i++)for(let j=i+1;j<points.length;j++){
      if(points[i][0]==='ball'||points[j][0]==='ball')continue;
      if(Math.hypot(points[i][1].x-points[j][1].x,points[i][1].y-points[j][1].y)<.012)pairs.push([points[i][0],points[j][0]]);
    }return pairs;
  }
  function assistUpdate(){
    $('nextMissing').disabled=replayActive||calibration.length<4||mappedPoints.size===23;
    $('removeMarker').disabled=replayActive||!mappedPoints.has($('mappingTarget').value);
    const pairs=duplicates();
    message('mappingWarnings',pairs.length?'Check nearby player markers: '+pairs.map(p=>p.join(' / ')).join('; ')+'. They may overlap legitimately. Select a marker to reposition it.':'No nearby duplicate player markers found. This checks proximity only, not player identity.');
  }
  $('nextMissing').onclick=()=>{const missing=mappingIds.find(id=>!mappedPoints.has(id));if(missing){$('mappingTarget').value=missing;drawMapping();$('mappingTarget').focus();}};
  $('removeMarker').onclick=()=>{
    if(replayActive)return;const id=$('mappingTarget').value,old=mappedPoints.get(id);if(!old)return;
    mappingHistory.push({id,old});mappedPoints.delete(id);drawMapping();
  };
  const previousDraw=drawMapping;drawMapping=function(){previousDraw();assistUpdate();};
  $('mappingTarget').addEventListener('change',assistUpdate);assistUpdate();

  const challengePanel=document.createElement('div');challengePanel.className='challenge-panel';
  challengePanel.innerHTML='<div><span class="eyebrow">YOUR TURN, COACH</span><h3>Decision challenge</h3><p>Choose a route and explain your reasoning before the reveal. Review timing evidence beside the synthetic action. There is no accuracy score for unobserved alternatives.</p></div><button id="startChallenge" class="primary">Start decision challenge</button><div id="challengeWorkspace" hidden><label for="challengeReason">Why this pass?</label><textarea id="challengeReason" maxlength="280" rows="2" placeholder="Look at space, pressure and the receiving player…"></textarea><p id="challengeStatus" role="status"></p><ol id="challengeJournal"></ol><button id="endChallenge">Leave challenge</button></div>';
  replayPanel.querySelector('h2').before(challengePanel);
  function challengeUpdate(){
    $('challengeWorkspace').hidden=!challenge;
    if(!challenge)return;
    $('autoReplay').disabled=true;$('decisionSeek').disabled=true;$('previousDecision').disabled=true;
    $('nextDecision').disabled=!replayRevealed||replayIndex>=replayMatch.decisions.length-1;
    $('revealPass').disabled=replayRevealed||!replayChoice||!$('challengeReason').value.trim();
    $('challengeReason').disabled=replayRevealed;
    message('challengeStatus',`${journal.length} / ${replayMatch.decisions.length} decisions reviewed. `+(replayRevealed?'Read your review, then continue to the next decision.':'Inspect a passing card, choose the candidate, and write your reason to unlock the reveal.'));
    $('challengeJournal').replaceChildren();
    for(const entry of journal){const li=document.createElement('li');li.textContent=entry;$('challengeJournal').append(li);}
    if(!replayChoice)$('chosenPass').textContent='Choose a candidate and write your reason before revealing.';
  }
  const previousReplay=renderReplay;renderReplay=function(){previousReplay();challengeUpdate();};
  $('replayFocus').onchange=()=>renderReplay();$('replayAudience').onchange=()=>renderReplay();
  $('studioLanguage').addEventListener('change',challengeUpdate);
  const previousDecision=loadDecision;loadDecision=function(i){$('challengeReason').value='';previousDecision(i);};
  const start=$('startReplay').onclick;
  $('startReplay').onclick=()=>{challenge=false;journal=[];start();challengeUpdate();};
  $('startChallenge').onclick=()=>{RippleWorkspace.flush();challenge=true;journal=[];stopReplay();start();challengeUpdate();};
  $('challengeReason').addEventListener('input',challengeUpdate);
  const reveal=$('revealPass').onclick;
  $('revealPass').onclick=()=>{
    if(challenge){
      if(!replayChoice||!$('challengeReason').value.trim()||replayRevealed)return;
      journal.push(`Decision ${replayIndex+1}: ${replayChoice.receiver}. Your reason: ${$('challengeReason').value.trim()}. Estimated route margin ${signed(replayChoice.routeMargin)}; ${replayChoice.viable?'viable':'flagged'} under the assumptions. The reveal describes the recorded synthetic action only.`);
    }reveal();
  };
  function endChallenge(){challenge=false;challengeUpdate();if(replayActive){$('autoReplay').disabled=false;$('decisionSeek').disabled=false;renderReplay();}}
  $('endChallenge').onclick=endChallenge;$('exitReplay').addEventListener('click',endChallenge);
  const oldLock=lockReplay;lockReplay=function(active){oldLock(active);list();assistUpdate();$('focusMakeOwner').disabled=active;if(active){$('undoBoard').disabled=true;$('redoBoard').disabled=true;}};
  const research=document.createElement('div');research.className='model-result';
  research.innerHTML='<span class="pill">RESEARCH ONLY</span><h3>Wyscout follow-up experiment</h3><p>Trained on 176,133 English league simple passes. Tested on 250,436 French league passes across 380 untouched matches.</p><div class="research-metrics"><div><strong>0.6235</strong><span>ROC AUC</span></div><div><strong>0.2896</strong><span>Log loss</span></div><div><strong>0.06%</strong><span>Improvement vs logistic</span></div></div><p>This experiment also missed the 2% improvement gate. Release location alone cannot compare intended receivers. Different datasets have different pass populations; these scores are not a head-to-head comparison with StatsBomb.</p><p>The tactical board continues to use timing calculations and heuristic rankings. Neither research classifier is deployed.</p><p class="fine">Source: Pappalardo et al. (2019), Wyscout Soccer Match Event Dataset, CC BY 4.0.</p>';
  $('report-studio').append(research);
  window.RipplePlaybook={encode,decode,duplicates,get journal(){return [...journal];}};
})();
