const visionArea=document.createElement('div');visionArea.id='visionReview';
visionArea.innerHTML=`<div class="toolbar"><button id="suggestMarkers" disabled>Suggest markers with AI</button><span class="fine" id="visionAvailability">Optional vision service not configured.</span></div>
<p class="fine">Optional: clicking Suggest sends a resized screenshot to your configured Azure vision deployment.
Only use images you may share. It suggests visible blue/coral players with readable shirt numbers; unknown identities are omitted.
Review each suggestion before accepting. Four-corner calibration and all player/ball positions are still required.</p>
<div id="visionSuggestions"></div>`;
$('imageWorkspace').append(visionArea);
let visionAvailable=false;
if(location.protocol!=='file:')fetch('/api/status').then(r=>r.json()).then(s=>{
  visionAvailable=s.vision;$('suggestMarkers').disabled=!s.vision;
  $('visionAvailability').textContent=s.vision?'Vision configured · suggestions require review':'Configure FOUNDRY_VISION_DEPLOYMENT to enable suggestions.';
}).catch(()=>{});
$('suggestMarkers').onclick=async()=>{
  if(!snapshotImage||replayActive||!visionAvailable)return;
  if(calibration.length!==4){snapshotStatus('Mark all four pitch corners before requesting suggestions.');return;}
  const source=snapshotImage,version=imageLoadVersion;
  const canvas=document.createElement('canvas'),scale=Math.min(1,1200/source.naturalWidth);
  canvas.width=source.naturalWidth*scale;canvas.height=source.naturalHeight*scale;
  canvas.getContext('2d').drawImage(source,0,0,canvas.width,canvas.height);
  $('suggestMarkers').disabled=true;$('visionSuggestions').textContent='Requesting suggestions…';
  try{
    const res=await fetch('/api/vision',{method:'POST',headers:{'Content-Type':'application/json'},signal:AbortSignal.timeout(25000),
      body:JSON.stringify({image:canvas.toDataURL('image/jpeg',.85)})});
    if(!res.ok)throw Error('Vision service unavailable or request rejected');
    const data=await res.json();if(version!==imageLoadVersion||source!==snapshotImage||replayActive)return;
    const markers=MatchIntelligence.visionSuggestions(data,initial());
    $('visionSuggestions').replaceChildren();
    for(const marker of markers){
      const row=document.createElement('p'),button=document.createElement('button');
      row.textContent=`${marker.id}: image (${marker.x.toFixed(3)}, ${marker.y.toFixed(3)}) · reported confidence ${Math.round(marker.confidence*100)}% (not calibrated) `;
      button.textContent='Accept after checking';
      button.onclick=()=>{
        if(version!==imageLoadVersion||source!==snapshotImage||replayActive)return;
        try{
          SnapshotModel.project(SnapshotModel.calibrate(calibration),marker);
          mappingHistory.push({id:marker.id,old:mappedPoints.get(marker.id)});
          mappedPoints.set(marker.id,{x:marker.x,y:marker.y});drawMapping();button.disabled=true;
        }catch(error){snapshotStatus(error.message);}
      };
      const preview=document.createElement('button');preview.textContent='Locate on image';
      preview.onclick=()=>{
        drawMapping();const c=$('snapshotCanvas'),ctx=c.getContext('2d');
        ctx.strokeStyle='#ffdf00';ctx.lineWidth=4;ctx.beginPath();ctx.arc(marker.x*c.width,marker.y*c.height,16,0,Math.PI*2);ctx.stroke();
      };
      row.append(preview,button);$('visionSuggestions').append(row);
    }
    if(!markers.length)$('visionSuggestions').textContent='No identifiable markers. Continue manual mapping.';
  }catch(error){if(version===imageLoadVersion)$('visionSuggestions').textContent=error.message+'; manual mapping remains available.';}
  finally{$('suggestMarkers').disabled=!visionAvailable;}
};
