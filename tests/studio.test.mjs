import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {JSDOM,VirtualConsole} from 'jsdom';
import {PassingModel,MatchIntelligence,initial} from '../model-loader.mjs';
import {explain,detectMarkers} from '../ai-service.mjs';

test('window sensitivity preserves source state and records a viable baseline',()=>{
  const state=initial();state.cfg.offside=false;
  const owner=state.players.find(p=>p.id===state.owner);owner.x=40;owner.y=34;state.ball={x:40.4,y:34};
  state.players.filter(p=>p.team==='coral').forEach(p=>{p.x=70;p.y=10;});
  const receiver=state.players.find(p=>p.id==='blue-10');receiver.x=57;receiver.y=34;
  const c={receiver:receiver.id,target:{x:57,y:34,label:'To feet'},speed:16,foot:'right'};
  const before=JSON.stringify(state),report=MatchIntelligence.sensitivity(state,c,PassingModel);
  assert.equal(report.baselineViable,true);assert.equal(report.samples[0].shift,0);
  assert.equal(JSON.stringify(state),before);
});
test('contribution tracking credits each earlier contributor once per shot sequence',()=>{
  const events=[
    {id:'a',team:'blue',passer:'blue-8',outcome:'completed'},
    {id:'b',team:'blue',passer:'blue-8',outcome:'completed'},
    {id:'c',team:'blue',passer:'blue-10',outcome:'completed',shot:{id:'shot',player:'blue-9'}}
  ];
  const rows=MatchIntelligence.contributions(events);assert.equal(rows.length,1);
  assert.equal(rows[0].player,'blue-8');assert.equal(rows[0].chains,1);
  assert.equal(MatchIntelligence.contributions(events.slice(0,2)).length,0);
});
test('vision output cannot introduce unknown players or invalid coordinates',()=>{
  assert.throws(()=>MatchIntelligence.visionSuggestions({markers:[{id:'unknown',x:.5,y:.5,confidence:.8}]},initial()));
  assert.throws(()=>MatchIntelligence.visionSuggestions({markers:[{id:'ball',x:2,y:.5,confidence:.8}]},initial()));
});
test('overlay includes finite timing and unique evidence identifiers',()=>{
  const o=MatchIntelligence.overlay({text:'example',evidenceIds:['e1','e1'],language:'ms',time:20,eventId:'e1'});
  assert.equal(o.endTime,28);assert.equal(o.evidenceIds.length,1);assert.equal(o.kind,'estimate');
});
const facts=MatchIntelligence.facts(initial(),PassingModel.candidates(initial())[0],PassingModel);
const cfg={url:'https://example.com/chat',key:'test',deployment:'model'};
test('Foundry tools retrieve evidence before validated fact selection',async()=>{
  let calls=0;
  const result=await explain({facts,question:'Why?',language:'ms'},cfg,async()=>{
    calls++;return {ok:true,json:async()=>({choices:[{message:calls===1?
      {role:'assistant',tool_calls:[{id:'t1',type:'function',function:{name:'get_route_evidence',arguments:'{}'}}]}:
      {role:'assistant',content:'{"factIds":["route","risk"]}'}}]})};
  });
  assert.equal(result.source,'foundry-agent');assert.equal(result.trace.length,1);
  assert.equal(result.claims[0].text,facts[0].ms);
});
test('AI cannot select a fact not retrieved through evidence tools',async()=>{
  let calls=0;
  const result=await explain({facts,question:'Why?'},cfg,async()=>({ok:true,json:async()=>({choices:[{message:++calls===1?
    {role:'assistant',tool_calls:[{id:'t1',function:{name:'get_model_limits',arguments:'{}'}}]}:
    {content:'{"factIds":["route"]}'}}]})}));
  assert.equal(result.source,'local-template');assert.ok(result.reason);
});
test('vision provider output is validated before returning suggestions',async()=>{
  const markers=await detectMarkers('data:image/png;base64,AA==',initial(),{...cfg,vision:'vision'},MatchIntelligence.visionSuggestions,
    async()=>({ok:true,json:async()=>({choices:[{message:{content:'{"markers":[{"id":"ball","x":0.5,"y":0.5,"confidence":0.7}]}'}}]})}));
  assert.equal(markers[0].id,'ball');
});

