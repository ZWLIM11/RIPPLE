import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {test} from 'node:test';
import assert from 'node:assert/strict';

const html=readFileSync(new URL('../prototypes/pass-detective/index.html',import.meta.url),'utf8');
const modelScript=html.match(/<script id="passing-model">([\s\S]*?)<\/script>/)[1];
const model=vm.runInNewContext(`${modelScript}\nPassingModel`);
const boardScript=html.match(/<script id="board-ui">([\s\S]*?)<\/script>/)[1];
// Exercise the actual initial-state factory without a DOM or duplicated fixture.
const initial=vm.runInNewContext(boardScript.slice(boardScript.indexOf('const roles='),boardScript.indexOf('let state='))+'\ninitial');
test('default board contains 22 players and 180 candidate passes without mutation',()=>{
  const state=initial(),snapshot=JSON.stringify(state),result=model.recommend(state);
  assert.equal(state.players.length,22);assert.equal(result.count,180);
  assert.equal(new Set(result.top.map(c=>c.receiver)).size,result.top.length);
  assert.equal(JSON.stringify(state),snapshot);
});
test('decelerating ball reaches stopping distance and cannot exceed it',()=>{
  assert.equal(model.ballTime(0,10),0);
  assert.equal(model.ballTime(50,10),10);
  assert.equal(model.ballTime(51,10),Infinity);
});
test('unowned ball yields no recommendations',()=>{
  const state=initial();state.owner=null;
  assert.equal(model.recommend(state).count,0);
});
test('offside position respects attack direction and own half',()=>{
  for(const team of ['blue','coral']){
    const state=initial(),owner=state.players.find(p=>p.team===team);
    const defenders=state.players.filter(p=>p.team!==team);
    defenders.forEach((p,i)=>p.x=team==='blue'?(i===0?100:80):(i===0?5:25));
    const receiver={x:team==='blue'?90:15};
    assert.equal(model.offside(receiver,owner,{x:52.5},state.players),true);
    receiver.x=team==='blue'?40:65;
    assert.equal(model.offside(receiver,owner,{x:52.5},state.players),false);
  }
});
test('moving a defender onto a fixed route reduces its interception margin',()=>{
  const state=initial();state.cfg.offside=false;
  const owner=state.players.find(p=>p.id===state.owner);
  owner.x=40;owner.y=34;state.ball={x:40.4,y:34};
  const receiver=state.players.find(p=>p.id==='blue-10');receiver.x=57;receiver.y=34;
  const defenders=state.players.filter(p=>p.team==='coral');
  defenders.forEach(p=>{p.x=90;p.y=5;});
  const candidate={receiver:receiver.id,target:{x:57,y:34,label:'To feet'},speed:16,foot:'right'};
  const before=model.evaluate(state,candidate);
  defenders[0].x=49;defenders[0].y=34;
  const after=model.evaluate(state,candidate);
  assert.ok(before.viable);
  assert.ok(after.routeMargin<before.routeMargin);
  assert.ok(after.issues.includes('Defender can contest the passing route'));
});
