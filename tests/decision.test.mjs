import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {MatchIntelligence,PassingModel,initial} from '../model-loader.mjs';
const F=vm.runInNewContext(readFileSync(new URL('../prototypes/pass-detective/frame-model.js',import.meta.url),'utf8')+'\nFrameModel');
test('missing-opponent scenarios reduce clearance without mutating marks',()=>{
 const a={x:20,y:34},b={x:40,y:34},opponents=[{x:30,y:36}];const before=JSON.stringify(opponents);
 const rows=F.missingSensitivity(a,b,opponents);assert.equal(rows[0].clearance,0);assert.equal(rows[1].clearance,1);assert.equal(rows[3].clearance,2);assert.equal(JSON.stringify(opponents),before);
 assert.throws(()=>F.missingSensitivity(a,a,[]));
});
test('decision flip is bounded, deterministic and preserves live state',()=>{
 const state=initial(),before=JSON.stringify(state);const a=MatchIntelligence.decisionFlip(state,PassingModel),b=MatchIntelligence.decisionFlip(state,PassingModel);
 assert.deepEqual(a,b);assert.ok(a.tested<=18);assert.ok(a.baseline);assert.equal(JSON.stringify(state),before);
 state.owner=null;assert.throws(()=>MatchIntelligence.decisionFlip(state,PassingModel));
});
test('decision flip identifies the first sampled change with controlled evaluator',()=>{
 const s={owner:'a',ball:{x:0,y:0},players:[{id:'a',team:'blue'},{id:'d',team:'coral',x:5,y:3}]};
 const model={candidates:()=>[{receiver:'b',target:{x:10,y:0}},{receiver:'c',target:{x:10,y:1}}],evaluate:(s,c)=>({...c,viable:true,score:c.receiver==='b'?s.players[1].y:1.5})};
 const r=MatchIntelligence.decisionFlip(s,model);assert.equal(r.moved,2);assert.equal(r.next,'c');assert.equal(s.players[1].y,3);
});
