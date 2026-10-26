'use strict';
const $=id=>document.getElementById(id),video=$('video');
let config,records=[],capture=null,busy=false;
const message=text=>$('status').textContent=text;
const key='ripple.review.118577.v1';
function validRecord(r){return r&&typeof r.id==='string'&&Number.isFinite(r.seconds)&&r.seconds>=0&&r.seconds<240&&typeof r.image==='string'&&/^118577-\d+\.png$/.test(r.image)&&/^[a-f0-9]{64}$/.test(r.image_sha256)&&['unclear','successful','unsuccessful','offside','not_a_pass'].includes(r.outcome)&&['unclear','likely','verified'].includes(r.target_confidence)&&typeof r.release_frame_verified==='boolean'&&['reviewer','passer','target','notes'].every(k=>typeof r[k]==='string'&&r[k].length<=2000);}
function persist(){try{localStorage.setItem(key,JSON.stringify(records));}catch{message('Browser storage unavailable. Export your JSON now to keep the records.');}}
function list(){
 $('count').textContent=`${records.length} review candidates · ${records.filter(r=>r.outcome==='unclear').length} unclear outcomes · 0 automatically approved benchmark entries`;
 $('records').replaceChildren();
 for(const r of records){const li=document.createElement('li'),b=document.createElement('button');b.textContent=`Review ${r.seconds.toFixed(2)}s · ${r.outcome} · ${r.reviewer||'no reviewer'}`;b.onclick=()=>{video.pause();video.currentTime=r.seconds;capture=null;$('save').disabled=true;$('downloadFrame').disabled=true;$('frame').hidden=true;$('captureInfo').textContent='Recapture this frame to edit its record or download its PNG.';for(const id of ['reviewer','passer','target','outcome','notes'])$(id).value=r[id];$('confidence').value=r.target_confidence;$('release').value=String(r.release_frame_verified);message('Record loaded. Recapture the frame before updating.');};li.append(b);$('records').append(li);}
}
function seek(seconds){video.pause();video.currentTime=Math.max(0,Math.min(config.duration-1/config.fps,seconds));}
function windowSeek(){seek(config.windows[+$('window').value].start);$('prev').disabled=+$('window').value===0;$('next').disabled=+$('window').value===config.windows.length-1;}
$('window').onchange=windowSeek;$('prev').onclick=()=>{$('window').value=String(+$('window').value-1);windowSeek();};$('next').onclick=()=>{$('window').value=String(+$('window').value+1);windowSeek();};
$('backFrame').onclick=()=>seek(video.currentTime-1/config.fps);$('forwardFrame').onclick=()=>seek(video.currentTime+1/config.fps);$('speed').onchange=()=>video.playbackRate=+$('speed').value;
video.ontimeupdate=()=>{$('time').textContent=`Clip time ${video.currentTime.toFixed(2)}s · approximate zero-based frame ${Math.round(video.currentTime*(config?.fps||25))}`;};
video.onerror=()=>message('Video could not load. Check the server is running and the browser supports MP4 playback.');
$('capture').onclick=async()=>{
 if(busy||video.readyState<2||video.seeking){message('Wait for the video frame to finish loading, then capture.');return;}
 busy=true;$('capture').disabled=true;video.pause();const seconds=video.currentTime;capture=null;$('save').disabled=true;$('downloadFrame').disabled=true;
 try{const canvas=$('frame');canvas.width=video.videoWidth;canvas.height=video.videoHeight;canvas.getContext('2d').drawImage(video,0,0);const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));if(!blob)throw Error('Image encoding failed');
 const hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',await blob.arrayBuffer()))].map(x=>x.toString(16).padStart(2,'0')).join('');
 capture={seconds,frame_index_zero_based:Math.round(seconds*config.fps),image:`118577-${Math.round(seconds*1000)}.png`,image_sha256:hash,blob};canvas.hidden=false;$('captureInfo').textContent=`Captured ${seconds.toFixed(3)}s at ${canvas.width}×${canvas.height}. Review whether this is truly before release.`;$('save').disabled=false;$('downloadFrame').disabled=false;message('Frame captured. Download the PNG, then record evidence from the outcome clip.');
 }catch(e){message('Capture failed: '+e.message);}finally{busy=false;$('capture').disabled=false;}
};
function download(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
$('downloadFrame').onclick=()=>{if(capture)download(capture.blob,capture.image);};
$('save').onclick=()=>{
 if(!capture)return;if(!$('reviewer').value.trim()){message('Enter a reviewer name or ID first.');return;}
 const {blob,...frame}=capture;
 const row={...frame,id:`118577-${Math.round(frame.seconds*1000)}`,reviewer:$('reviewer').value.trim(),passer:$('passer').value.trim(),target:$('target').value.trim(),outcome:$('outcome').value,target_confidence:$('confidence').value,release_frame_verified:$('release').value==='true',notes:$('notes').value,reviewed_at:new Date().toISOString(),status:'needs_independent_mapping_and_review',marked_before_outcome_review:false};
 const index=records.findIndex(r=>r.id===row.id);if(index<0)records.push(row);else records[index]=row;records.sort((a,b)=>a.seconds-b.seconds);message('Candidate saved locally. Download PNG and export JSON for a portable backup.');persist();list();
};
$('new').onclick=()=>{capture=null;$('frame').hidden=true;$('captureInfo').textContent='';$('save').disabled=true;$('downloadFrame').disabled=true;for(const id of ['passer','target','notes'])$(id).value='';$('outcome').value='unclear';$('confidence').value='unclear';$('release').value='false';message('Ready for another candidate. Previously saved records remain.');};
$('export').onclick=()=>download(new Blob([JSON.stringify({version:1,kind:'ripple-pass-review-draft',source:config,production_approved:false,benchmark_ready:false,candidates:records},null,2)],{type:'application/json'}),'118577-review-draft.json');
$('import').onchange=async e=>{const file=e.target.files[0];if(!file)return;try{if(file.size>2e6)throw Error('Use a file below 2 MB');const data=JSON.parse(await file.text());if(data.version!==1||data.kind!=='ripple-pass-review-draft'||data.source?.sha256!==config.sha256||!Array.isArray(data.candidates)||data.candidates.length>1000||!data.candidates.every(validRecord)||new Set(data.candidates.map(r=>r.id)).size!==data.candidates.length)throw Error('Invalid review package or different source clip');let added=0;for(const row of data.candidates)if(!records.some(r=>r.id===row.id)){records.push({...row,status:'needs_independent_mapping_and_review',marked_before_outcome_review:false});added++;}records.sort((a,b)=>a.seconds-b.seconds);persist();list();message(`Imported ${added} new records. Existing IDs kept unchanged; imported records remain unapproved.`);}catch(err){message('Import rejected: '+err.message);}finally{e.target.value='';}};
(async()=>{try{config=await(await fetch('/config.json')).json();config.windows.forEach((w,i)=>{const o=document.createElement('option');o.value=i;o.textContent=`${i+1} / ${config.windows.length} · ${w.start}–${w.end} seconds`;$('window').append(o);});try{const saved=JSON.parse(localStorage.getItem(key)||'[]');if(Array.isArray(saved)&&saved.every(validRecord))records=saved;}catch{}list();$('prev').disabled=true;message('Verified 118577 clip loaded. Review windows are ready; no pass labels have been invented.');}catch(e){message('Could not initialize: '+e.message);}})();
