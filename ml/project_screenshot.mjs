// Research adapter: reuse production projection, never silently invent offscreen players.
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const base=new URL('../prototypes/pass-detective/',import.meta.url);
const model=vm.runInNewContext(readFileSync(new URL('snapshot-model.js',base),'utf8')+'\n'+readFileSync(new URL('frame-model.js',base),'utf8')+'\nFrameModel');
let input='';for await(const chunk of process.stdin)input+=chunk;
const rows=JSON.parse(input);
const point=p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.y)&&p.x>=0&&p.x<=1&&p.y>=0&&p.y<=1;
const output=rows.map(row=>{
  try{
    if(row.pitch_length!==105||row.pitch_width!==68)throw Error('unsupported_pitch_dimensions');
    if(!Array.isArray(row.corners)||row.corners.length!==4||!row.corners.every(point))throw Error('invalid_corners');
    if(!Array.isArray(row.players)||row.players.length<3)throw Error('insufficient_players');
    const ids=new Set();
    const players=row.players.map(p=>{
      if(typeof p.id!=='string'||ids.has(p.id)||!['home','away'].includes(p.team)||!point(p))throw Error('invalid_player');
      ids.add(p.id);return {id:p.id,team:p.team,...model.project(row.corners,p,row.region)};
    });
    const a=players.find(p=>p.id===row.passer),b=players.find(p=>p.id===row.target);
    if(!a||!b||a.id===b.id||a.team!==b.team)throw Error('invalid_passer_target');
    const defenders=players.filter(p=>p.team!==a.team);
    if(!defenders.length)throw Error('no_visible_defenders');
    return {id:row.id,passer:a,target:b,defenders};
  }catch(e){return {id:row.id,error:e.message};}
});
process.stdout.write(JSON.stringify(output));
