const ReplayModel = (() => {
  const clone = value => JSON.parse(JSON.stringify(value));
  const bound = (n,max) => Math.max(0,Math.min(max,n));
  function generate(initialState, model, seed=73, count=18) {
    let value=seed>>>0;
    const random=()=>{value=(Math.imul(value,1664525)+1013904223)>>>0;return value/4294967296;};
    let board=clone(initialState), time=0;
    const decisions=[];
    for(let i=0;i<count;i++){
      const before=clone(board),owner=before.players.find(p=>p.id===before.owner);
      const candidates=model.candidates(before);
      // Independent scripted choice: forward targets are preferred, with some backward passes.
      const forward=candidates.filter(c=>(owner.team==='blue'?1:-1)*(c.target.x-before.ball.x)>0 && c.target.label==='To feet');
      const pool=forward.length&&random()<.75?forward:candidates;
      const selected=clone(pool[Math.floor(random()*pool.length)]);
      const assessed=model.evaluate(before,selected);
      const distance=Math.hypot(selected.target.x-before.ball.x,selected.target.y-before.ball.y);
      const near=before.players.filter(p=>p.team!==owner.team).sort((a,b)=>
        Math.hypot(a.x-selected.target.x,a.y-selected.target.y)-Math.hypot(b.x-selected.target.x,b.y-selected.target.y))[0];
      const pressure=Math.hypot(near.x-selected.target.x,near.y-selected.target.y)<5;
      // Toy outcome process, not a calibrated success model or a validation of the ranking.
      const reachable=Number.isFinite(assessed.flight)&&assessed.receiverArrival<=assessed.total;
      const complete=!assessed.isOffside && reachable && random() < Math.max(.2,.88-distance/180-(pressure?.22:0));
      const possibleInterception=assessed.routeMargin<=0 && Number.isFinite(assessed.flight);
      const outcome=assessed.isOffside?'offside':complete?'completed':possibleInterception?'intercepted':'incomplete';
      let duration=Number.isFinite(assessed.total)?Math.max(1,Math.ceil(assessed.total)):Math.ceil(selected.speed);
      const after=clone(before),receiver=after.players.find(p=>p.id===selected.receiver);
      let shot=null;
      if(complete){
        receiver.x=selected.target.x;receiver.y=selected.target.y;after.owner=receiver.id;after.ball={x:receiver.x,y:receiver.y};
        const depth=owner.team==='blue'?receiver.x:105-receiver.x;
        if(depth>70 && random()<.65)shot={id:`s${seed}-${i}-shot`,time:time+duration+3,player:receiver.id,team:owner.team,goal:random()<.22};
      }else{
        const defender=after.players.find(p=>p.id===(possibleInterception?assessed.critical.defender:near.id));
        const fraction=Math.min(1,(selected.speed**2/2)/Math.max(.001,distance));
        const recoveryPoint=possibleInterception?assessed.critical.point:{
          x:before.ball.x+(selected.target.x-before.ball.x)*fraction,
          y:before.ball.y+(selected.target.y-before.ball.y)*fraction};
        // Include recovery/restart time so a defender does not teleport across the pitch.
        duration=Math.max(duration,Math.ceil(model.arrival(defender,recoveryPoint,before.cfg,0))+1);
        defender.x=recoveryPoint.x;defender.y=recoveryPoint.y;
        after.owner=defender.id;after.ball={x:defender.x,y:defender.y};
      }
      const endTime=time+duration+(shot?3:0);
      decisions.push({id:`s${seed}-${i}`,time,endTime,type:'pass',team:owner.team,passer:owner.id,
        before,candidate:selected,outcome,shot,after:clone(after)});
      let restartGap=7;
      if(shot){
        const other=after.players.find(p=>p.team!==owner.team&&p.role===(shot.goal?'CM':'GK'));
        if(shot.goal){
          restartGap=Math.max(20,Math.ceil(model.arrival(other,{x:52.5,y:34},after.cfg,0))+2);
          other.x=52.5;other.y=34;
        }else restartGap=Math.max(12,Math.ceil(Math.hypot(other.x-after.ball.x,other.y-after.ball.y)/7)+3);
        after.owner=other.id;after.ball={x:other.x,y:other.y};
      }
      // Seven seconds of synthetic repositioning before the next decision snapshot.
      after.players.forEach(p=>{
        if(p.id!==after.owner){p.x=bound(p.x+(random()-.5)*8,105);p.y=bound(p.y+(random()-.5)*6,68);}
      });
      after.selected=after.owner;
      board=after;time=endTime+restartGap;
    }
    return {schemaVersion:1,seed,synthetic:true,decisions,
      assumptions:'Fictional snapshot sequence with recovery/restart timing. Toy pass outcomes constrained by ball reachability, receiver arrival and offside; stationary arrival model at each decision. No measured tracking or calibrated completion probabilities.'};
  }
  function observed(match,index,revealed) {
    return match.decisions.slice(0,index+(revealed?1:0));
  }
  function stats(events,player='all') {
    const passes=events.filter(e=>player==='all'||e.passer===player);
    const shots=events.flatMap(e=>e.shot?[e.shot]:[]).filter(s=>player==='all'||s.player===player);
    return {attempts:passes.length,completed:passes.filter(e=>e.outcome==='completed').length,
      interceptions:passes.filter(e=>e.outcome==='intercepted').length,
      shots:shots.length,goals:shots.filter(s=>s.goal).length};
  }
  return {generate,observed,stats};
})();
