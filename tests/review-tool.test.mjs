import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import vm from 'node:vm';
const root=new URL('../tools/pass-review/',import.meta.url);
test('review pilot prepares twelve windows and keeps draft records unapproved',async()=>{
 const dom=new JSDOM(readFileSync(new URL('index.html',root),'utf8'),{url:'http://localhost:8798',runScripts:'outside-only'}),w=dom.window;
 try{
 w.fetch=async()=>({json:async()=>({sha256:'source',duration:240,fps:25,windows:Array.from({length:12},(_,i)=>({start:i*20,end:(i+1)*20}))})});
 vm.runInContext(readFileSync(new URL('review.js',root),'utf8'),dom.getInternalVMContext());await new Promise(r=>setTimeout(r,10));
 assert.equal(w.document.querySelectorAll('#window option').length,12);assert.equal(w.document.querySelector('#save').disabled,true);
 assert.match(w.document.querySelector('#count').textContent,/0 automatically approved/);
 assert.equal(w.eval('validRecord({})'),false);
 assert.equal(w.eval("validRecord({id:'a',seconds:10,image:'118577-10000.png',image_sha256:'a'.repeat(64),outcome:'unclear',target_confidence:'unclear',release_frame_verified:false,reviewer:'r',passer:'',target:'',notes:''})"),true);
 const row={id:'a',seconds:10,image:'118577-10000.png',image_sha256:'a'.repeat(64),outcome:'unclear',target_confidence:'unclear',release_frame_verified:false,reviewer:'r',passer:'',target:'',notes:''};
 const input=w.document.querySelector('#import');Object.defineProperty(input,'files',{configurable:true,value:[{size:100,text:async()=>JSON.stringify({version:1,kind:'ripple-pass-review-draft',source:{sha256:'source'},candidates:[row]})}]});
 await input.onchange({target:input});assert.match(w.document.querySelector('#count').textContent,/1 review candidates/);
 const saved=JSON.parse(w.localStorage.getItem('ripple.review.118577.v1'));assert.equal(saved[0].marked_before_outcome_review,false);
 await input.onchange({target:input});assert.equal(JSON.parse(w.localStorage.getItem('ripple.review.118577.v1')).length,1);
 }finally{w.close();}
});
