const MatchIntelligence = (() => {
  const clone=v=>JSON.parse(JSON.stringify(v));
  const name=id=>String(id).replace('blue-','Blue #').replace('coral-','Coral #');
  const num=n=>Number.isFinite(n)?n.toFixed(2):'—';
  const outcomes={completed:['completed','berjaya'],intercepted:['intercepted','dipintas'],offside:['offside','ofsaid'],incomplete:['incomplete','tidak lengkap']};
  function outcome(value,lang='en'){return (outcomes[value]||[value,value])[lang==='ms'?1:0];}
  function facts(state,candidate,model,evidenceId='current-board') {
    if(!candidate||!state.owner)return [];
    const c=model.evaluate(state,candidate),receiver=name(c.receiver);
    return [
      {id:'route',evidenceIds:[evidenceId],en:`${name(state.owner)} → ${receiver}: ${c.distance.toFixed(1)} m, ${c.foot} foot, ${c.speed} m/s launch speed.`,
        ms:`${name(state.owner)} → ${receiver}: ${c.distance.toFixed(1)} m, kaki ${c.foot==='left'?'kiri':'kanan'}, kelajuan awal ${c.speed} m/s.`},
      {id:'risk',evidenceIds:[evidenceId],en:c.viable?'The passing window remains open under these assumptions.':'The model flags this candidate as risky or infeasible under these assumptions.',
        ms:c.viable?'Ruang hantaran masih terbuka berdasarkan andaian ini.':'Model menandakan hantaran ini berisiko atau tidak boleh dilaksanakan berdasarkan andaian ini.'},
      {id:'timing',evidenceIds:[evidenceId],en:`Estimated interception margin: ${num(c.routeMargin)} s; release margin: ${num(c.releaseMargin)} s; control margin: ${num(c.controlMargin)} s.`,
        ms:`Anggaran margin pintasan: ${num(c.routeMargin)} s; margin pelepasan: ${num(c.releaseMargin)} s; margin kawalan: ${num(c.controlMargin)} s.`},
      {id:'difficulty',evidenceIds:[evidenceId],en:`Difficulty ${Math.round(c.difficulty*100)}/100 and ranking score ${Math.round(c.score)}/100 are heuristics, not completion probabilities.`,
        ms:`Kesukaran ${Math.round(c.difficulty*100)}/100 dan skor kedudukan ${Math.round(c.score)}/100 ialah heuristik, bukan kebarangkalian hantaran berjaya.`},
      {id:'defender',evidenceIds:[evidenceId],en:`${name(c.critical.defender)} is the challenging defender at the weakest sampled route point.`,
        ms:`${name(c.critical.defender)} ialah pertahanan yang mencabar pada titik laluan sampel paling lemah.`},
      {id:'limit',evidenceIds:[evidenceId],en:'Players start stationary in the arrival model. Small errors in position or timing can change this estimate.',
        ms:'Pemain bermula dalam keadaan pegun dalam model ketibaan. Ralat kecil pada kedudukan atau masa boleh mengubah anggaran ini.'}
    ];
  }
  function sensitivity(state,candidate,model) {
    const baseline=model.evaluate(state,candidate);
    if(!baseline.viable)return {baselineViable:false,reason:'already-rejected',samples:[],closure:null};
    const defender=state.players.find(p=>p.id===baseline.critical.defender),target=baseline.critical.point;
    const distance=Math.hypot(target.x-defender.x,target.y-defender.y);
    const samples=[];
    for(let step=0;step<=20;step++){
      const shift=Math.min(distance,step*.25),s=clone(state),p=s.players.find(p=>p.id===defender.id);
      if(distance){p.x+=(target.x-p.x)*shift/distance;p.y+=(target.y-p.y)*shift/distance;}
      const c=model.evaluate(s,candidate);
      samples.push({shift,viable:c.viable,routeMargin:c.routeMargin,controlMargin:c.controlMargin,releaseMargin:c.releaseMargin,score:c.score});
      if(!c.viable || shift===distance)break;
    }
    return {baselineViable:true,defender:defender.id,step:.25,maxShift:5,samples,closure:samples.find(s=>!s.viable)||null};
  }
  function moments(events,model) {
    return events.flatMap((e,index)=>{
      const c=model.evaluate(e.before,e.candidate);
      const title=e.shot?.goal?['Goal','Gol']:e.shot?['Shot-ending move','Gerakan menghasilkan percubaan']:
        e.outcome!=='completed'?['Possession changes','Penguasaan bertukar']:
        c.progression>=15?['Forward progression','Kemaraan ke hadapan']:
        c.releaseMargin<.35?['Pass under pressure','Hantaran di bawah tekanan']:null;
      return title?[{index,id:e.id,time:e.time,title,evidenceIds:[e.id,...(e.shot?[e.shot.id]:[])]}]:[];
    });
  }
  function contributions(events) {
    const records=new Map();let chain=[];
    for(const e of events){
      if(chain.length && (chain.at(-1).team!==e.team || chain.at(-1).outcome!=='completed' || chain.at(-1).shot))chain=[];
      chain.push(e);
      if(e.shot){
        const earlier=chain.slice(0,-1).filter(n=>n.outcome==='completed'&&n.passer!==e.passer&&n.passer!==e.shot.player);
        for(const id of new Set(earlier.map(n=>n.passer))){
          const row=records.get(id)||{player:id,chains:0,eventIds:[],shotIds:[]};
          row.chains++;row.eventIds.push(...earlier.filter(n=>n.passer===id).map(n=>n.id));row.shotIds.push(e.shot.id);
          records.set(id,row);
        }
        chain=[];
      }
    }
    return [...records.values()].sort((a,b)=>b.chains-a.chains||a.player.localeCompare(b.player));
  }
  function recap(events,player,lang='en') {
    const passes=events.filter(e=>player==='all'||e.passer===player),shots=events.flatMap(e=>e.shot?[e.shot]:[]).filter(s=>player==='all'||s.player===player);
    const completed=passes.filter(e=>e.outcome==='completed').length,goals=shots.filter(s=>s.goal).length;
    const who=player==='all'?(lang==='ms'?'Kedua-dua pasukan':'Both teams'):name(player);
    if(!passes.length&&!shots.length)return lang==='ms'?'Belum ada peristiwa diperhatikan untuk pilihan ini.':'No observed events for this selection yet.';
    return lang==='ms'?`${who}: ${completed} daripada ${passes.length} hantaran berjaya, ${shots.length} percubaan dan ${goals} gol. Hanya peristiwa yang telah didedahkan dikira.`
      :`${who}: ${completed} completed passes from ${passes.length} attempts, ${shots.length} shots and ${goals} goals. Only revealed events are counted.`;
  }
  function overlay({text,evidenceIds,language,time,eventId,kind='estimate'}) {
    return {schemaVersion:1,type:'match-insight',kind,language,eventId,startTime:time,endTime:time+8,
      durationMs:8000,text,evidenceIds:[...new Set(evidenceIds)]};
  }
  function visionSuggestions(value,reference) {
    if(!value||!Array.isArray(value.markers)||value.markers.length>23)throw Error('Invalid vision markers');
    const ids=new Set();
    return value.markers.map(m=>{
      if(!(m.id==='ball'||reference.players.some(p=>p.id===m.id))||ids.has(m.id))throw Error('Unknown or duplicate marker identity');
      if(!Number.isFinite(m.x)||!Number.isFinite(m.y)||m.x<0||m.x>1||m.y<0||m.y>1||
        !Number.isFinite(m.confidence)||m.confidence<0||m.confidence>1)throw Error('Invalid marker coordinates');
      ids.add(m.id);return {id:m.id,x:m.x,y:m.y,confidence:m.confidence};
    });
  }
  return {facts,sensitivity,moments,contributions,recap,overlay,visionSuggestions,name,outcome};
})();
