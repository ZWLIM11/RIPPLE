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

function loadUI(){
  const dir=new URL('../prototypes/pass-detective/',import.meta.url);
  const html=readFileSync(new URL('index.html',dir),'utf8');
  const errors=[],console=new VirtualConsole();console.on('jsdomError',e=>errors.push(e));
  const dom=new JSDOM(html,{runScripts:'outside-only',url:'file:///prototype/index.html',pretendToBeVisual:true,virtualConsole:console});
  dom.window.structuredClone=structuredClone;
  dom.window.HTMLElement.prototype.scrollIntoView=function(){};
  const context=dom.getInternalVMContext();
  for(const script of html.matchAll(/<script(?: id="[^"]*")?(?: src="([^"]+)")?>([\s\S]*?)<\/script>/g)){
    vm.runInContext(script[1]?readFileSync(new URL(script[1],dir),'utf8'):script[2],context);
  }
  return {dom,errors,context,$:id=>dom.window.document.getElementById(id)};
}
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
