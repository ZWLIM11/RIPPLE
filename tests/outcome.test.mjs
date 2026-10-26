import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {initial} from '../model-loader.mjs';
const M=vm.runInNewContext(readFileSync(new URL('../prototypes/pass-detective/outcome-model.js',import.meta.url),'utf8')+'\nOutcomeModel');
const base={homeScore:1,awayScore:1,minute:80,stoppage:0,homeRate:1.5,awayRate:1.5,side:'home'};
test('motion lab separates curved path, ballistic airtime and assumed receiver motion',()=>{
  const a={x:20,y:34},b={x:40,y:34};
  const flat=M.trajectory(a,b,{speed:10});assert.ok(Math.abs(flat.duration-2)<1e-10);
  const bend=M.trajectory(a,b,{speed:10,curve:5});assert.ok(bend.length>flat.length);
  const loft=M.trajectory(a,b,{height:4.905,vx:2});assert.equal(loft.duration,2);assert.equal(loft.receiverShift,4);
  assert.equal(loft.points[0].z,0);assert.equal(loft.points[100].z,0);
  assert.throws(()=>M.trajectory(a,b,{height:-1}));assert.throws(()=>M.trajectory(a,a));
});
test('Poisson normalized, symmetric and stable at extremes',()=>{
  for(const minute of [0,80,90])for(const rate of [0,1.5,10]){
    const o=M.outcome({...base,minute,homeRate:rate,awayRate:rate});
    assert.ok(Math.abs(o.win+o.draw+o.loss-1)<1e-12);assert.ok(Math.abs(o.win-o.loss)<1e-12);
    assert.ok(o.tailBound<3e-12);assert.equal(Math.round(M.percentages(o).reduce((a,b)=>a+b,0)*10),1000);
  }
});
test('full time deterministic, added time respected, scores affect result',()=>{
  assert.equal(M.outcome({...base,minute:90}).draw,1);
  assert.equal(M.outcome({...base,minute:90,homeScore:2}).win,1);
  assert.equal(M.outcome({...base,minute:90,homeScore:2,side:'away'}).loss,1);
  assert.ok(M.outcome({...base,minute:90,stoppage:5}).draw<1);
  assert.ok(M.outcome({...base,homeScore:2}).win>M.outcome(base).win);
});
test('invalid and missing values rejected',()=>{
  for(const patch of [{minute:91},{homeRate:-1},{homeScore:1.5},{awayRate:NaN},{stoppage:Infinity},{side:'blue'}])assert.throws(()=>M.outcome({...base,...patch}));
  assert.throws(()=>M.scenario(base,'pass',{}));
});
test('pass branches normalize and include adverse outcomes without mutating state',()=>{
  const p={success:.75,creation:.3,goal:.1,counter:.2,seconds:15},before=JSON.stringify(base);
  const r=M.scenario(base,'pass',p);
  assert.ok(Math.abs(r.branches.reduce((s,b)=>s+b.probability,0)-1)<1e-12);
  assert.ok(Math.abs(r.immediateGoal-.0225)<1e-12);
  assert.ok(r.branches.find(b=>b.delta===-1).probability>0);
  assert.ok(M.scenario(base,'pass',{...p,counter:0}).wpa>r.wpa);
  assert.equal(JSON.stringify(base),before);
});
test('shot extremes and action window replace the immediate interval',()=>{
  const p={success:1,creation:1,goal:1,counter:0,seconds:15};
  const s={...base,minute:89.75};
  assert.equal(M.scenario(s,'shot',p).expected,1);
  assert.equal(M.scenario(s,'shot',{...p,goal:0,counter:1}).expected,0);
  assert.throws(()=>M.scenario({...base,minute:90},'shot',p));
  assert.throws(()=>M.scenario(base,'shot',{...p,goal:1.1}));
});
test('shot heuristic responds to pressure and respects attack direction',()=>{
  const s=initial(),q={x:90,y:34},a=M.shot(s,q,'blue');
  const mirror={players:s.players.map(p=>({...p,x:105-p.x,team:p.team==='blue'?'coral':'blue'}))};
  assert.ok(Math.abs(M.shot(mirror,{x:15,y:34},'coral').score-a.score)<1e-10);
  s.players.find(p=>p.id==='coral-2').x=91;s.players.find(p=>p.id==='coral-2').y=34;
  assert.ok(M.shot(s,q,'blue').score<a.score);
});

test('keep possession has exhaustive retention and turnover branches, no invented own goal',()=>{
 const p={success:.8,creation:0,goal:0,counter:.2,seconds:15};
 const r=M.scenario(base,'keep',p);assert.equal(r.immediateGoal,0);
 assert.ok(Math.abs(r.branches.reduce((s,b)=>s+b.probability,0)-1)<1e-12);
 assert.ok(Math.abs(r.branches[2].probability-.04)<1e-12);
 assert.equal(r.branches[0].win,r.branches[1].win);
 assert.ok(M.scenario(base,'keep',{...p,success:1}).expected>r.expected);
 assert.equal(M.scenario({...base,homeScore:2,minute:89.75},'keep',{...p,success:1}).expected,1);
 assert.equal(M.scenario({...base,minute:89.75},'keep',{...p,success:1}).expected,0);
 assert.throws(()=>M.scenario({...base,minute:90},'keep',p));
 assert.throws(()=>M.scenario(base,'keep',{...p,success:-.1}));
});

test('score guidance follows analysed side, preserves manual intent and handles full time',()=>{
 assert.equal(M.guidance(base).mode,'off');
 assert.equal(M.guidance(base,'auto').chosen,'win');
 assert.equal(M.guidance({...base,homeScore:2},'auto').chosen,'protect');
 assert.equal(M.guidance({...base,homeScore:2,side:'away'},'auto').chosen,'equalise');
 assert.match(M.guidance({...base,homeScore:0},'protect').text,/manual intention differs/);
 assert.equal(M.guidance({...base,minute:90},'auto').title,'Full time');
 assert.notEqual(M.guidance({...base,minute:90,stoppage:5},'auto').title,'Full time');
 assert.throws(()=>M.guidance(base,'unknown'));
});
