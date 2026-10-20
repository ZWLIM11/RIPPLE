import {PassingModel,initial,SnapshotModel,MatchIntelligence} from '../dist/cloudflare/models.mjs';
import {explain,detectMarkers} from '../ai-service.mjs';

const json=(status,body)=>Response.json(body,{status,headers:{
  'Cache-Control':'no-store','X-Content-Type-Options':'nosniff',
  'Content-Security-Policy':"default-src 'none'; frame-ancestors 'none'"}});

export async function readJSON(request,limit){
  if(Number(request.headers.get('Content-Length'))>limit)throw Object.assign(Error(),{status:413});
  const reader=request.body?.getReader();
  if(!reader)throw Object.assign(Error(),{status:400});
  const chunks=[];let total=0;
  try{
    for(;;){
      const {done,value}=await reader.read();if(done)break;
      total+=value.byteLength;
      if(total>limit){await reader.cancel();throw Object.assign(Error(),{status:413});}
      chunks.push(value);
    }
  }finally{reader.releaseLock();}
  const bytes=new Uint8Array(total);let offset=0;
  for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}
  try{return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));}
  catch{throw Object.assign(Error(),{status:400});}
}

export default {
  async fetch(request,env){
    const url=new URL(request.url);
    if(!url.pathname.startsWith('/api/'))return env.ASSETS.fetch(request);
    const enabled=env.ENABLE_AI==='true'&&Boolean(env.AI_RATE_LIMITER);
    const config=enabled?{url:env.FOUNDRY_CHAT_URL,key:env.FOUNDRY_API_KEY,
      deployment:env.FOUNDRY_DEPLOYMENT,vision:env.FOUNDRY_VISION_DEPLOYMENT}:{};
    const ai=Boolean(config.url&&config.key&&config.deployment);
    const vision=Boolean(config.url&&config.key&&config.vision);
    if(url.pathname==='/api/status'){
      if(request.method!=='GET')return json(405,{error:'GET required'});
      return json(200,{ai,vision});
    }
    if(!['/api/explain','/api/vision'].includes(url.pathname))return json(404,{error:'Unknown API'});
    if(request.method!=='POST')return json(405,{error:'POST required'});
    if(request.headers.get('Origin')!==url.origin)return json(403,{error:'Same-origin request required'});
    if(request.headers.get('Content-Type')?.split(';')[0].trim()!=='application/json')
      return json(415,{error:'JSON required'});
    try{
      // Applies to local fallback too, limiting expensive model enumeration.
      if(env.AI_RATE_LIMITER){
        const {success}=await env.AI_RATE_LIMITER.limit({key:request.headers.get('CF-Connecting-IP')||'unknown'});
        if(!success)return json(429,{error:'Too many requests. Try again in a minute.'});
      }
      const input=await readJSON(request,url.pathname==='/api/vision'?4000000:50000);
      if(!input||typeof input!=='object'||Array.isArray(input))return json(400,{error:'JSON object required'});
      if(url.pathname==='/api/explain'){
        let board,candidate;
        try{
          board=SnapshotModel.validate({schemaVersion:1,kind:'pass-detective-board',state:input.state},initial());
          if(!['en','ms'].includes(input.language)||!['fan','analyst'].includes(input.audience)||
            typeof input.question!=='string'||input.question.length>500)throw Error();
          candidate=PassingModel.candidates(board).find(c=>c.key===input.candidateKey);
          if(!candidate)throw Error();
        }catch{return json(400,{error:'Invalid decision state or candidate'});}
        return json(200,await explain({facts:MatchIntelligence.facts(board,candidate,PassingModel),
          question:input.question,language:input.language,audience:input.audience},config));
      }
      if(!vision)return json(503,{error:'Vision deployment not enabled'});
      if(typeof input.image!=='string'||!/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(input.image))
        return json(400,{error:'Invalid image'});
      return json(200,{markers:await detectMarkers(input.image,initial(),config,MatchIntelligence.visionSuggestions)});
    }catch(error){
      return json(error.status===413?413:error.status===400?400:502,
        {error:error.status===413?'Request too large':error.status===400?'Invalid JSON':'Analysis unavailable'});
    }
  }
};