function loadUI(options={}){
  const dir=new URL('../prototypes/pass-detective/',import.meta.url);
  const html=readFileSync(new URL('index.html',dir),'utf8');
  const errors=[],console=new VirtualConsole();console.on('jsdomError',e=>errors.push(e));
  const dom=new JSDOM(html,{runScripts:'outside-only',url:options.url||(options.storage?'https://ripple.test/':'file:///prototype/index.html'),pretendToBeVisual:true,virtualConsole:console});
  dom.window.fetch=async()=>({ok:true,json:async()=>({ai:false,vision:false})});
  if(options.draft)dom.window.localStorage.setItem('ripple.board.v1',options.draft);
  if(options.library)dom.window.localStorage.setItem('ripple.library.v1',options.library);
  dom.window.structuredClone=structuredClone;
  dom.window.HTMLElement.prototype.scrollIntoView=function(){};
  const context=dom.getInternalVMContext();
  for(const script of html.matchAll(/<script(?: id="[^"]*")?(?: src="([^"]+)")?>([\s\S]*?)<\/script>/g)){
    vm.runInContext(script[1]?readFileSync(new URL(script[1],dir),'utf8'):script[2],context);
  }
  return {dom,errors,context,$:id=>dom.window.document.getElementById(id)};
}

test('match scenarios save and restore board plus assumptions; invalid saves do not corrupt state',()=>{
  const {$,dom,context,errors}=loadUI({storage:true});
  try{
    $('wpMinute').value='75';$('wpSaveSession').click();assert.match($('wpStorageStatus').textContent,/saved/);
    $('wpMinute').value='85';vm.runInContext('state.players[0].x=18;render()',context);
    $('wpLoadSession').click();assert.equal($('wpMinute').value,'75');assert.equal(vm.runInContext('state.players[0].x',context),5);
    const bad=JSON.parse(dom.window.localStorage.getItem('ripple.match.v1'));bad.fields.wpMinute='NaN';
    dom.window.localStorage.setItem('ripple.match.v1',JSON.stringify(bad));const before=vm.runInContext('JSON.stringify(state)',context);
    $('wpLoadSession').click();assert.match($('wpStorageStatus').textContent,/Not loaded/);assert.equal(vm.runInContext('JSON.stringify(state)',context),before);
    assert.deepEqual(errors,[]);
  }finally{dom.window.close();}
});

test('match outlook computes scenarios and clears stale results after context or board edits',()=>{
  const {$,dom,context,errors}=loadUI();
  try{
    dom.window.RippleWorkspace.showView('outlook');
    assert.equal($('match-outlook').hidden,false);
    assert.match($('wpDashboard').textContent,/Win.*Draw.*Loss/);
    const buttons=$('wpActions').querySelectorAll('button');buttons[buttons.length-1].click();
    assert.equal($('wpSuccess').disabled,true);$('wpEvaluate').click();
    assert.match($('wpScenario').textContent,/Illustrative.*percentage points/);
    $('wpGoal').value='';$('wpGoal').dispatchEvent(new dom.window.Event('input'));$('wpEvaluate').click();
    assert.match($('wpScenario').textContent,/Check/);
    $('wpGoal').value='10';$('wpEvaluate').click();
    vm.runInContext('state.players[0].x+=1;render()',context);
    assert.equal($('wpScenario').textContent,'');
    $('wpMinute').value='90';$('wpMinute').dispatchEvent(new dom.window.Event('input'));
    assert.match($('wpDashboard').textContent,/Draw 100.0%/);
    $('wpEvaluate').click();assert.match($('wpScenario').textContent,/exceeds remaining/);
    $('wpHomeScore').value='-1';$('wpHomeScore').dispatchEvent(new dom.window.Event('input'));
    assert.equal($('wpDashboard').textContent,'');assert.equal($('wpEvaluate').disabled,true);
    assert.deepEqual(errors,[]);
  }finally{dom.window.close();}
});

test('visible route needs only two teammates, not a ball or complete roster',()=>{
  const {$,dom,context,errors}=loadUI({storage:true});
  try{
    dom.window.HTMLCanvasElement.prototype.getContext=()=>new Proxy({},{get:()=>()=>{}});
    const before=vm.runInContext('JSON.stringify(state)',context);
    vm.runInContext('snapshotImage={};calibration=[{x:0,y:0},{x:1,y:0},{x:1,y:1},{x:0,y:1}];mappedPoints.set("blue-1",{x:.1,y:.5});mappedPoints.set("ball",{x:.2,y:.5});drawMapping()',context);
    assert.equal($('measureFrame').disabled,true);
    vm.runInContext('mappedPoints.delete("ball");mappedPoints.set("blue-2",{x:.9,y:.5});drawMapping()',context);
    assert.equal($('measureFrame').disabled,false);
    assert.equal($('frameReceiver').value,'blue-2');
    $('measureFrame').click();
    assert.match($('frameResult').textContent,/84.0 m apart/);
    assert.match($('frameResult').textContent,/20 players unknown/);
    assert.equal($('applyImage').closest('details').open,false);
    assert.equal(vm.runInContext('JSON.stringify(state)',context),before);
    vm.runInContext('mappedPoints.delete("blue-2");mappedPoints.set("coral-1",{x:.9,y:.5});drawMapping()',context);
    assert.equal($('measureFrame').disabled,true);
    assert.deepEqual(errors,[]);
  }finally{dom.window.close();}
});

test('partial frame geometry maps known landmarks without importing unknown players',()=>{
  const {$,dom,context,errors}=loadUI({storage:true});
  try{
    dom.window.HTMLCanvasElement.prototype.getContext=()=>new Proxy({},{get:()=>()=>{}});
    const before=vm.runInContext('JSON.stringify(state)',context);
    $('frameRegion').value='leftBox';$('frameRegion').dispatchEvent(new dom.window.Event('change'));
    vm.runInContext('snapshotImage={};calibration=[{x:0,y:0},{x:1,y:0},{x:1,y:1},{x:0,y:1}];mappedPoints.set("blue-1",{x:.1,y:.5});mappedPoints.set("blue-2",{x:.9,y:.5});mappedPoints.set("coral-1",{x:.5,y:.6});drawMapping()',context);
    const centre=vm.runInContext('FrameModel.project(calibration,{x:.5,y:.5},"leftBox")',context);
    assert.equal(centre.x,8.25);assert.equal(centre.y,34);
    $('framePasser').value='blue-1';$('frameReceiver').value='blue-2';$('measureFrame').click();
    assert.match($('frameResult').textContent,/13.2 m apart/);assert.match($('frameResult').textContent,/19 players unknown/);
    assert.equal($('applyImage').disabled,true);$('applyImage').onclick();assert.equal(vm.runInContext('JSON.stringify(state)',context),before);
    $('frameReceiver').value='coral-1';$('measureFrame').click();assert.match($('frameResult').textContent,/two different marked teammates/);
    $('frameRegion').value='rightHalf';$('frameRegion').dispatchEvent(new dom.window.Event('change'));assert.equal(vm.runInContext('mappedPoints.size',context),0);
    assert.deepEqual(errors,[]);
  }finally{dom.window.close();}
});

test('colour assistance returns regions rather than identities and ignores nonmatching pixels',()=>{
  const {dom,context}=loadUI();
  try{
    const result=vm.runInContext(`(()=>{const data=new Uint8ClampedArray(100*100*4);for(let y=20;y<24;y++)for(let x=30;x<34;x++){let i=(y*100+x)*4;data[i]=57;data[i+1]=139;data[i+2]=255;data[i+3]=255;}return FrameModel.blobs(data,100,100,[57,139,255]);})()`,context);
    assert.equal(result.length,1);assert.ok(Math.abs(result[0].x-.32)<.001);assert.equal(result[0].id,undefined);
  }finally{dom.window.close();}
});

test('clipboard image paste uses shared loader only in screenshot view and outside text inputs',async()=>{
  const {$,dom,context}=loadUI({storage:true});
  try{
    vm.runInContext('window.pasted=[];loadSnapshotFile=async file=>window.pasted.push(file.type)',context);
    const paste=target=>{const e=new dom.window.Event('paste',{bubbles:true,cancelable:true});Object.defineProperty(e,'clipboardData',{value:{items:[{kind:'file',type:'image/png',getAsFile:()=>({type:'image/png'})}]}});target.dispatchEvent(e);};
    paste(dom.window.document);assert.equal(dom.window.pasted.length,0);
    dom.window.RippleWorkspace.showView('snapshot');paste(dom.window.document);assert.equal(dom.window.pasted.length,1);
    paste($('markerX'));assert.equal(dom.window.pasted.length,1);
  }finally{dom.window.close();}
});

test('shared image loader rejects bad files and replay imports before decoding',async()=>{
  const {$,dom,context}=loadUI();
  try{
    await vm.runInContext('loadSnapshotFile({type:"text/html",size:1})',context);assert.match($('snapshotStatus').textContent,/Choose PNG/);
    await vm.runInContext('loadSnapshotFile({type:"image/png",size:16*1024*1024})',context);assert.match($('snapshotStatus').textContent,/15 MB/);
    $('startReplay').click();await vm.runInContext('loadSnapshotFile({type:"image/png",size:1})',context);assert.match($('snapshotStatus').textContent,/Exit replay/);
  }finally{dom.window.close();}
});

test('named scenarios persist, safely render names, load with undo and recover removed entries',()=>{
  const {$,dom,context,errors}=loadUI({storage:true});
  try{
    $('scenarioName').value='<img src=x onerror=alert(1)>';$('saveScenario').click();
    assert.equal($('scenarioList').options.length,1);assert.equal($('scenarioList').querySelector('img'),null);
    const saved=dom.window.localStorage.getItem('ripple.library.v1');
    const fresh=loadUI({storage:true,library:saved});
    assert.equal(fresh.$('scenarioList').options[0].textContent,$('scenarioName').value);fresh.dom.window.close();
    const x=Number($('px').value);$('px').value=49;$('px').dispatchEvent(new dom.window.Event('input'));
    $('loadScenario').click();assert.equal(Number($('px').value),x);
    $('undoBoard').click();assert.equal(Number($('px').value),49);
    $('scenarioName').value='High press';$('renameScenario').click();assert.equal($('scenarioList').options[0].textContent,'High press');
    $('deleteScenario').click();assert.equal($('loadScenario').disabled,true);
    $('undoRemoveScenario').click();assert.equal($('loadScenario').disabled,false);
    $('startReplay').click();assert.equal($('saveScenario').disabled,true);assert.equal($('loadScenario').disabled,true);
    assert.deepEqual(errors,[]);
  }finally{dom.window.close();}
});

test('library failure is truthful and a corrupt stored library does not crash the board',()=>{
  const ui=loadUI({storage:true,library:'{bad'});
  try{assert.match(ui.$('libraryStatus').textContent,/could not be read/);assert.ok(ui.$('cards').children.length);}finally{ui.dom.window.close();}
  const denied=loadUI();
  try{denied.$('scenarioName').value='Test';denied.$('saveScenario').click();assert.match(denied.$('libraryStatus').textContent,/Storage unavailable/);assert.equal(denied.$('loadScenario').disabled,true);}finally{denied.dom.window.close();}
});

test('share codec round trips canonical boards, rejects tampering and only loads on request',()=>{
  const ui=loadUI({storage:true});
  let code;
  try{
    const source=vm.runInContext('structuredClone(state)',ui.context);
    code=ui.dom.window.RipplePlaybook.encode(source);
    assert.ok(code.length<12000);assert.equal(JSON.stringify(ui.dom.window.RipplePlaybook.decode(code)),JSON.stringify(source));
    assert.throws(()=>ui.dom.window.RipplePlaybook.decode('!'.repeat(13000)));
    const parsed=JSON.parse(Buffer.from(code,'base64url'));parsed.p[0][1]=999;
    assert.throws(()=>ui.dom.window.RipplePlaybook.decode(Buffer.from(JSON.stringify(parsed)).toString('base64url')));
    ui.$('createBoardLink').click();assert.match(ui.$('boardLink').value,/^https:\/\/ripple.test\/#board=/);
    assert.equal(ui.$('boardLink').value.includes('image'),false);
  }finally{ui.dom.window.close();}
  const draft=initial();draft.players[0].x=12;
  const linked=loadUI({storage:true,url:'https://ripple.test/#board='+code,draft:JSON.stringify({schemaVersion:1,kind:'pass-detective-board',state:draft})});
  try{
    assert.equal(vm.runInContext('state.players[0].x',linked.context),12);
    linked.$('loadSharedBoard').click();assert.notEqual(vm.runInContext('state.players[0].x',linked.context),12);
    linked.$('undoBoard').click();assert.equal(vm.runInContext('state.players[0].x',linked.context),12);
  }finally{linked.dom.window.close();}
  const invalid=loadUI({storage:true,url:'https://ripple.test/#board=bogus'});
  try{assert.equal(invalid.$('loadSharedBoard').disabled,true);assert.match(invalid.$('sharedSummary').textContent,/invalid/);}finally{invalid.dom.window.close();}
});

test('challenge requires both choice and reason, keeps future outcomes hidden and resets between decisions',()=>{
  const {$,dom,context,errors}=loadUI({storage:true});
  try{
    $('startChallenge').click();assert.equal($('revealPass').disabled,true);assert.equal($('autoReplay').disabled,true);assert.equal($('decisionSeek').disabled,true);
    $('pickCandidate').click();assert.equal($('revealPass').disabled,true);
    $('challengeReason').value='Space ahead of receiver';$('challengeReason').dispatchEvent(new dom.window.Event('input'));
    assert.equal($('revealPass').disabled,false);
    $('replayFocus').value='blue-8';$('replayFocus').dispatchEvent(new dom.window.Event('change'));
    assert.equal($('autoReplay').disabled,true);assert.equal($('nextDecision').disabled,true);
    $('revealPass').click();assert.equal(dom.window.RipplePlaybook.journal.length,1);assert.equal($('challengeReason').disabled,true);
    $('nextDecision').click();assert.equal($('challengeReason').value,'');assert.equal($('revealPass').disabled,true);
    assert.equal(vm.runInContext('ReplayModel.observed(replayMatch,replayIndex,replayRevealed).length',context),1);
    $('endChallenge').click();assert.equal($('autoReplay').disabled,false);assert.equal($('revealPass').disabled,false);
    $('startChallenge').click();assert.equal(dom.window.RipplePlaybook.journal.length,0);
    $('exitReplay').click();assert.equal($('challengeWorkspace').hidden,true);assert.deepEqual(errors,[]);
  }finally{dom.window.close();}
});

test('mapping assistance detects close players, skips ball overlap and supports removal undo',()=>{
  const {$,dom,context}=loadUI();
  try{
    dom.window.HTMLCanvasElement.prototype.getContext=()=>new Proxy({},{get:()=>()=>{}});
    vm.runInContext('snapshotImage={}; calibration=[{x:0,y:0},{x:1,y:0},{x:1,y:1},{x:0,y:1}]; mappedPoints.set("blue-1",{x:.2,y:.2});mappedPoints.set("blue-2",{x:.201,y:.2});mappedPoints.set("ball",{x:.2,y:.2});drawMapping()',context);
    assert.equal(dom.window.RipplePlaybook.duplicates().length,1);assert.match($('mappingWarnings').textContent,/blue-1 \/ blue-2/);
    const next=vm.runInContext('mappingIds.find(id=>!mappedPoints.has(id))',context);
    $('nextMissing').click();assert.equal($('mappingTarget').value,next);
    $('mappingTarget').value='blue-2';$('mappingTarget').dispatchEvent(new dom.window.Event('change'));$('removeMarker').click();
    assert.equal(dom.window.RipplePlaybook.duplicates().length,0);$('undoMark').click();assert.equal(dom.window.RipplePlaybook.duplicates().length,1);
    $('startReplay').click();assert.equal($('nextMissing').disabled,true);assert.equal($('removeMarker').disabled,true);
  }finally{dom.window.close();}
});

test('expanded pitch restores focus, zooms and retains one touch target per player',()=>{
  const {$,dom,context}=loadUI();
  try{
    $('enterStudio').click();
    $('focusPitch').focus();$('focusPitch').click();assert.equal($('tactics').getAttribute('aria-modal'),'true');
    $('pitchZoom').value='2';$('pitchZoom').dispatchEvent(new dom.window.Event('change'));assert.equal($('pitch').style.width,'max(200%, 1440px)');
    vm.runInContext('render();render()',context);assert.equal($('pitch').querySelectorAll('.touch-target').length,22);
    dom.window.document.dispatchEvent(new dom.window.KeyboardEvent('keydown',{key:'Escape'}));
    assert.equal($('tactics').classList.contains('pitch-focus'),false);assert.equal(dom.window.document.activeElement,$('focusPitch'));
  }finally{dom.window.close();}
});
test('draft history supports undo, redo, reload, and clear without erasing current state',()=>{
  const {$,dom,context}=loadUI({storage:true});
  try{
    const old=vm.runInContext('state.players.find(p=>p.id===state.selected).x',context);
    $('px').value=49;$('px').dispatchEvent(new dom.window.Event('input'));
    dom.window.RippleWorkspace.flush();
    const draft=dom.window.localStorage.getItem('ripple.board.v1');
    assert.ok(draft);assert.equal($('undoBoard').disabled,false);
    $('undoBoard').click();assert.equal(Number($('px').value),old);
    $('redoBoard').click();assert.equal(Number($('px').value),49);
    const restored=loadUI({storage:true,draft});
    try{assert.equal(Number(restored.$('px').value),49);assert.match(restored.$('draftStatus').textContent,/restored/);}
    finally{restored.dom.window.close();}
    $('clearDraft').click();assert.equal(dom.window.localStorage.getItem('ripple.board.v1'),null);
    assert.equal(Number($('px').value),49);
  }finally{dom.window.close();}
});
test('replay cannot overwrite saved editing draft and hidden playback stops',()=>{
  const {$,dom}=loadUI({storage:true});
  try{
    $('px').value=48;$('px').dispatchEvent(new dom.window.Event('input'));dom.window.RippleWorkspace.flush();
    const before=dom.window.localStorage.getItem('ripple.board.v1');
    dom.window.RippleWorkspace.showView('replay');$('startReplay').click();
    assert.equal($('undoBoard').disabled,true);
    $('nextDecision').click();
    dom.window.RippleWorkspace.flush();
    assert.equal(dom.window.localStorage.getItem('ripple.board.v1'),before);
    assert.equal($('undoBoard').disabled,true);
    $('autoReplay').click();dom.window.RippleWorkspace.showView('snapshot');
    assert.equal($('autoReplay').textContent,'Play sequence');
    assert.equal($('snapshot-import').hidden,false);
    assert.equal($('tactics').parentElement.hidden,true);
  }finally{dom.window.close();}
});
test('reports contain portable pitch and model evidence, including empty possession',()=>{
  const {$,dom,context}=loadUI();
  try{
    const report=dom.window.RippleWorkspace.reportHTML();
    assert.match(report,/<svg[^>]+xmlns=/);assert.match(report,/Heuristic score \(not probability\)/);
    assert.doesNotMatch(report,/undefined|NaN|<script/);
    $('studioLanguage').value='ms';$('studioLanguage').dispatchEvent(new dom.window.Event('change'));
    assert.match(dom.window.RippleWorkspace.reportHTML(),/Laporan analisis/);
    vm.runInContext('state.owner=null;render()',context);
    assert.match(dom.window.RippleWorkspace.reportHTML(),/Tetapkan penghantar/);
  }finally{dom.window.close();}
});
test('language switch translates workspace and dynamic cards without changing model state',()=>{
  const {$,dom,context}=loadUI();
  try{
    $('enterStudio').click();
    const before=vm.runInContext('JSON.stringify(state)',context);
    $('appLanguage').value='ms';$('appLanguage').dispatchEvent(new dom.window.Event('change'));
    assert.equal($('viewTitle').textContent,'Papan taktikal');
    assert.match($('cards').textContent,/Skor heuristik/);
    assert.equal(vm.runInContext('JSON.stringify(state)',context),before);
    dom.window.RippleWorkspace.showView('snapshot');
    assert.equal($('viewTitle').textContent,'Makmal tangkap layar');
    $('appLanguage').value='en';$('appLanguage').dispatchEvent(new dom.window.Event('change'));
    assert.equal($('viewTitle').textContent,'Screenshot lab');
    assert.match($('cards').textContent,/Heuristic score/);
  }finally{dom.window.close();}
});
test('keyboard screenshot mapping calibrates, marks all players, applies and supports undo',()=>{
  const {$,dom,context}=loadUI();
  try{
    dom.window.HTMLCanvasElement.prototype.getContext=()=>new Proxy({}, {get:()=>()=>{}});
    vm.runInContext('snapshotImage={};',context);
    const mark=(x,y)=>{$('markerX').value=x;$('markerY').value=y;$('placeMarker').click();};
    mark(101,0);assert.match($('snapshotStatus').textContent,/0 to 100/);
    assert.equal(vm.runInContext('calibration.length',context),0);
    mark(0,0);mark(100,0);mark(100,100);mark(0,100);
    assert.equal($('mappingTarget').disabled,false);
    for(let i=0;i<23;i++)mark(20+i+.125,50.125);
    assert.equal($('snapshotStatus').textContent,'');
    assert.equal(vm.runInContext('mappedPoints.get("blue-1").x',context),.20125);
    assert.equal($('applyImage').disabled,false);
    assert.equal($('markerChecklist').querySelectorAll('.marked').length,23);
    $('undoMark').click();assert.equal($('applyImage').disabled,true);
    mark(42,50);$('applyImage').click();
    assert.equal(dom.window.RippleWorkspace.view,'analysis');
    assert.equal(vm.runInContext('state.owner',context),null);
    assert.equal($('player-settings').querySelector('details.settings-fold').open,true);
    $('snapshotZoom').value='2';$('snapshotZoom').dispatchEvent(new dom.window.Event('change'));
    assert.equal($('snapshotCanvas').style.width,'200%');
  }finally{dom.window.close();}
});
test('guided start exits locked replay and navigation targets existing sections',()=>{
  const {$,dom,errors}=loadUI();
  try{
    $('startReplay').click();
    assert.equal($('px').disabled,true);
    $('guidedStart').click();
    assert.equal($('px').disabled,false);
    assert.equal($('replayWorkspace').hidden,true);
    assert.match($('walkthrough').textContent,/Compare #10/);
    assert.equal(dom.window.document.activeElement,$('tactics'));
    for(const link of dom.window.document.querySelectorAll('a[href^="#"]')){
      assert.ok($(link.hash.slice(1)),`Missing navigation target ${link.hash}`);
    }
    assert.ok($('tactics').compareDocumentPosition($('snapshot-import')) & 4);
    assert.equal(errors.length,0);
  }finally{dom.window.close();}
});
test('integrated UI supports replay reveal, language, focus, seek, overlays and exit',()=>{
  const {$,dom,errors}=loadUI();
  try{
    $('startReplay').click();
    assert.equal($('replayWorkspace').hidden,false);
    assert.equal($('px').disabled,true);
    assert.match($('replayRecap').textContent,/No observed/);
    $('revealPass').click();
    assert.match($('decisionStory').textContent,/Observed/);
    $('studioLanguage').value='ms';$('studioLanguage').dispatchEvent(new dom.window.Event('change'));
    assert.match($('decisionStory').textContent,/Hasil simulasi/);
    assert.match($('replayRecap').textContent,/hantaran/);
    $('showOverlay').click();assert.equal($('broadcastCard').hidden,false);
    $('nextDecision').click();assert.equal($('broadcastCard').hidden,true);
    $('decisionSeek').value='0';$('decisionSeek').dispatchEvent(new dom.window.Event('input'));
    assert.equal($('studioMoments').children.length,0);
    $('broadcastToggle').click();assert.ok(dom.window.document.body.classList.contains('broadcast-mode'));
    $('exitReplay').click();assert.equal($('px').disabled,false);assert.equal($('replayWorkspace').hidden,true);
    assert.equal($('nextDecision').disabled,true);assert.equal($('previousDecision').disabled,true);
    assert.equal(dom.window.document.documentElement.lang,'ms');
    assert.equal(errors.length,0,errors.map(e=>e.message).join('\n'));
  }finally{dom.window.close();}
});
test('an older asynchronous JSON import cannot overwrite a newer import',async()=>{
  const {$,dom,context}=loadUI();
  try{
    let release;
    const oldState=initial(),newState=initial();newState.objective='safe';
    const pack=state=>JSON.stringify({schemaVersion:1,kind:'pass-detective-board',state});
    const oldTarget={files:[{size:100,text:()=>new Promise(resolve=>{release=resolve;})}],value:'old'};
    const newTarget={files:[{size:100,text:async()=>pack(newState)}],value:'new'};
    const pending=$('snapshotJSON').onchange({target:oldTarget});
    await $('snapshotJSON').onchange({target:newTarget});
    release(pack(oldState));await pending;
    assert.equal(vm.runInContext('state.objective',context),'safe');
  }finally{dom.window.close();}
});
test('local explanation and animation work without network and cancel on board changes',async()=>{
  const {$,dom,errors}=loadUI();
  try{
    await $('askAnalysis').onclick();
    assert.ok($('analysisAnswer').textContent.length>30);
    $('animateCandidate').click();assert.ok($('estimated-motion'));
    $('px').value=45;$('px').dispatchEvent(new dom.window.Event('input'));
    assert.equal($('estimated-motion'),null);
    assert.equal(errors.length,0,errors.map(e=>e.message).join('\n'));
  }finally{dom.window.close();}
});


test('pending match import cannot overwrite a newer reset or board edit',async()=>{
  for(const change of ['reset','board','load']){
    const {$,dom,context}=loadUI({storage:true});
    try{
      $('wpMinute').value='75';$('wpSaveSession').click();
      const saved=dom.window.localStorage.getItem('ripple.match.v1');
      let finish;
      const pending=$('wpImport').onchange({target:{files:[{size:100,text:()=>new Promise(resolve=>{finish=resolve;})}],value:'pending'}});
      if(change==='reset')$('wpReset').click();
      if(change==='board')vm.runInContext('state.players[0].x=18;render()',context);
      if(change==='load'){
        const newer=JSON.parse(saved);newer.fields.wpMinute='85';
        dom.window.localStorage.setItem('ripple.match.v1',JSON.stringify(newer));$('wpLoadSession').click();
      }
      finish(saved);await pending;
      assert.equal($('wpMinute').value,change==='reset'?'80':change==='load'?'85':'75');
      if(change==='board')assert.equal(vm.runInContext('state.players[0].x',context),18);
    }finally{dom.window.close();}
  }
});

test('decision flip UI computes evidence then invalidates it after a board edit',()=>{
 const {$,dom,context}=loadUI();try{
  $('findDecisionFlip').click();assert.match($('decisionFlipResult').textContent,/Moving|No receiver change/);
  vm.runInContext('state.players[0].x+=1;render()',context);
  assert.match($('decisionFlipResult').textContent,/Board changed/);
 }finally{dom.window.close();}
});

test('keep possession restores assumptions and supports older saved scenarios',()=>{
 const {$,dom}=loadUI({storage:true});try{
  const choose=()=>[...$('wpActions').querySelectorAll('button')].find(b=>b.getAttribute('aria-label').includes('Keep possession')).click();
  choose();assert.equal($('wpGoal').disabled,true);assert.equal($('motionRun').disabled,true);
  $('wpRetention').value='92';$('wpEvaluate').click();assert.match($('wpScenario').textContent,/retention 92.0%/i);
  $('wpSaveSession').click();const saved=JSON.parse(dom.window.localStorage.getItem('ripple.match.v1'));
  $('wpRetention').value='20';$('wpLoadSession').click();assert.equal($('wpRetention').value,'92');$('wpEvaluate').click();assert.match($('wpScenario').textContent,/Possession retained/);
  delete saved.fields.wpRetention;dom.window.localStorage.setItem('ripple.match.v1',JSON.stringify(saved));$('wpLoadSession').click();assert.equal($('wpRetention').value,'80');
  $('wpEvaluate').click();$('wpWindow').value='20';$('wpWindow').dispatchEvent(new dom.window.Event('input'));assert.doesNotMatch($('wpActions').textContent,/illustrative/);
 }finally{dom.window.close();}
});

test('tactical guidance persists overrides without changing board rankings or probabilities',()=>{
 const {$,dom,context}=loadUI({storage:true});try{
  const before=vm.runInContext('JSON.stringify([state,result.top])',context),dashboard=$('wpDashboard').textContent;
  $('wpIntent').value='protect';$('wpIntent').dispatchEvent(new dom.window.Event('change'));
  assert.match($('wpGuidance').textContent,/manual intention differs/);
  assert.equal(vm.runInContext('JSON.stringify([state,result.top])',context),before);assert.equal($('wpDashboard').textContent,dashboard);
  $('wpSaveSession').click();$('wpIntent').value='auto';$('wpLoadSession').click();assert.equal($('wpIntent').value,'protect');
  $('wpHomeScore').value='0';$('wpHomeScore').dispatchEvent(new dom.window.Event('input'));assert.equal($('wpIntent').value,'protect');assert.match($('wpGuidance').textContent,/trailing/);
  const saved=JSON.parse(dom.window.localStorage.getItem('ripple.match.v1'));delete saved.fields.wpIntent;dom.window.localStorage.setItem('ripple.match.v1',JSON.stringify(saved));$('wpLoadSession').click();assert.equal($('wpIntent').value,'off');
  $('wpReset').click();assert.equal($('wpIntent').value,'off');
 }finally{dom.window.close();}
});


test('visual flip preview is isolated and apply is one reversible history step',()=>{
 const {$,dom,context,errors}=loadUI({storage:true});try{
  vm.runInContext('state.players[0].y+=0.1;render()',context);
  const before=vm.runInContext('JSON.stringify(state)',context);
  $('findDecisionFlip').click();assert.equal($('previewDecisionFlip').disabled,false);
  assert.equal($('applyDecisionFlip').disabled,true);
  $('previewDecisionFlip').click();assert.ok($('decisionFlipPreview').querySelector('svg'));
  assert.equal(vm.runInContext('JSON.stringify(state)',context),before);
  const expected=vm.runInContext('JSON.stringify(flipResult.to)',context);
  const id=vm.runInContext('flipResult.defender',context);
  $('applyDecisionFlip').click();
  assert.equal(vm.runInContext(`JSON.stringify({x:byId('${id}').x,y:byId('${id}').y})`,context),expected);
  assert.equal($('decisionFlipPreview').hidden,true);assert.equal($('undoDecisionFlip').disabled,false);
  $('undoDecisionFlip').click();assert.equal(vm.runInContext('JSON.stringify(state)',context),before);
  assert.equal($('undoDecisionFlip').disabled,true);assert.deepEqual(errors,[]);
 }finally{dom.window.close();}
});

test('flip preview invalidates on board edits and replay and cannot apply stale movement',()=>{
 const {$,dom,context}=loadUI();try{
  $('findDecisionFlip').click();$('previewDecisionFlip').click();
  vm.runInContext('state.cfg.reaction+=0.1;render()',context);
  assert.equal($('decisionFlipPreview').hidden,true);assert.equal($('applyDecisionFlip').disabled,true);
  const before=vm.runInContext('JSON.stringify(state)',context);$('applyDecisionFlip').onclick();
  assert.equal(vm.runInContext('JSON.stringify(state)',context),before);
  vm.runInContext('replayActive=true;render()',context);$('findDecisionFlip').click();
  assert.match($('decisionFlipResult').textContent,/Exit replay/);assert.equal($('previewDecisionFlip').disabled,true);
 }finally{dom.window.close();}
});


test('outcome cards retain per-action assumptions and clear on shared context changes',()=>{
 const {$,dom}=loadUI();try{
  const choose=text=>[...$('wpActions').querySelectorAll('button')].find(b=>b.getAttribute('aria-label').includes(text)).click();
  choose('Pass to');$('wpSuccess').value='81';$('wpEvaluate').click();
  choose('Keep possession');$('wpRetention').value='93';$('wpEvaluate').click();
  choose('Direct shot');$('wpGoal').value='25';$('wpEvaluate').click();
  const cards=[...$('wpComparisons').querySelectorAll('article')];assert.equal(cards.length,3);
  assert.match(cards[0].textContent,/Completion 81.0%/);assert.match(cards[1].textContent,/Retention 93.0%/);assert.match(cards[2].textContent,/Shot scoring 25.0%/);
  for(const card of cards){assert.equal(card.querySelectorAll('dt').length,3);assert.match(card.textContent,/vs baseline/);}
  $('wpGoal').value='30';$('wpGoal').dispatchEvent(new dom.window.Event('input',{bubbles:true}));
  assert.equal($('wpComparisons').querySelectorAll('article').length,2);
  $('wpWindow').value='20';$('wpWindow').dispatchEvent(new dom.window.Event('input',{bubbles:true}));
  assert.equal($('wpComparisons').querySelectorAll('article').length,0);
  choose('Keep possession');$('wpEvaluate').click();$('wpHomeScore').value='2';$('wpHomeScore').dispatchEvent(new dom.window.Event('input',{bubbles:true}));
  assert.equal($('wpComparisons').querySelectorAll('article').length,0);
 }finally{dom.window.close();}
});


test('workspace entry points and mobile selector preserve the working board',()=>{
 const {$,dom,context}=loadUI();try{
  const before=vm.runInContext('JSON.stringify(state)',context);
  dom.window.document.querySelector('[data-start-view="snapshot"]').click();
  assert.equal(dom.window.document.body.dataset.view,'snapshot');assert.equal($('workspaceSelect').value,'snapshot');assert.match($('workflowSteps').textContent,/Calibrate/);
  $('workspaceSelect').value='outlook';$('workspaceSelect').dispatchEvent(new dom.window.Event('change'));
  assert.equal($('match-outlook').hidden,false);assert.match($('workflowLimit').textContent,/not validated/);
  $('workflowNext').click();assert.equal(dom.window.document.body.dataset.view,'report');
  $('workflowNext').click();assert.equal(dom.window.document.body.dataset.view,'analysis');
  assert.equal(vm.runInContext('JSON.stringify(state)',context),before);
 }finally{dom.window.close();}
});


test('guided demo walks five steps and restarts without modifying working state',()=>{
 const {$,dom,context,errors}=loadUI();try{
  const before=vm.runInContext('JSON.stringify(state)',context);
  $('startDemo').click();assert.equal($('guidedDemo').open,true);assert.equal($('demoBack').disabled,true);
  for(let i=0;i<4;i++)$('demoNext').click();
  assert.match($('demoProgress').textContent,/5 of 5/);assert.match($('demoEvidence').textContent,/Example assumptions/);assert.match($('demoEvidence').textContent,/Keep possession/);
  assert.equal($('demoNext').disabled,true);$('demoBack').click();assert.match($('demoProgress').textContent,/4 of 5/);
  $('demoRestart').click();assert.match($('demoProgress').textContent,/1 of 5/);
  $('demoExit').click();assert.equal($('guidedDemo').open,false);
  assert.equal(vm.runInContext('JSON.stringify(state)',context),before);assert.deepEqual(errors,[]);
 }finally{dom.window.close();}
});
test('demo handles unavailable routes, full time, invalid context and replay',()=>{
 const {$,dom,context}=loadUI();try{
  vm.runInContext('state.owner=null;render()',context);$('wpMinute').value='90';$('startDemo').click();
  $('demoNext').click();assert.match($('demoCopy').textContent,/No viable pass/);
  for(let i=0;i<3;i++)$('demoNext').click();assert.match($('demoEvidence').textContent,/Not enough match time/);$('demoExit').click();
  $('wpMinute').value='';$('startDemo').click();assert.equal($('guidedDemo').open,false);
  vm.runInContext('replayActive=true',context);$('startDemo').click();assert.match($('startDemo').textContent,/Exit replay/);
 }finally{dom.window.close();}
});


test('editorial illustration and entry points preserve analytical state',()=>{
  const {$,dom,context,errors}=loadUI({storage:true});
  try{
    const before=vm.runInContext('JSON.stringify(state)',context);
    $('toggleLane').click();assert.equal($('toggleLane').getAttribute('aria-pressed'),'true');
    assert.match($('laneCaption').textContent,/One defender/);
    $('toggleLane').click();assert.equal($('toggleLane').getAttribute('aria-pressed'),'false');
    $('heroScreenshot').click();assert.equal(dom.window.document.body.dataset.view,'snapshot');
    dom.window.document.querySelector('[data-explore="outlook"]').click();assert.equal(dom.window.document.body.dataset.view,'outlook');
    dom.window.document.querySelector('.brand').click();assert.equal(dom.window.document.body.dataset.view,'home');
    $('enterStudio').click();assert.equal(dom.window.document.body.dataset.view,'analysis');
    assert.equal(vm.runInContext('JSON.stringify(state)',context),before);
    assert.equal(dom.window.document.querySelector('.workspace-workflow details').open,false);
    assert.deepEqual(errors,[]);
  }finally{dom.window.close();}
});


test('landing routes and saved-board entry restore named boards after reload',()=>{
  const first=loadUI({storage:true});let stored,saved;
  try{
    const {$,dom,context}=first;
    assert.equal(dom.window.RippleWorkspace.view,'home');
    $('enterStudio').click();assert.equal(dom.window.location.hash,'#studio');
    $('quickSave').click();assert.equal(dom.window.document.querySelector('.playbook-library').open,true);
    assert.equal(dom.window.document.activeElement.id,'scenarioName');
    vm.runInContext('state.players[0].x=12.5;render()',context);
    $('scenarioName').value='Saved retrieval check';$('saveScenario').click();
    saved=vm.runInContext('JSON.stringify(state)',context);stored=dom.window.localStorage.getItem('ripple.library.v1');
    dom.window.document.querySelector('.brand').click();assert.equal(dom.window.location.hash,'#welcome');
    assert.equal(dom.window.RippleWorkspace.view,'home');
  }finally{first.dom.window.close();}
  const second=loadUI({storage:true,library:stored});
  try{
    const {$,dom,context}=second;
    $('homeSaved').click();assert.equal(dom.window.RippleWorkspace.view,'analysis');
    assert.match($('scenarioList').textContent,/Saved retrieval check/);
    $('loadScenario').click();assert.equal(vm.runInContext('JSON.stringify(state)',context),saved);
    assert.match($('libraryStatus').textContent,/Scenario loaded/);
    assert.deepEqual(second.errors,[]);
  }finally{second.dom.window.close();}
  const linked=loadUI({url:'https://ripple.test/#studio'});
  try{assert.equal(linked.dom.window.RippleWorkspace.view,'analysis');}finally{linked.dom.window.close();}
});


test('saved-board library restores earlier JSON backups and rejects malformed files',async()=>{
 const {$,dom,context}=loadUI({storage:true});try{
  $('homeSaved').click();
  const payload={schemaVersion:1,kind:'pass-detective-board',state:initial()};payload.state.players[0].x=18;
  await $('restoreBoardBackup').onchange({target:{files:[{size:100,text:async()=>JSON.stringify(payload)}],value:'board.json'}});
  assert.equal(vm.runInContext('state.players[0].x',context),18);assert.match($('libraryStatus').textContent,/restored/);
  const before=vm.runInContext('JSON.stringify(state)',context);
  await $('restoreBoardBackup').onchange({target:{files:[{size:5,text:async()=>'{bad'}],value:'bad.json'}});
  assert.match($('libraryStatus').textContent,/not loaded/);assert.equal(vm.runInContext('JSON.stringify(state)',context),before);
 }finally{dom.window.close();}
});
