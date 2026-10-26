const snapshotPanel=document.createElement('section');
snapshotPanel.className='panel wide';
snapshotPanel.innerHTML=`<h2>Import a match snapshot</h2>
<p class="fine">Upload a full-pitch screenshot, calibrate its four corners, and mark player and ball positions.
This is manual screenshot mapping—not automatic detection. A single image cannot establish movement, facing, foot ability or actual possession.</p>
<div class="toolbar"><label>Screenshot (PNG / JPEG / WebP)<input id="snapshotImage" type="file" accept="image/png,image/jpeg,image/webp"></label>
<button id="saveBoard">Save board JSON</button><label>Load board JSON<input id="snapshotJSON" type="file" accept=".json,application/json"></label></div>
<div id="imageWorkspace" hidden>
<p class="notice">Use a view showing all four pitch corners and all 22 players. Cropped broadcast frames are not supported.
Orient the corners so Blue attacks toward the right side of the imported board. Positions are approximate; camera distortion is not corrected.</p>
<p id="mappingInstruction" aria-live="polite"></p>
<div class="toolbar"><select id="mappingTarget" aria-label="Player or ball to mark"></select><button id="resetCalibration">Restart calibration</button><button id="undoMark">Undo last mark</button><button id="applyImage" class="primary" disabled>Apply mapped snapshot</button></div>
<canvas id="snapshotCanvas" style="display:block;width:100%;max-width:1100px;height:auto;border-radius:8px;cursor:crosshair;touch-action:none" aria-label="Screenshot mapping canvas. Click the requested corner or player position."></canvas>
<p class="fine">Click each player’s ground contact point (feet), not their head. Choose the team and shirt in the selector before clicking; the selector advances automatically.
All 22 players plus the ball are required. Unseen players must not be guessed. Existing facing, foot settings and movement assumptions are retained for you to review.</p>
</div><p id="snapshotStatus" class="status" aria-live="polite">Manual mapping stays on your device. Optional AI suggestions send a resized image only when requested. Board files contain coordinates, not the image.</p>`;
document.querySelector('.layout').prepend(snapshotPanel);
let snapshotImage=null,calibration=[],mappedPoints=new Map(),mappingHistory=[],imageLoadVersion=0;
const cornerNames=['Blue defensive end / upper touchline','Blue attacking end / upper touchline','Blue attacking end / lower touchline','Blue defensive end / lower touchline'];
const mappingIds=[...initial().players.map(p=>p.id),'ball'];
$('mappingTarget').innerHTML=initial().players.map(p=>`<option value="${p.id}">${p.team} #${p.number} · ${p.role}</option>`).join('')+'<option value="ball">Ball</option>';
function snapshotStatus(text){$('snapshotStatus').textContent=text;}
function drawMapping(){
  if(!snapshotImage)return;
  const canvas=$('snapshotCanvas'),ctx=canvas.getContext('2d');
  ctx.drawImage(snapshotImage,0,0,canvas.width,canvas.height);
  const mark=(p,label,color)=>{
    const x=p.x*canvas.width,y=p.y*canvas.height;
    ctx.beginPath();ctx.arc(x,y,7,0,Math.PI*2);ctx.fillStyle=color;ctx.fill();
    ctx.strokeStyle='#111';ctx.lineWidth=2;ctx.stroke();
    ctx.font='bold 15px system-ui';ctx.lineWidth=4;ctx.strokeText(label,x+11,y-9);ctx.fillText(label,x+11,y-9);
  };
  calibration.forEach((p,i)=>mark(p,String(i+1),'#ffe082'));
  if(calibration.length===4){
    ctx.beginPath();calibration.forEach((p,i)=>i?ctx.lineTo(p.x*canvas.width,p.y*canvas.height):ctx.moveTo(p.x*canvas.width,p.y*canvas.height));
    ctx.closePath();ctx.strokeStyle='#ffe082';ctx.lineWidth=2;ctx.stroke();
  }
  for(const [id,p]of mappedPoints)mark(p,id,id==='ball'?'white':id.startsWith('blue')?'#64acff':'#ff9b8c');
  $('mappingInstruction').textContent=calibration.length<4?`Corner ${calibration.length+1}/4: click ${cornerNames[calibration.length]}.`:
    `${mappedPoints.size}/23 positions marked. Click ${$('mappingTarget').selectedOptions[0].textContent}.`;
  $('mappingTarget').disabled=calibration.length<4;
  $('applyImage').disabled=calibration.length!==4||mappedPoints.size!==23;
  $('undoMark').disabled=!calibration.length;
}
async function loadSnapshotFile(file){
  if(!file)return;
  if(replayActive){snapshotStatus('Exit replay before loading an image.');return;}
  const version=++imageLoadVersion;
  if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>15*1024*1024){snapshotStatus('Choose PNG, JPEG or WebP up to 15 MB.');return;}
  const url=URL.createObjectURL(file),img=new Image();
  try{
    img.src=url;await img.decode();if(version!==imageLoadVersion)return;
    if(img.naturalWidth<100||img.naturalHeight<100||img.naturalWidth*img.naturalHeight>40000000)throw Error('Use an image between 100×100 and 40 megapixels.');
    snapshotImage=img;calibration=[];mappedPoints.clear();mappingHistory=[];
    const scale=Math.min(1,1400/img.naturalWidth);
    $('snapshotCanvas').width=Math.round(img.naturalWidth*scale);$('snapshotCanvas').height=Math.round(img.naturalHeight*scale);
    $('imageWorkspace').hidden=false;drawMapping();snapshotStatus('Image loaded locally. Mark the pitch corners in the requested order.');
  }catch(error){snapshotStatus(`Image not loaded: ${error.message}`);}
  finally{URL.revokeObjectURL(url);}
}
$('snapshotImage').onchange=async e=>{
  await loadSnapshotFile(e.target.files[0]);e.target.value='';
};
$('mappingTarget').onchange=drawMapping;
function markSnapshotPoint(p){
  if(!snapshotImage)return;
  if(replayActive){snapshotStatus('Exit replay before editing screenshot positions.');return;}
  try{
    if(!Number.isFinite(p.x)||!Number.isFinite(p.y)||p.x<0||p.x>1||p.y<0||p.y>1)throw Error('Choose a position within the image.');
    if(calibration.length<4){
      const next=[...calibration,p];if(next.length===4)SnapshotModel.calibrate(next);calibration=next;
    }else{
      SnapshotModel.project(SnapshotModel.calibrate(calibration),p);
      const id=$('mappingTarget').value;mappingHistory.push({id,old:mappedPoints.get(id)});
      mappedPoints.set(id,p);const next=mappingIds.find(id=>!mappedPoints.has(id));if(next)$('mappingTarget').value=next;
    }
    drawMapping();snapshotStatus('');
  }catch(error){snapshotStatus(error.message);}
}
$('snapshotCanvas').onclick=e=>{
  const box=e.currentTarget.getBoundingClientRect();
  markSnapshotPoint({x:(e.clientX-box.left)/box.width,y:(e.clientY-box.top)/box.height});
};
$('undoMark').onclick=()=>{
  const last=mappingHistory.pop();
  if(last){if(last.old)mappedPoints.set(last.id,last.old);else mappedPoints.delete(last.id);$('mappingTarget').value=last.id;}
  else calibration.pop();
  drawMapping();
};
$('resetCalibration').onclick=()=>{calibration=[];mappedPoints.clear();mappingHistory=[];drawMapping();};
function applySnapshot(next){
  state=next;routeKey=null;inspectReceiver=null;placing=false;drag=null;
  $('place').textContent='Place ball: off';$('place').classList.remove('active');
  // Imported boards become free play; reset restores the normal initial board.
  scene='free';$('free').classList.add('active');document.querySelectorAll('[data-scene]').forEach(b=>b.classList.remove('active'));
  $('walkthrough').textContent='Imported snapshot: review possession and player assumptions before using recommendations.';
  $('steps').replaceChildren();pinnedPass=null;render();
}
$('applyImage').onclick=()=>{
  try{
    if(replayActive)throw Error('Exit replay before importing a snapshot.');
    if(mappedPoints.size!==23)throw Error('Mark every player and the ball first.');
    const next=structuredClone(state),h=SnapshotModel.calibrate(calibration);
    next.players=next.players.map(p=>({...p,...SnapshotModel.project(h,mappedPoints.get(p.id))}));
    next.ball=SnapshotModel.project(h,mappedPoints.get('ball'));next.owner=null;
    applySnapshot(SnapshotModel.validate({schemaVersion:1,kind:'pass-detective-board',state:next},initial()));
    snapshotStatus('Positions applied. Possession is unassigned: select the observed passer and choose Make passer. Review facing, foot ability and movement assumptions.');
    $('status').textContent='Imported image positions. Assign possession before analysis.';
  }catch(error){snapshotStatus(`Snapshot not applied: ${error.message}`);}
};
$('saveBoard').onclick=()=>{
  const payload={schemaVersion:1,kind:'pass-detective-board',state:structuredClone(state),
    interpretation:'User-supplied board assumptions and coordinates; not a measured or verified match state.'};
  const url=URL.createObjectURL(new Blob([JSON.stringify(payload,null,2)],{type:'application/json'})),a=document.createElement('a');
  a.href=url;a.download='pass-detective-board.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
};
$('snapshotJSON').onchange=async e=>{
  const file=e.target.files[0];if(!file)return;
  const version=++imageLoadVersion;
  try{
    if(file.size>250000)throw Error('Board file exceeds 250 KB.');
    const next=SnapshotModel.validate(JSON.parse(await file.text()),initial());
    if(version!==imageLoadVersion)return;
    if(replayActive)throw Error('Exit replay before importing a snapshot.');
    applySnapshot(next);snapshotStatus('Board snapshot restored. Review its assumptions before analysis.');
  }catch(error){snapshotStatus(`Board not loaded: ${error.message}`);}
  finally{e.target.value='';}
};
