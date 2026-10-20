import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve,sep,extname} from 'node:path';
import {PassingModel,SnapshotModel,MatchIntelligence,initial} from './model-loader.mjs';
import {explain,detectMarkers} from './ai-service.mjs';
try{process.loadEnvFile(fileURLToPath(new URL('.env',import.meta.url)));}catch{}
const config={url:process.env.FOUNDRY_CHAT_URL,key:process.env.FOUNDRY_API_KEY,deployment:process.env.FOUNDRY_DEPLOYMENT,vision:process.env.FOUNDRY_VISION_DEPLOYMENT};
const root=resolve(fileURLToPath(new URL('./prototypes/pass-detective/',import.meta.url)));
const json=(res,status,body)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(body));};
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8'};
let busy=false;
http.createServer(async(req,res)=>{
  try{
    const path=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
    if(path==='/api/status'){
      if(req.method!=='GET')return json(res,405,{error:'GET required'});
      return json(res,200,{ai:Boolean(config.url&&config.key&&config.deployment),vision:Boolean(config.url&&config.key&&config.vision)});
    }
    if(path.startsWith('/api/')){
      if(!['/api/explain','/api/vision'].includes(path))return json(res,404,{error:'Unknown API'});
      if(req.method!=='POST')return json(res,405,{error:'POST required'});
      if(req.headers.origin!==`http://${req.headers.host}`)return json(res,403,{error:'Same-origin browser request required'});
      if(!req.headers['content-type']?.startsWith('application/json'))return json(res,415,{error:'JSON required'});
      const limit=path==='/api/vision'?4000000:50000;
      let raw='',bytes=0;for await(const chunk of req){bytes+=chunk.length;if(bytes>limit)return json(res,413,{error:'Request too large'});raw+=chunk;}
      let input;try{input=JSON.parse(raw);}catch{return json(res,400,{error:'Invalid JSON'});}
      if(!input||typeof input!=='object'||Array.isArray(input))return json(res,400,{error:'JSON object required'});
      if(busy)return json(res,429,{error:'An analysis is already running. Try again shortly.'});
      if(path==='/api/explain'){
        let board,candidate;
        try{
          board=SnapshotModel.validate({schemaVersion:1,kind:'pass-detective-board',state:input.state},initial());
          if(!['en','ms'].includes(input.language)||!['fan','analyst'].includes(input.audience)||typeof input.question!=='string'||input.question.length>500)throw Error();
          candidate=PassingModel.candidates(board).find(c=>c.key===input.candidateKey);
          if(!candidate)throw Error();
        }catch{return json(res,400,{error:'Invalid decision state or candidate'});}
        busy=true;
        try{return json(res,200,await explain({facts:MatchIntelligence.facts(board,candidate,PassingModel),question:input.question,language:input.language,audience:input.audience},config));}
        finally{busy=false;}
      }
      if(!config.vision)return json(res,503,{error:'Vision deployment not configured'});
      if(typeof input.image!=='string'||!/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(input.image))
        return json(res,400,{error:'Invalid image'});
      busy=true;
      try{return json(res,200,{markers:await detectMarkers(input.image,initial(),config,MatchIntelligence.visionSuggestions)});}
      finally{busy=false;}
    }
    if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);res.end();return;}
    const file=resolve(root,'.'+(path==='/'?'/index.html':path));
    if(!file.startsWith(root+sep)){res.writeHead(403);res.end();return;}
    const bytes=await readFile(file);
    res.writeHead(200,{'Content-Type':mime[extname(file)]||'application/octet-stream','X-Content-Type-Options':'nosniff'});
    res.end(req.method==='HEAD'?undefined:bytes);
  }catch(error){if(req.url.startsWith('/api/'))json(res,502,{error:'Analysis unavailable. Check server configuration and try again.'});else{res.writeHead(404);res.end('Not found');}}
}).listen(Number(process.env.PORT)||3001,'127.0.0.1',()=>console.log(`Pass Detective: http://localhost:${process.env.PORT||3001}`));
