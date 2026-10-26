(()=>{
  const canvas=$('snapshotCanvas'),viewport=document.createElement('div');
  viewport.className='snapshot-viewport';viewport.tabIndex=0;
  viewport.setAttribute('aria-label','Scrollable screenshot. Use the coordinate controls to place markers with the keyboard.');
  canvas.before(viewport);viewport.append(canvas);
  const controls=document.createElement('div');controls.className='mapping-controls';
  controls.innerHTML='<div class="toolbar"><label for="snapshotZoom">Image zoom</label><select id="snapshotZoom"><option value="1">Fit image</option><option value="1.5">150%</option><option value="2">200%</option><option value="3">300%</option></select><span class="fine">Zoom in, then scroll to reach a marker.</span></div><details><summary>Place a marker with the keyboard</summary><p class="fine">Enter a position as a percentage of the image, measured from the top-left corner. This places the next corner or the selected player / ball.</p><div class="toolbar"><label for="markerX">Horizontal %</label><input id="markerX" type="number" min="0" max="100" step="any" value="50"><label for="markerY">Vertical %</label><input id="markerY" type="number" min="0" max="100" step="any" value="50"><button id="placeMarker">Place marker</button></div></details><div class="mapping-progress"><strong id="markerProgress">0 / 23 positions</strong><progress id="mappingProgress" max="27" value="0" aria-label="Mapping progress"></progress></div><div id="markerChecklist" class="marker-checklist" aria-label="Player and ball checklist"></div>';
  viewport.before(controls);
  $('snapshotZoom').onchange=()=>{
    canvas.style.width=`${Number($('snapshotZoom').value)*100}%`;canvas.style.maxWidth='none';
  };
  $('placeMarker').onclick=()=>{
    const x=$('markerX'),y=$('markerY');
    if(x.value===''||y.value===''||!x.checkValidity()||!y.checkValidity()){snapshotStatus('Enter coordinates from 0 to 100.');return;}
    markSnapshotPoint({x:Number(x.value)/100,y:Number(y.value)/100});
  };
  const update=()=>{
    $('mappingProgress').value=calibration.length+mappedPoints.size;
    $('markerProgress').textContent=`${calibration.length} / 4 corners · ${[...mappedPoints.keys()].filter(id=>id!=='ball').length} visible players marked`;
    $('markerChecklist').replaceChildren();
    for(const id of mappingIds){
      const b=document.createElement('button');b.type='button';
      b.className=mappedPoints.has(id)?'marked':'';
      b.textContent=(mappedPoints.has(id)?'✓ ':'○ ')+id.replace('blue-','Blue #').replace('coral-','Coral #').replace('ball','Ball');
      b.setAttribute('aria-pressed',String($('mappingTarget').value===id));
      b.disabled=calibration.length<4||replayActive;
      b.onclick=()=>{$('mappingTarget').value=id;drawMapping();};
      $('markerChecklist').append(b);
    }
  };
  const oldDraw=drawMapping;drawMapping=function(){oldDraw();update();};
  const sample=document.createElement('div');sample.className='sample-upload';
  sample.innerHTML='<span class="sample-icon">⊞</span><div><h3>Start with a practice image</h3><p>Learn corner calibration with an original, full-pitch illustration. No personal image or AI service needed.</p></div><button id="loadSample">Load practice image</button>';
  $('snapshot-import').querySelector('h2').after(sample);
  $('loadSample').onclick=async()=>{
    if(replayActive){snapshotStatus('Exit replay before loading an image.');return;}
    const version=++imageLoadVersion,s=initial();
    const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="1130" height="780" viewBox="-4 -5 113 78"><rect x="-4" y="-5" width="113" height="78" fill="#103e35"/><rect width="105" height="68" fill="#23654e" stroke="#d7eedb" stroke-width=".3"/><path d="M52.5 0V68 M0 14H16.5V54H0 M105 14H88.5V54H105" fill="none" stroke="#d7eedb" stroke-width=".3"/><circle cx="52.5" cy="34" r="9.15" fill="none" stroke="#d7eedb" stroke-width=".3"/><text x="2" y="-1.5" fill="white" font-size="2">BLUE → · PRACTICE IMAGE · MARK THE CENTRES</text>${s.players.map(p=>`<circle cx="${p.x}" cy="${p.y}" r="1.4" fill="${p.team==='blue'?'#398bff':'#f07867'}" stroke="white" stroke-width=".15"/><text x="${p.x}" y="${p.y-2}" text-anchor="middle" font-size="1.8" fill="white">${p.team==='blue'?'B':'C'}${p.number}</text>`).join('')}<circle cx="${s.ball.x}" cy="${s.ball.y}" r=".65" fill="white" stroke="#111" stroke-width=".15"/></svg>`;
    const url=URL.createObjectURL(new Blob([svg],{type:'image/svg+xml'})),img=new Image();
    try{
      img.src=url;await img.decode();if(version!==imageLoadVersion)return;
      snapshotImage=img;calibration=[];mappedPoints.clear();mappingHistory=[];
      canvas.width=1130;canvas.height=780;$('imageWorkspace').hidden=false;
      $('snapshotZoom').value='1';$('snapshotZoom').dispatchEvent(new Event('change'));
      drawMapping();snapshotStatus('Practice image ready. Mark the four white pitch corners, starting at the top-left. For this illustration, mark player circle centres.');
    }catch{snapshotStatus('Practice image could not load. Upload a PNG or JPEG instead.');}
    finally{URL.revokeObjectURL(url);}
  };
  // Keep draft mapping controls read-only during a running replay.
  const previousLock=lockReplay;
  lockReplay=function(locked){previousLock(locked);$('loadSample').disabled=locked;$('placeMarker').disabled=locked;update();};
  update();
})();
