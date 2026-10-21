(()=>{
  const paste=document.createElement('div');paste.className='share-board';paste.id='pasteFrame';paste.tabIndex=0;
  paste.innerHTML='<h3>Capture a moment. Explore the options.</h3><p>Copy a screenshot, then press Ctrl+V (⌘V on Mac) here, or upload an image below. On a phone, save the screenshot and upload it. Everything in the local colour assistant stays on this device.</p><button id="pasteScreenshot">Paste screenshot</button><p id="pasteStatus" role="status"></p>';
  snapshotPanel.querySelector('h2').after(paste);
  async function accept(file){await loadSnapshotFile(file);}
  document.addEventListener('paste',e=>{
    if(RippleWorkspace.view!=='snapshot'||e.target.closest?.('input,textarea,[contenteditable="true"]'))return;
    const item=[...(e.clipboardData?.items||[])].find(i=>i.kind==='file'&&i.type.startsWith('image/'));
    if(item){e.preventDefault();accept(item.getAsFile());}
  });
  $('pasteScreenshot').onclick=async()=>{
    try{
      if(!navigator.clipboard?.read)throw Error();
      const items=await navigator.clipboard.read();
      for(const item of items){const type=item.types.find(t=>['image/png','image/jpeg','image/webp'].includes(t));if(type){await accept(await item.getType(type));$('pasteStatus').textContent='Clipboard image received.';return;}}
      $('pasteStatus').textContent='No image found. Copy the screenshot itself, or use Upload.';
    }catch{$('pasteStatus').textContent='Clipboard access unavailable. Focus this box and press Ctrl+V / ⌘V, or upload the saved screenshot.';}
  };
  const region=document.createElement('div');region.className='mapping-assist';
  region.innerHTML='<label for="frameRegion">What area can you calibrate?</label><select id="frameRegion"><option value="full">Entire pitch · full board</option><option value="leftHalf">Left half · visible positions only</option><option value="rightHalf">Right half · visible positions only</option><option value="leftBox">Left penalty area · visible positions only</option><option value="rightBox">Right penalty area · visible positions only</option></select><p>Mark the four corners of the selected rectangle in order: upper-left, upper-right, lower-right, lower-left, with Blue attacking right. Use actual pitch-line intersections, not the image edges. All four must be visible. Standard 105 × 68 m pitch dimensions are assumed. If the landmarks are missing, use another frame.</p><p id="frameCoverage" role="status"></p>';
  $('imageWorkspace').prepend(region);
  snapshotPanel.querySelector('p.fine').textContent='Upload or paste a screenshot. Calibrate a visible pitch rectangle, then review player positions. A single frame cannot establish movement, facing, foot ability or actual possession. This is an exploratory tool, not a live pass-success predictor.';
  $('imageWorkspace').querySelector('p.notice').textContent='Full-board mode needs the whole pitch and every player. Partial mode analyses only marked positions inside the chosen rectangle; unseen players stay unknown. It cannot rank passes as safe or estimate completion rates.';
  $('snapshotCanvas').parentElement.nextElementSibling.textContent='Mark player ground contact points (feet), not heads. Assign team and player labels manually. Full-board import needs all 22 players and the ball. In partial mode, mark only identifiable players inside the calibrated rectangle; leave everyone else unknown. Review retained movement and foot assumptions before using full-board rankings.';
  const oldDraw=drawMapping;
  drawMapping=function(){
    oldDraw();const partial=$('frameRegion').value!=='full';
    if(partial){$('applyImage').disabled=true;if(calibration.length<4)$('mappingInstruction').textContent=`Region corner ${calibration.length+1}/4: ${['upper-left','upper-right','lower-right','lower-left'][calibration.length]}.`;}
    const known=[...mappedPoints.keys()].filter(id=>id!=='ball').length;
    $('frameCoverage').textContent=`${known} / 22 players marked; ${22-known} unknown. `+(partial?'Partial view: no full-board import, safety ranking or completion percentage.':'Mark all players and the ball to import a full board.');
    refreshVisible();
  };
  $('frameRegion').onchange=()=>{imageLoadVersion++;calibration=[];mappedPoints.clear();mappingHistory=[];drawMapping();};
  const apply=$('applyImage').onclick;$('applyImage').onclick=()=>{if($('frameRegion').value!=='full'){snapshotStatus('Partial frames cannot replace the full board. Use visible-position analysis below.');return;}apply();};
  const lock=lockReplay;lockReplay=function(active){lock(active);$('frameRegion').disabled=active;$('pasteScreenshot').disabled=active;if($('frameRegion').value!=='full')$('applyImage').disabled=true;};
  const localAssist=document.createElement('div');localAssist.className='challenge-panel';
  localAssist.innerHTML='<h3>Find kit-colour regions locally</h3><p>Experimental colour matching, not a trained player detector. Choose a kit colour and scan. Each numbered region may be a shirt, sign, crowd or graphic. Locate it, select the correct team/player, then place their feet manually. Shirt numbers and ball position are never guessed. White, black and similar kits may not work.</p><div class="toolbar"><label for="kitColor">Kit colour</label><input id="kitColor" type="color" value="#398bff"><button id="scanKits">Find colour regions</button></div><p id="kitStatus" role="status"></p><div id="kitCandidates" class="toolbar"></div>';
  $('imageWorkspace').append(localAssist);
  $('scanKits').onclick=()=>{
    if(!snapshotImage||replayActive)return;
    const source=snapshotImage,version=imageLoadVersion,c=document.createElement('canvas'),scale=Math.min(480/$('snapshotCanvas').width,480/$('snapshotCanvas').height);c.width=Math.max(1,Math.round($('snapshotCanvas').width*scale));c.height=Math.max(1,Math.round($('snapshotCanvas').height*scale));
    const ctx=c.getContext('2d');ctx.drawImage(source,0,0,c.width,c.height);
    const hex=$('kitColor').value,color=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));
    const candidates=FrameModel.blobs(ctx.getImageData(0,0,c.width,c.height).data,c.width,c.height,color);
    $('kitCandidates').replaceChildren();$('kitStatus').textContent=`${candidates.length} colour regions found. Each needs visual review; no player identity has been assigned.`;
    candidates.forEach((p,i)=>{const b=document.createElement('button');b.textContent=`Locate region ${i+1}`;b.onclick=()=>{
      if(source!==snapshotImage||version!==imageLoadVersion){$('kitStatus').textContent='Image or calibration changed. Scan again.';return;}
      drawMapping();const canvas=$('snapshotCanvas'),cx=canvas.getContext('2d');cx.beginPath();cx.arc(p.x*canvas.width,p.y*canvas.height,18,0,Math.PI*2);cx.strokeStyle='#ffdf00';cx.lineWidth=4;cx.stroke();
      $('markerX').value=(p.x*100).toFixed(1);$('markerY').value=(p.y*100).toFixed(1);
      canvas.scrollIntoView({block:'center'});$('kitStatus').textContent=`Region ${i+1} highlighted. This is a colour centre, not feet. Choose the correct player and mark their ground contact point. Use the coordinate controls if needed.`;
    };$('kitCandidates').append(b);});
  };
  const visible=document.createElement('div');visible.className='share-board';
  visible.innerHTML='<h3>Explore visible positions</h3><p>Select two marked teammates to measure their separation and nearby marked opponents. Missing players may block the route. Distances are approximate; these measurements do not establish a safe pass.</p><div class="toolbar"><label for="framePasser">Passer</label><select id="framePasser"></select><label for="frameReceiver">Receiver</label><select id="frameReceiver"></select><button id="measureFrame">Measure visible route</button></div><p id="frameResult" role="status">Mark at least two teammates to begin.</p>';
  $('imageWorkspace').append(visible);
  function refreshVisible(){
    for(const id of ['framePasser','frameReceiver']){const selected=$(id).value;$(id).replaceChildren();for(const p of initial().players)if(mappedPoints.has(p.id))$(id).add(new Option(p.id,p.id));if(mappedPoints.has(selected))$(id).value=selected;}
    $('frameResult').textContent='Choose two marked teammates and measure. Unmarked players are unknown.';
    $('measureFrame').disabled=replayActive||calibration.length!==4||mappedPoints.size<2;
  }
  $('measureFrame').onclick=()=>{
    try{
      const a=$('framePasser').value,b=$('frameReceiver').value;
      if(!a||!b||a===b||a.split('-')[0]!==b.split('-')[0])throw Error('Choose two different marked teammates.');
      const projected=id=>FrameModel.project(calibration,mappedPoints.get(id),$('frameRegion').value);
      const opponents=[...mappedPoints.keys()].filter(id=>id!=='ball'&&id.split('-')[0]!==a.split('-')[0]);
      const report=FrameModel.lane(projected(a),projected(b),opponents.map(projected));
      $('frameResult').textContent=`${a} → ${b}: ${report.distance.toFixed(1)} m apart. `+(report.clearance===null?'No marked opponent projects onto this segment.':`Closest marked opponent is ${report.clearance.toFixed(1)} m from the straight segment.`)+` ${22-[...mappedPoints.keys()].filter(id=>id!=='ball').length} players unknown. No safety verdict or completion probability; missing players and movement can change the result.`;
    }catch(e){$('frameResult').textContent=e.message;}
  };
  $('framePasser').onchange=$('frameReceiver').onchange=()=>{$('frameResult').textContent='Selection changed. Measure again to update the result.';};
  drawMapping();
})();
