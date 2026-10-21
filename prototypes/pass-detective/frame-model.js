/* Local image assistance. No learned detector or completion probability. */
const FrameModel=(()=>{
  const regions={full:[0,0,105,68],leftHalf:[0,0,52.5,68],rightHalf:[52.5,0,105,68],leftBox:[0,13.84,16.5,54.16],rightBox:[88.5,13.84,105,54.16]};
  function project(corners,point,region){
    const r=regions[region];if(!r)throw Error('Unknown pitch region.');
    const p=SnapshotModel.project(SnapshotModel.calibrate(corners),point);
    return {x:r[0]+p.x/105*(r[2]-r[0]),y:r[1]+p.y/68*(r[3]-r[1])};
  }
  function lane(a,b,opponents){
    const dx=b.x-a.x,dy=b.y-a.y,distance=Math.hypot(dx,dy);
    if(distance<.1)throw Error('Choose two distinct positions.');
    let clearance=null;
    for(const p of opponents){const t=((p.x-a.x)*dx+(p.y-a.y)*dy)/(distance*distance);if(t<0||t>1)continue;
      const d=Math.hypot(p.x-a.x-t*dx,p.y-a.y-t*dy);clearance=clearance===null?d:Math.min(clearance,d);}
    return {distance,clearance};
  }
  function blobs(data,width,height,color,tolerance=65){
    const mask=new Uint8Array(width*height),visited=new Uint8Array(width*height),out=[];
    for(let i=0;i<mask.length;i++){const j=i*4,r=data[j],g=data[j+1],b=data[j+2];
      mask[i]=data[j+3]>128&&Math.max(r,g,b)-Math.min(r,g,b)>35&&Math.hypot(r-color[0],g-color[1],b-color[2])<tolerance?1:0;}
    for(let i=0;i<mask.length;i++)if(mask[i]&&!visited[i]){
      const queue=[i];visited[i]=1;let sumX=0,sumY=0,maxY=0;
      for(let k=0;k<queue.length;k++){const n=queue[k],x=n%width,y=Math.floor(n/width);sumX+=x;sumY+=y;maxY=Math.max(maxY,y);
        for(const m of [x>0?n-1:-1,x<width-1?n+1:-1,y>0?n-width:-1,y<height-1?n+width:-1])if(m>=0&&mask[m]&&!visited[m]){visited[m]=1;queue.push(m);}}
      if(queue.length>=5&&queue.length<width*height*.008)out.push({x:(sumX/queue.length+.5)/width,y:(sumY/queue.length+.5)/height,size:queue.length});
    }return out.sort((a,b)=>b.size-a.size).slice(0,30);
  }
  return {regions,project,lane,blobs};
})();
