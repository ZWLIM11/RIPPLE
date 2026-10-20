const studioPanel=document.createElement('section');studioPanel.className='panel wide studio-tools';
studioPanel.innerHTML=`<div class="broadcast-banner"><div><div class="eyebrow">Passing prediction studio</div><h2>Explain the passing window</h2></div>
<div class="toolbar"><label>Language / Bahasa <select id="studioLanguage"><option value="en">English</option><option value="ms">Bahasa Melayu</option></select></label><button id="broadcastToggle">Broadcast view</button></div></div>
<p class="notice">Predictions estimate travel, interception risk and control under stated assumptions. Heuristic scores are not completion probabilities.</p>
<div class="studio-grid"><div><h3 id="askTitle">Ask about this candidate</h3><label for="analysisQuestion" id="questionLabel">Question</label>
<input id="analysisQuestion" type="text" maxlength="500" value="Why is this passing option risky?">
<div class="toolbar"><button id="askAnalysis" class="primary">Explain candidate</button><span class="pill" id="aiStatus">Local verified explanations</span></div>
<div id="analysisAnswer" class="studio-output" aria-live="polite"></div><details><summary>Evidence and agent activity</summary><pre id="analysisTrace"></pre></details></div>
<div><h3 id="windowTitle">How easily does this window close?</h3><p class="fine" id="windowHelp">Move the challenging defender toward the weakest route point, in 0.25 m steps up to 5 m. All other inputs stay fixed.</p>
<button id="testWindow">Test passing window</button><div id="windowResult" class="studio-output" aria-live="polite">Select a candidate to run sensitivity analysis.</div>
<div class="toolbar"><button id="animateCandidate">Animate estimated route</button><button id="stopAnimation" disabled>Stop preview</button></div><p id="animationStatus" class="fine" aria-live="polite"></p></div></div>
<div class="studio-extra"><h3 id="momentsTitle">Match turning points</h3><div id="studioMoments" class="moment-list"></div>
<h3 id="contributionTitle">The contribution before the final pass</h3><p id="studioContributions"></p></div>
<div class="broadcast-card" id="broadcastCard" hidden><h3 id="broadcastHeading">PASS DETECTIVE · ESTIMATE</h3><p id="broadcastText"></p><p id="broadcastEvidence" class="fine"></p></div>
<div class="toolbar"><button id="showOverlay">Show 8-second overlay</button><button id="exportOverlay">Export overlay JSON</button><span id="overlayStatus" class="fine"></span></div>`;
$('evidence').parentElement.after(studioPanel);
let studioRevision=0,studioFingerprint='',animationFrame=null,animationLayer=null,overlayTimer=null,activeOverlay=null,studioClaims=[];
const language=()=>$('studioLanguage').value;
const tr=(en,ms)=>language()==='ms'?ms:en;
const selectedEvidenceId=()=>replayActive&&replayMatch?`${replayMatch.decisions[replayIndex].id}-decision`:'current-board';
function studioCandidate(){return selectedRoute();}
function stopPreview(){
  if(animationFrame!==null)cancelAnimationFrame(animationFrame);animationFrame=null;
  animationLayer?.remove();animationLayer=null;
  $('stopAnimation').disabled=true;
  $('animationStatus').textContent='';
}
function clearOverlay(){
  clearTimeout(overlayTimer);activeOverlay=null;$('broadcastCard').hidden=true;
  $('overlayStatus').textContent='';
}
function updateStudio(){
  const candidate=studioCandidate();
  const fingerprint=JSON.stringify([state,candidate?.key,language(),replayActive,replayIndex,replayRevealed,$('replayAudience').value]);
  if(fingerprint!==studioFingerprint){
    studioFingerprint=fingerprint;studioRevision++;stopPreview();clearOverlay();studioClaims=[];
    $('analysisAnswer').textContent=tr('Choose Explain candidate to inspect the current evidence.','Pilih Terangkan hantaran untuk menyemak bukti semasa.');
    $('analysisTrace').textContent='';$('windowResult').textContent=tr('Run the test for this candidate.','Jalankan ujian untuk hantaran ini.');
  }
  for(const id of ['askAnalysis','testWindow','animateCandidate','showOverlay','exportOverlay'])$(id).disabled=!candidate;
  const seen=replayActive&&replayMatch?ReplayModel.observed(replayMatch,replayIndex,replayRevealed):[];
  $('studioMoments').replaceChildren();
  const moments=MatchIntelligence.moments(seen,PassingModel);
  for(const m of moments.slice(-8)){
    const b=document.createElement('button');b.textContent=m.title[language()==='ms'?1:0];
    const small=document.createElement('small');small.textContent=`${replayTime(m.time)} · ${m.id}`;b.append(small);
    b.onclick=()=>{stopReplay();loadDecision(m.index);replayRevealed=true;renderReplay();};
    $('studioMoments').append(b);
  }
  if(!moments.length)$('studioMoments').textContent=tr('Reveal match events to discover turning points.','Dedahkan peristiwa perlawanan untuk melihat titik perubahan.');
  const contribution=MatchIntelligence.contributions(seen).filter(r=>$('replayFocus').value==='all'||r.player===$('replayFocus').value)[0];
  $('studioContributions').textContent=contribution?
    tr(`${MatchIntelligence.name(contribution.player)} contributed earlier completed passes in ${contribution.chains} shot-ending sequences, without being the final passer or shooter. Evidence: ${[...contribution.eventIds,...contribution.shotIds].join(', ')}. This is involvement, not causal credit.`,
       `${MatchIntelligence.name(contribution.player)} menyumbang hantaran awal dalam ${contribution.chains} gerakan yang berakhir dengan percubaan, tanpa menjadi penghantar terakhir atau penembak. Bukti: ${[...contribution.eventIds,...contribution.shotIds].join(', ')}. Ini ialah penglibatan, bukan bukti sebab-akibat.`):
    tr('No qualifying contribution in the observed events for this player selection yet.','Belum ada sumbangan yang layak dalam peristiwa diperhatikan untuk pilihan pemain ini.');
  if(replayMatch&&replayActive){
    $('replayRecap').textContent=MatchIntelligence.recap(seen,$('replayFocus').value,language());
    if(language()==='ms'){
      const e=replayMatch.decisions[replayIndex],c=PassingModel.evaluate(e.before,e.candidate);
      $('decisionStory').textContent=replayRevealed?
        `${replayName(e.passer)} menghantar kepada ${replayName(e.candidate.receiver)}. Hasil simulasi: ${MatchIntelligence.outcome(e.outcome,'ms')}.${e.shot?` Penerima kemudian melakukan percubaan${e.shot.goal?' dan menjaringkan gol':''}.`:''}${$('replayAudience').value==='analyst'?` Margin pintasan anggaran sebelum hantaran: ${signed(c.routeMargin)}.`:''} Anggaran model berbeza daripada hasil diperhatikan.`
        :`${replayName(e.passer)} menguasai bola. Periksa cadangan dan pilih hantaran sebelum mendedahkan hasil.`;
      const stats=ReplayModel.stats(seen,$('replayFocus').value);
      $('replayStats').textContent=`${stats.completed}/${stats.attempts} hantaran berjaya · ${stats.shots} percubaan · ${stats.goals} gol`;
      $('chosenPass').textContent=replayChoice?`Pilihan anda: ${replayName(replayChoice.receiver)}, kaki ${replayChoice.foot==='left'?'kiri':'kanan'}, ${replayChoice.speed} m/s. Hasil alternatif tidak disimulasikan.`:'Belum ada hantaran dipilih.';
    }
  }
}
function localClaims(){
  const facts=MatchIntelligence.facts(state,studioCandidate(),PassingModel,selectedEvidenceId());
  const ids=$('replayAudience').value==='analyst'?['route','timing','difficulty','limit']:['route','risk','defender','limit'];
  return facts.filter(f=>ids.includes(f.id)).map(f=>({id:f.id,text:f[language()],evidenceIds:f.evidenceIds}));
}
function showClaims(claims,trace,source){
  studioClaims=claims;$('analysisAnswer').replaceChildren();
  for(const claim of claims){
    const p=document.createElement('p');p.textContent=claim.text;
    const b=document.createElement('button');b.textContent=tr('Inspect evidence','Periksa bukti');
    b.onclick=()=>{$('evidence').scrollIntoView({behavior:'smooth',block:'center'});$('evidence').parentElement.style.outline='2px solid #287e6a';setTimeout(()=>$('evidence').parentElement.style.outline='',1800);};
    p.append(document.createTextNode(' '),b);$('analysisAnswer').append(p);
  }
  $('analysisTrace').textContent=JSON.stringify({source,evidenceIds:[...new Set(claims.flatMap(c=>c.evidenceIds))],trace},null,2);
}
$('askAnalysis').onclick=async()=>{
  stopReplay();const revision=studioRevision,candidate=studioCandidate();if(!candidate)return;
  $('askAnalysis').disabled=true;
  showClaims(localClaims(),[],tr('Local verified template','Templat tempatan disahkan'));
  try{
    if(location.protocol==='file:')return;
    const res=await fetch('/api/explain',{method:'POST',headers:{'Content-Type':'application/json'},signal:AbortSignal.timeout(55000),
      body:JSON.stringify({state,candidateKey:candidate.key,question:$('analysisQuestion').value,language:language(),audience:$('replayAudience').value})});
    if(!res.ok)throw Error('Service unavailable');
    const data=await res.json();if(revision!==studioRevision)return;
    // Recompute display text from local facts: never insert arbitrary service prose.
    const facts=MatchIntelligence.facts(state,candidate,PassingModel,selectedEvidenceId());
    if(!Array.isArray(data.claims)||!data.claims.length||data.claims.some(c=>!facts.some(f=>f.id===c.id)))throw Error('Invalid claims');
    const claims=data.claims.map(c=>{const f=facts.find(f=>f.id===c.id);return {id:f.id,text:f[language()],evidenceIds:f.evidenceIds};});
    showClaims(claims,data.trace,data.source);
    $('aiStatus').textContent=data.source==='foundry-agent'?'Foundry · verified evidence':tr('Local template · AI not connected','Templat tempatan · AI belum disambung');
  }catch{if(revision===studioRevision)$('aiStatus').textContent=tr('Service unavailable · local fallback','Perkhidmatan tiada · templat tempatan');}
  finally{if(revision===studioRevision)$('askAnalysis').disabled=false;}
};
$('testWindow').onclick=()=>{
  const candidate=studioCandidate();if(!candidate)return;
  const report=MatchIntelligence.sensitivity(state,candidate,PassingModel);
  if(!report.baselineViable){$('windowResult').textContent=tr('This candidate is already rejected. Inspect its timing evidence or choose a viable route first.','Hantaran ini sudah ditolak. Semak bukti masa atau pilih laluan yang boleh dilaksanakan.');return;}
  $('windowResult').replaceChildren();
  const text=document.createElement('p');text.textContent=report.closure?
    tr(`Moving ${MatchIntelligence.name(report.defender)} ${report.closure.shift.toFixed(2)} m toward the weakest route point closes this window. First rejected sample at 0.25 m resolution; not an exact threshold.`,
       `Menggerakkan ${MatchIntelligence.name(report.defender)} sebanyak ${report.closure.shift.toFixed(2)} m ke titik laluan paling lemah menutup ruang ini. Sampel ditolak pertama pada sela 0.25 m; bukan ambang tepat.`):
    tr('The route remained viable across the tested positions (up to 5 m toward the weakest point).','Laluan kekal boleh dilaksanakan di semua kedudukan diuji (sehingga 5 m ke titik paling lemah).');
  $('windowResult').append(text);
  const details=document.createElement('details'),summary=document.createElement('summary');summary.textContent=tr('Show all tested margins','Tunjukkan semua margin diuji');
  const pre=document.createElement('pre');pre.textContent=report.samples.map(s=>`${s.shift.toFixed(2)} m | route ${signed(s.routeMargin)} | control ${signed(s.controlMargin)} | release ${signed(s.releaseMargin)} | ${s.viable?'viable':'rejected'}`).join('\n');
  details.append(summary,pre);$('windowResult').append(details);
};
$('animateCandidate').onclick=()=>{
  stopReplay();stopPreview();const c=studioCandidate();if(!c)return;
  if(!Number.isFinite(c.flight)){$('animationStatus').textContent=tr('The ball cannot reach this target at the selected launch speed.','Bola tidak dapat mencapai sasaran pada kelajuan awal ini.');return;}
  const snapshot=structuredClone(state),defender=snapshot.players.find(p=>p.id===c.critical.defender),receiver=snapshot.players.find(p=>p.id===c.receiver);
  animationLayer=el('g',{id:'estimated-motion','pointer-events':'none'});
  const ball=el('circle',{r:.8,fill:'#ffeb7b',stroke:'#111','stroke-width':.25},animationLayer);
  const runner=el('circle',{r:1.7,fill:'none',stroke:'#7fffe0','stroke-width':.4},animationLayer);
  const challenger=el('circle',{r:1.8,fill:'none',stroke:'#ff916e','stroke-width':.4},animationLayer);
  const total=Math.min(15,c.total+c.control),duration=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches?1:4200;
  const start=performance.now();
  const move=(node,from,to,t,arrival)=>{
    const f=arrival<=0?1:Math.max(0,Math.min(1,t/arrival));
    node.setAttribute('cx',from.x+(to.x-from.x)*f);node.setAttribute('cy',from.y+(to.y-from.y)*f);
  };
  const frame=now=>{
    if(!animationLayer?.isConnected){stopPreview();return;}
    const progress=Math.min(1,(now-start)/duration),t=progress*total,flight=Math.max(0,Math.min(c.flight,t-c.prep));
    const travelled=Math.max(0,c.speed*flight-.5*flight*flight),f=Math.min(1,travelled/c.distance);
    ball.setAttribute('cx',snapshot.ball.x+(c.target.x-snapshot.ball.x)*f);ball.setAttribute('cy',snapshot.ball.y+(c.target.y-snapshot.ball.y)*f);
    move(runner,receiver,c.target,t,c.receiverArrival);
    move(challenger,defender,c.critical.point,t,c.critical.defenderTime);
    $('animationStatus').textContent=tr(`Estimated motion · ${t.toFixed(1)} model seconds · illustrative player interpolation, not observed tracking.`,
      `Gerakan anggaran · ${t.toFixed(1)} saat model · interpolasi pemain ilustratif, bukan penjejakan diperhatikan.`);
    if(progress<1)animationFrame=requestAnimationFrame(frame);else{animationFrame=null;$('stopAnimation').disabled=false;}
  };
  $('stopAnimation').disabled=false;animationFrame=requestAnimationFrame(frame);
};
$('stopAnimation').onclick=()=>{stopPreview();$('animationStatus').textContent=tr('Preview stopped.','Pratonton dihentikan.');};
function makeOverlay(){
  const c=studioCandidate();if(!c)return null;
  const claims=studioClaims.length?studioClaims:localClaims();
  const event=replayActive&&replayMatch?replayMatch.decisions[replayIndex]:null;
  return MatchIntelligence.overlay({text:claims.slice(0,2).map(c=>c.text).join(' '),evidenceIds:claims.flatMap(c=>c.evidenceIds),
    language:language(),eventId:selectedEvidenceId(),time:event?event.time:0,kind:'estimate'});
}
$('showOverlay').onclick=()=>{
  const payload=makeOverlay();if(!payload)return;clearOverlay();activeOverlay=payload;
  $('broadcastHeading').textContent=tr('PASS DETECTIVE · ESTIMATED PASSING WINDOW','PASS DETECTIVE · ANGGARAN RUANG HANTARAN');
  $('broadcastText').textContent=payload.text;$('broadcastEvidence').textContent=`${payload.evidenceIds.join(' · ')} | ${payload.startTime}–${payload.endTime}s`;
  $('broadcastCard').hidden=false;$('overlayStatus').textContent=tr('Visible for 8 seconds','Dipaparkan selama 8 saat');
  overlayTimer=setTimeout(clearOverlay,payload.durationMs);
};
$('exportOverlay').onclick=()=>{
  const payload=makeOverlay();if(!payload)return;
  const url=URL.createObjectURL(new Blob([JSON.stringify(payload,null,2)],{type:'application/json'})),a=document.createElement('a');
  a.href=url;a.download='pass-detective-overlay.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
};
$('broadcastToggle').onclick=()=>{
  document.body.classList.toggle('broadcast-mode');
  $('broadcastToggle').textContent=document.body.classList.contains('broadcast-mode')?tr('Exit broadcast view','Keluar paparan siaran'):tr('Broadcast view','Paparan siaran');
};
function translateStudio(){
  document.documentElement.lang=language();
  $('broadcastToggle').textContent=document.body.classList.contains('broadcast-mode')?tr('Exit broadcast view','Keluar paparan siaran'):tr('Broadcast view','Paparan siaran');
  const labels={
    askTitle:['Ask about this candidate','Tanya tentang hantaran ini'],questionLabel:['Question','Soalan'],
    askAnalysis:['Explain candidate','Terangkan hantaran'],windowTitle:['How easily does this window close?','Seberapa mudah ruang ini tertutup?'],
    testWindow:['Test passing window','Uji ruang hantaran'],animateCandidate:['Animate estimated route','Animasikan laluan anggaran'],
    stopAnimation:['Stop preview','Hentikan pratonton'],momentsTitle:['Match turning points','Titik perubahan perlawanan'],
    contributionTitle:['The contribution before the final pass','Sumbangan sebelum hantaran terakhir'],showOverlay:['Show 8-second overlay','Tunjukkan paparan 8 saat'],
    exportOverlay:['Export overlay JSON','Eksport JSON paparan'],pickCandidate:['Choose inspected candidate','Pilih hantaran diperiksa'],revealPass:['Reveal observed outcome','Dedahkan hasil diperhatikan']
  };
  for(const [id,[en,ms]]of Object.entries(labels))$(id).textContent=tr(en,ms);
  $('windowHelp').textContent=tr('Move the challenging defender toward the weakest route point, in 0.25 m steps up to 5 m. All other inputs stay fixed.','Gerakkan pertahanan ke titik laluan paling lemah, dalam sela 0.25 m sehingga 5 m. Input lain dikekalkan.');
  $('analysisQuestion').value=tr('Why is this passing option risky?','Mengapa pilihan hantaran ini berisiko?');
  if(replayActive)renderReplay();else updateStudio();
}
$('studioLanguage').onchange=translateStudio;
const previousStudioRender=render;
render=function(){previousStudioRender();updateStudio();};
const previousReplayRender=renderReplay;
renderReplay=function(){previousReplayRender();updateStudio();};
const previousExit=$('exitReplay').onclick;
$('exitReplay').onclick=()=>{previousExit();stopPreview();updateStudio();};
if(location.protocol!=='file:')fetch('/api/status').then(r=>r.json()).then(s=>{
  $('aiStatus').textContent=s.ai?'Foundry configured':tr('Local templates · configure Foundry to enable AI','Templat tempatan · konfigurasi Foundry untuk AI');
}).catch(()=>{});
updateStudio();
