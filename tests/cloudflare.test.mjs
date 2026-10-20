import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readdir,readFile} from 'node:fs/promises';
import worker from '../cloudflare/worker.mjs';
import * as edge from '../dist/cloudflare/models.mjs';
import * as local from '../model-loader.mjs';
const base='https://pass-detective.example';
const request=(path,body,headers={})=>new Request(base+path,{method:'POST',
  headers:{Origin:base,'Content-Type':'application/json',...headers},body:JSON.stringify(body)});
const payload=()=>({state:edge.initial(),candidateKey:edge.PassingModel.candidates(edge.initial())[0].key,
  question:'Why?',language:'ms',audience:'analyst'});
const env={ASSETS:{fetch:async()=>new Response('asset')}};

test('edge model produces exactly the same recommendations as original Node model',()=>{
  for(const team of ['blue','coral']){
    const state=edge.initial();state.owner=team+'-8';const p=state.players.find(p=>p.id===state.owner);
    state.ball={x:p.x+.2,y:p.y+.2};
    assert.equal(JSON.stringify(edge.PassingModel.recommend(state)),JSON.stringify(local.PassingModel.recommend(state)));
  }
});
test('Cloudflare build contains only explicitly allowed application files',async()=>{
  const names=await readdir(new URL('../dist/cloudflare/public/',import.meta.url));
  assert.deepEqual(names.sort(),['_headers','index.html','comparison.js','snapshot-model.js',
    'snapshot-ui.js','replay-model.js','replay-ui.js','intelligence.js','studio-ui.js',
    'vision-ui.js','guide-ui.js','studio.css'].sort());
  const model=await readFile(new URL('../dist/cloudflare/models.mjs',import.meta.url),'utf8');
  assert.doesNotMatch(model,/node:|runInNewContext|eval\(/);
});
test('Worker status fails closed for AI and static requests reach assets',async()=>{
  const credentials={...env,ENABLE_AI:'false',FOUNDRY_CHAT_URL:'https://example.com',FOUNDRY_API_KEY:'secret',FOUNDRY_DEPLOYMENT:'x'};
  assert.deepEqual(await(await worker.fetch(new Request(base+'/api/status'),credentials)).json(),{ai:false,vision:false});
  assert.deepEqual(await(await worker.fetch(new Request(base+'/api/status'),{...credentials,ENABLE_AI:'true'})).json(),{ai:false,vision:false});
  assert.equal(await(await worker.fetch(new Request(base+'/'),env)).text(),'asset');
  assert.equal((await worker.fetch(request('/api/status',{}),env)).status,405);
});
test('Worker returns verified local explanation without Azure',async()=>{
  const response=await worker.fetch(request('/api/explain',payload()),env);
  assert.equal(response.status,200);const body=await response.json();
  assert.equal(body.source,'local-template');assert.equal(body.language,'ms');
  assert.ok(body.claims.length);
  assert.equal(response.headers.get('Cache-Control'),'no-store');
});
test('Worker rejects malformed requests, origins, methods, routes and oversized bodies',async()=>{
  for(const value of [null,[],{}, {...payload(),language:'xx'},{...payload(),candidateKey:'invented'}])
    assert.equal((await worker.fetch(request('/api/explain',value),env)).status,400);
  assert.equal((await worker.fetch(request('/api/explain',payload(),{Origin:'https://evil.example'}),env)).status,403);
  assert.equal((await worker.fetch(request('/api/explain',payload(),{'Content-Type':'text/plain'}),env)).status,415);
  assert.equal((await worker.fetch(new Request(base+'/api/explain'),env)).status,405);
  assert.equal((await worker.fetch(new Request(base+'/api/missing'),env)).status,404);
  assert.equal((await worker.fetch(request('/api/explain',{text:'x'.repeat(50001)}),env)).status,413);
  assert.equal((await worker.fetch(request('/api/vision',{}),env)).status,503);
});
test('Worker rate limit prevents evaluation and provider requests',async()=>{
  let called=0;
  const response=await worker.fetch(request('/api/explain',payload()),{...env,
    AI_RATE_LIMITER:{limit:async()=>{called++;return {success:false};}}});
  assert.equal(response.status,429);assert.equal(called,1);
});
