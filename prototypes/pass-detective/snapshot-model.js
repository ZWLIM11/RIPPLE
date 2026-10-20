/* Pure snapshot validation and projective geometry. No image leaves the device. */
const SnapshotModel = (() => {
  const finite = (v,a,b) => typeof v==='number' && Number.isFinite(v) && v>=a && v<=b;
  function validate(input, reference) {
    if(!input || input.schemaVersion!==1 || input.kind!=='pass-detective-board')throw Error('Unsupported snapshot format.');
    const s=input.state;
    if(!s || !Array.isArray(s.players) || s.players.length!==22)throw Error('A snapshot must contain all 22 players.');
    const ids=new Set();
    const players=s.players.map(p=>{
      const known=reference.players.find(r=>r.id===p.id);
      if(!known || ids.has(p.id) || p.team!==known.team)throw Error('Player identities or teams do not match this board.');
      ids.add(p.id);
      if(!finite(p.x,0,105)||!finite(p.y,0,68)||!finite(p.facing,0,359)||!finite(p.weak,.35,1)||!['left','right'].includes(p.preferred))
        throw Error('Invalid player position, facing or foot ability.');
      return {...known,x:p.x,y:p.y,facing:p.facing,weak:p.weak,preferred:p.preferred};
    });
    if(!s.ball || !finite(s.ball.x,0,105)||!finite(s.ball.y,0,68))throw Error('Invalid ball position.');
    if(s.owner!==null && !ids.has(s.owner))throw Error('Invalid passer.');
    if(!ids.has(s.selected)||!['safe','attack'].includes(s.objective))throw Error('Invalid selection or objective.');
    if(!s.cfg||!finite(s.cfg.reaction,.1,.8)||!finite(s.cfg.acceleration,1.5,5)||!finite(s.cfg.maxSpeed,4,9)||typeof s.cfg.offside!=='boolean')
      throw Error('Invalid movement assumptions.');
    const owner=players.find(p=>p.id===s.owner);
    if(owner && Math.hypot(owner.x-s.ball.x,owner.y-s.ball.y)>2)throw Error('The passer must be within 2 metres of the ball.');
    return {players,ball:{x:s.ball.x,y:s.ball.y},owner:s.owner,selected:s.selected,objective:s.objective,
      cfg:{reaction:s.cfg.reaction,acceleration:s.cfg.acceleration,maxSpeed:s.cfg.maxSpeed,offside:s.cfg.offside}};
  }
  function calibrate(corners) {
    if(corners.length!==4)throw Error('Mark all four pitch corners.');
    // Input order must form a convex quadrilateral, preventing crossing/collinear calibration.
    const crosses=corners.map((p,i)=>{
      const q=corners[(i+1)%4],r=corners[(i+2)%4];
      return (q.x-p.x)*(r.y-q.y)-(q.y-p.y)*(r.x-q.x);
    });
    if(crosses.some(v=>Math.abs(v)<1e-5)||!crosses.every(v=>Math.sign(v)===Math.sign(crosses[0])))
      throw Error('Corners must follow the pitch perimeter without crossing.');
    const target=[[0,0],[105,0],[105,68],[0,68]], rows=[];
    corners.forEach(({x,y},i)=>{
      const [u,v]=target[i];
      rows.push([x,y,1,0,0,0,-u*x,-u*y,u],[0,0,0,x,y,1,-v*x,-v*y,v]);
    });
    for(let col=0;col<8;col++){
      let pivot=col;
      for(let r=col+1;r<8;r++)if(Math.abs(rows[r][col])>Math.abs(rows[pivot][col]))pivot=r;
      [rows[col],rows[pivot]]=[rows[pivot],rows[col]];
      const divisor=rows[col][col];if(Math.abs(divisor)<1e-10)throw Error('Pitch calibration is degenerate.');
      for(let k=col;k<=8;k++)rows[col][k]/=divisor;
      for(let r=0;r<8;r++)if(r!==col){const f=rows[r][col];for(let k=col;k<=8;k++)rows[r][k]-=f*rows[col][k];}
    }
    return rows.map(r=>r[8]);
  }
  function project(h,p) {
    const d=h[6]*p.x+h[7]*p.y+1;
    if(Math.abs(d)<1e-9)throw Error('Point cannot be mapped.');
    const x=(h[0]*p.x+h[1]*p.y+h[2])/d,y=(h[3]*p.x+h[4]*p.y+h[5])/d;
    if(!finite(x,-.01,105.01)||!finite(y,-.01,68.01))throw Error('Click inside the calibrated pitch.');
    return {x:Math.max(0,Math.min(105,x)),y:Math.max(0,Math.min(68,y))};
  }
  return {validate,calibrate,project};
})();
