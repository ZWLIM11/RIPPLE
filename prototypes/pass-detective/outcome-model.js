/* Pure experimental match scenarios. No trained probabilities or network calls. */
const OutcomeModel=(()=>{
  function number(x,min,max,name,integer=false){
    if(!Number.isFinite(x)||x<min||x>max||(integer&&!Number.isInteger(x)))throw Error(`Invalid ${name}.`);
    return x;
  }
  function validate(s){
    number(s.homeScore,0,50,'home score',true);number(s.awayScore,0,50,'away score',true);
    number(s.stoppage,0,30,'stoppage time');number(s.minute,0,90+s.stoppage,'match minute');
    number(s.homeRate,0,10,'home goals per 90');number(s.awayRate,0,10,'away goals per 90');
    if(!['home','away'].includes(s.side))throw Error('Choose home or away.');
    return s;
  }
  function poisson(mu){
    // mu <= 13.34 under input bounds. Sum until omitted mass <= 1e-12.
    const p=[Math.exp(-mu)];let sum=p[0];
    for(let k=1;1-sum>1e-12&&k<150;k++){p.push(p[k-1]*mu/k);sum+=p[k];}
    return {p:p.map(v=>v/sum),tail:Math.max(0,1-sum)};
  }
  function outcome(s){
    validate(s);const remaining=90+s.stoppage-s.minute;
    const h=poisson(s.homeRate*remaining/90),a=poisson(s.awayRate*remaining/90);
    let home=0,draw=0,away=0;
    h.p.forEach((ph,i)=>a.p.forEach((pa,j)=>{const d=s.homeScore+i-s.awayScore-j;if(d>0)home+=ph*pa;else if(d<0)away+=ph*pa;else draw+=ph*pa;}));
    const sum=home+draw+away;
    return {win:(s.side==='home'?home:away)/sum,draw:draw/sum,loss:(s.side==='home'?away:home)/sum,remaining,tailBound:h.tail+a.tail};
  }
  function percentages(o){
    const raw=[o.win,o.draw,o.loss].map(v=>v*1000),units=raw.map(Math.floor);
    const order=[0,1,2].sort((a,b)=>(raw[b]-units[b])-(raw[a]-units[a]));
    const missing=1000-units.reduce((a,b)=>a+b,0);
    for(let n=0;n<missing;n++)units[order[n%3]]++;
    return units.map(v=>v/10);
  }
  function shot(state,point,team){
    const gx=team==='blue'?105:0,dx=Math.abs(gx-point.x),dy=34-point.y;
    const distance=Math.hypot(dx,dy);
    const angle=Math.abs(Math.atan2(7.32*dx,dx*dx+(30.34-point.y)*(37.66-point.y)));
    const opponents=state.players.filter(p=>p.team!==team);
    const pressure=opponents.length?Math.min(...opponents.map(p=>Math.hypot(p.x-point.x,p.y-point.y))):null;
    const blockers=opponents.filter(p=>{const vx=gx-point.x,vy=dy,len=vx*vx+vy*vy;
      if(!len)return false;const t=((p.x-point.x)*vx+(p.y-point.y)*vy)/len;
      return t>0&&t<1&&Math.hypot(p.x-point.x-t*vx,p.y-point.y-t*vy)<1.5;}).length;
    const keeper=opponents.find(p=>p.role==='GK');
    const score=100*Math.max(0,Math.min(1,.5*Math.exp(-distance/25)+.3*Math.min(1,angle/(Math.PI/3))+.2*Math.min(1,(pressure??0)/8)-.12*blockers));
    return {distance,angleDegrees:angle*180/Math.PI,pressure,blockers,keeperDistance:keeper?Math.hypot(keeper.x-point.x,keeper.y-point.y):null,score};
  }
  function scenario(s,kind,p){
    validate(s);if(!['pass','shot','keep'].includes(kind))throw Error('Unknown action.');
    for(const key of ['success','creation','goal','counter'])number(p[key],0,1,key);
    number(p.seconds,1,120,'action window');
    const base=outcome(s);if(base.remaining*60<p.seconds)throw Error('Action window exceeds remaining match time.');
    const after={...s,minute:s.minute+p.seconds/60};
    const scoring=s.side==='home'?'homeScore':'awayScore',conceding=s.side==='home'?'awayScore':'homeScore';
    const own=kind==='keep'?0:kind==='shot'?p.goal:p.success*p.creation*p.goal;
    const failure=kind==='shot'?1-p.goal:1-p.success;
    const branches=kind==='keep'?[
      {label:'Possession retained, no shot',probability:p.success,delta:0},
      {label:'Turnover, no opponent goal',probability:(1-p.success)*(1-p.counter),delta:0},
      {label:'Turnover followed by opponent goal',probability:(1-p.success)*p.counter,delta:-1}
    ]:[
      {label:'Goal scored',probability:own,delta:1},
      {label:kind==='pass'?'Completed pass, no shot':'Shot does not score; no counter goal',probability:kind==='pass'?p.success*(1-p.creation):failure*(1-p.counter),delta:0},
      ...(kind==='pass'?[{label:'Completed pass, shot does not score',probability:p.success*p.creation*(1-p.goal),delta:0},
        {label:'Failed pass, no counter goal',probability:failure*(1-p.counter),delta:0}]:[]),
      {label:'Failure followed by counter goal',probability:failure*p.counter,delta:-1}
    ];
    let expected=0;
    for(const b of branches){const next={...after};if(b.delta===1)next[scoring]++;if(b.delta===-1)next[conceding]++;
      // Internal branch scores may exceed the input score cap by one.
      if(next.homeScore>50||next.awayScore>50)throw Error('Scenario score exceeds supported range.');
      b.win=outcome(next).win;expected+=b.probability*b.win;}
    return {baseline:base.win,expected,wpa:expected-base.win,immediateGoal:own,branches};
  }
  function trajectory(a,b,{speed=16,curve=0,height=0,vx=0,vy=0}={}){
    for(const p of [a,b]){number(p.x,0,105,'position x');number(p.y,0,68,'position y');}
    number(speed,1,35,'ball speed');number(curve,-15,15,'curve');number(height,0,15,'height');number(vx,-10,10,'velocity x');number(vy,-10,10,'velocity y');
    const dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy);if(d<.1)throw Error('Choose different start and target positions.');
    const points=[];let length=0;
    for(let i=0;i<=100;i++){const t=i/100,bend=4*curve*t*(1-t);const p={x:a.x+dx*t-dy/d*bend,y:a.y+dy*t+dx/d*bend,z:4*height*t*(1-t)};if(i){const prev=points[i-1];length+=Math.hypot(p.x-prev.x,p.y-prev.y);}points.push(p);}
    // A loft uses ballistic airtime; speed is only the ground-route horizontal speed.
    const duration=height>0?Math.sqrt(8*height/9.81):length/speed;
    return {points,length,duration,horizontalSpeed:length/duration,receiverAfter:{x:b.x+vx*duration,y:b.y+vy*duration},receiverShift:Math.hypot(vx,vy)*duration,
      outsidePitch:points.some(p=>p.x<0||p.x>105||p.y<0||p.y>68)};
  }
  return {validate,outcome,percentages,shot,scenario,trajectory};
})();
