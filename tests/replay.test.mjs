import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const dir=new URL('../prototypes/pass-detective/',import.meta.url);
const html=readFileSync(new URL('index.html',dir),'utf8');
const script=html.match(/<script id="passing-model">([\s\S]*?)<\/script>/)[1];
const board=html.match(/<script id="board-ui">([\s\S]*?)<\/script>/)[1];
const passing=vm.runInNewContext(script+'\nPassingModel');
const initial=vm.runInNewContext(board.slice(board.indexOf('const roles='),board.indexOf('let state='))+'\ninitial');
const replay=vm.runInNewContext(readFileSync(new URL('replay-model.js',dir),'utf8')+'\nReplayModel');
const match=replay.generate(initial(),passing);
test('demo includes completed passes and possession changes',()=>{
  assert.ok(match.decisions.some(e=>e.outcome==='completed'));
  assert.ok(match.decisions.some(e=>e.outcome!=='completed'));
});
test('synthetic replay is reproducible and leaves the source board untouched',()=>{
  const start=initial(),saved=JSON.stringify(start);
  assert.equal(JSON.stringify(match),JSON.stringify(replay.generate(start,passing)));
  assert.equal(JSON.stringify(start),saved);assert.equal(match.decisions.length,18);
});
test('decision snapshots preserve legal coordinates and possession continuity',()=>{
  match.decisions.forEach((e,i)=>{
    const owner=e.before.players.find(p=>p.id===e.before.owner);
    assert.ok(Math.hypot(owner.x-e.before.ball.x,owner.y-e.before.ball.y)<=2);
    assert.equal(e.passer,e.before.owner);
    e.before.players.forEach(p=>assert.ok(p.x>=0&&p.x<=105&&p.y>=0&&p.y<=68));
    assert.ok(e.endTime>e.time);
    if(i)assert.ok(e.time>match.decisions[i-1].endTime);
  });
});
test('observation boundary excludes hidden and later outcomes from recap and export',()=>{
  assert.equal(replay.observed(match,0,false).length,0);
  assert.equal(replay.observed(match,0,true).length,1);
  assert.equal(replay.observed(match,4,false).length,4);
  const stats=replay.stats(replay.observed(match,0,false));
  assert.equal(stats.attempts,0);assert.equal(stats.goals,0);
});
test('player focus distinguishes passer activity and receiver shots',()=>{
  const events=[{passer:'blue-8',outcome:'completed',shot:{player:'blue-9',goal:true}}];
  assert.equal(replay.stats(events,'blue-8').attempts,1);
  assert.equal(replay.stats(events,'blue-8').shots,0);
  assert.equal(replay.stats(events,'blue-9').goals,1);
});
