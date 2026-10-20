import assert from 'node:assert/strict';
import {initial,PassingModel} from '../model-loader.mjs';
const base=process.env.PASS_DETECTIVE_URL||'http://127.0.0.1:3001';
for(const path of ['/','/studio-ui.js','/intelligence.js','/vision-ui.js','/studio.css','/workspace.js','/workspace.css','/snapshot-tools.js','/locale.js','/api/status']){
  assert.equal((await fetch(base+path)).status,200,path);
}
const state=initial(),candidateKey=PassingModel.candidates(state)[0].key;
const post=(path,data,origin=base)=>fetch(base+path,{method:'POST',headers:{'Content-Type':'application/json',Origin:origin},body:JSON.stringify(data)});
const status=await(await fetch(base+'/api/status')).json();
if(!status.ai){
  const res=await post('/api/explain',{state,candidateKey,question:'Why?',language:'ms',audience:'fan'});
  assert.equal(res.status,200);const data=await res.json();assert.equal(data.source,'local-template');assert.ok(data.claims.length);
}
assert.equal((await post('/api/explain',{},'https://other.example')).status,403);
assert.equal((await post('/api/explain',{})).status,400);
assert.equal((await fetch(base+'/api/explain')).status,405);
assert.equal((await fetch(base+'/.env')).status,404);
assert.equal((await fetch(base+'/server.mjs')).status,404);
console.log('HTTP checks passed: assets, fallback, validation, origin and private-file isolation.');
