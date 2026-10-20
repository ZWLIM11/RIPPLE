import {readFile,writeFile,mkdir,copyFile,readdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
const root=new URL('../',import.meta.url);
const source=new URL('prototypes/pass-detective/',root);
const out=new URL('dist/cloudflare/',root);
const assets=new URL('public/',out);
await mkdir(assets,{recursive:true});
const html=(await readFile(new URL('index.html',source),'utf8')).replace(/\r\n?/g,'\n');
const script=id=>{
  const match=html.match(new RegExp(`<script id="${id}">([\\s\\S]*?)<\\/script>`));
  if(!match)throw Error(`Missing ${id} source`);
  return match[1];
};
const ui=script('board-ui'),start=ui.indexOf('const roles='),end=ui.indexOf('let state=');
if(start<0||end<=start)throw Error('Initial state source boundary changed');
const pure=[script('passing-model'),ui.slice(start,end),
  await readFile(new URL('snapshot-model.js',source),'utf8'),
  await readFile(new URL('intelligence.js',source),'utf8')].join('\n');
await writeFile(new URL('models.mjs',out),pure+'\nexport {PassingModel,initial,SnapshotModel,MatchIntelligence};\n');
const files=['index.html','comparison.js','snapshot-model.js','snapshot-ui.js','replay-model.js',
  'replay-ui.js','intelligence.js','studio-ui.js','vision-ui.js','guide-ui.js','studio.css',
  'workspace.js','workspace.css','snapshot-tools.js','locale.js'];
// Fail closed if stale/unexpected build files could accidentally become public.
for(const entry of await readdir(assets)){
  if(!files.includes(entry)&&entry!=='_headers')throw Error(`Unexpected output asset: ${entry}. Use a fresh dist directory.`);
}
for(const file of files)await copyFile(new URL(file,source),new URL(file,assets));
// HTML parsing normalizes line endings; hash exactly what the browser executes.
await writeFile(new URL('index.html',assets),html);
const hashes=['passing-model','board-ui'].map(id=>`'sha256-${createHash('sha256').update(script(id)).digest('base64')}'`).join(' ');
await writeFile(new URL('_headers',assets),`/*
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  X-Frame-Options: DENY
  Permissions-Policy: camera=(), microphone=(), geolocation=()
  Content-Security-Policy: default-src 'self'; script-src 'self' ${hashes}; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'
`);
console.log(`Cloudflare build: ${files.length} public assets; models extracted to ${fileURLToPath(out)}`);
