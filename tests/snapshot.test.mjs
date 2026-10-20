import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const model=vm.runInNewContext(readFileSync(new URL('../prototypes/pass-detective/snapshot-model.js',import.meta.url),'utf8')+'\nSnapshotModel');
const html=readFileSync(new URL('../prototypes/pass-detective/index.html',import.meta.url),'utf8');
const ui=html.match(/<script id="board-ui">([\s\S]*?)<\/script>/)[1];
const initial=vm.runInNewContext(ui.slice(ui.indexOf('const roles='),ui.indexOf('let state='))+'\ninitial');
test('rectangle calibration maps pitch centre and corners to metres',()=>{
  const h=model.calibrate([{x:0,y:0},{x:1,y:0},{x:1,y:1},{x:0,y:1}]);
  const centre=model.project(h,{x:.5,y:.5});
  assert.ok(Math.abs(centre.x-52.5)<1e-7);assert.ok(Math.abs(centre.y-34)<1e-7);
  assert.throws(()=>model.project(h,{x:2,y:.5}));
});
test('perspective calibration maps each source corner to its designated pitch corner',()=>{
  const source=[{x:.2,y:.1},{x:.8,y:.2},{x:.95,y:.9},{x:.05,y:.85}],h=model.calibrate(source);
  [[0,0],[105,0],[105,68],[0,68]].forEach(([x,y],i)=>{
    const p=model.project(h,source[i]);assert.ok(Math.abs(p.x-x)<1e-6);assert.ok(Math.abs(p.y-y)<1e-6);
  });
});
test('crossed and collinear calibration is rejected',()=>{
  assert.throws(()=>model.calibrate([{x:0,y:0},{x:1,y:1},{x:1,y:0},{x:0,y:1}]));
  assert.throws(()=>model.calibrate([{x:0,y:0},{x:1,y:0},{x:2,y:0},{x:3,y:0}]));
});
test('board snapshots round trip with canonical player identities',()=>{
  const state=initial(),input={schemaVersion:1,kind:'pass-detective-board',state};
  state.players[0].role='<script>bad</script>';
  const restored=model.validate(input,initial());
  assert.equal(restored.players[0].role,'GK');
  assert.equal(restored.owner,state.owner);
});
test('invalid positions, duplicate identities, bad assumptions and remote possession are rejected',()=>{
  for(const mutate of [
    s=>s.players[0].x=106,s=>s.players[1].id=s.players[0].id,s=>s.cfg.acceleration=0,
    s=>s.owner='not-a-player',s=>s.ball={x:0,y:0},s=>s.players.pop()
  ]){
    const state=initial();mutate(state);
    assert.throws(()=>model.validate({schemaVersion:1,kind:'pass-detective-board',state},initial()));
  }
});
