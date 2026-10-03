import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,mkdir,rm,stat,symlink} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import {rangeFor,serveFile} from '../../apps/pc/server.mjs';
import {inside} from '../../apps/pc/settings.mjs';
import {run,safeEnv} from '../../apps/pc/process.mjs';
import {publicIPv4,allowedHost} from '../../apps/pc/egress.mjs';
import {sampleTimes,cleanTemporary} from '../../apps/pc/media.mjs';
import {startRunner,failureCode} from '../../apps/pc/runner.mjs';
const temp=await mkdtemp(path.join(os.tmpdir(),'cutnote-pc-test-'));
test.after(async()=>{assert(temp.startsWith(path.join(os.tmpdir(),'cutnote-pc-test-')));await rm(temp,{recursive:true,force:true});});
test('provider timeout, frame conversion and disk exhaustion remain distinguishable',()=>{
 assert.equal(failureCode(new DOMException('timed out','TimeoutError'),'analyze'),'analysis_failed');
 assert.equal(failureCode({code:'download_failed'},'frames'),'frames_failed');
 assert.equal(failureCode({code:'download_failed'},'export'),'export_failed');
 assert.equal(failureCode({code:'ENOSPC'},'analyze'),'disk_full');
});
test('restart cleanup removes only managed staging; junction roots are rejected',async()=>{
 const root=path.join(temp,'cleanup'),id=crypto.randomUUID();await mkdir(path.join(root,id,'staging'),{recursive:true});await mkdir(path.join(root,id,'frames'));await writeFile(path.join(root,id,'staging','part'),'unfinished');await writeFile(path.join(root,id,'video.mp4'),'retained');await mkdir(path.join(root,'personal'));await writeFile(path.join(root,'personal','keep'),'retained');
 await cleanTemporary({roots:{root}});await assert.rejects(stat(path.join(root,id,'staging')));await assert.rejects(stat(path.join(root,id,'frames')));assert.equal((await stat(path.join(root,id,'video.mp4'))).size,8);assert.equal((await stat(path.join(root,'personal','keep'))).size,8);
 const link=path.join(temp,'junction');await symlink(root,link,process.platform==='win32'?'junction':'dir');await assert.rejects(inside(link,'video.mp4'),/링크/);
});
test('bounded paths, SSRF policy and sample coverage',async()=>{await assert.rejects(inside(temp,'../escape'));await assert.rejects(inside(temp,'x:ads'));assert.equal(await inside(temp,'valid.mp4'),path.join(temp,'valid.mp4'));for(const ip of ['127.0.0.1','10.0.0.1','172.16.1.1','169.254.1.1','192.168.1.1','100.64.0.1','::1'])assert(!publicIPv4(ip));assert(publicIPv4('8.8.8.8'));assert(!allowedHost('youtube.com.attacker.test'));assert(allowedHost('r1.googlevideo.com'));const samples=sampleTimes(7200);assert.equal(samples.length,120);assert.equal(samples[0],.001);assert(samples.at(-1)>=7199.8);assert.deepEqual(rangeFor('bytes=-2',10),{start:8,end:9,status:206});assert.throws(()=>rangeFor('bytes=1-2,4-5',10));});
test('real child process cancellation and secret-free environment',async()=>{assert(!('OPENAI_API_KEY' in safeEnv()));assert.equal((await run(process.execPath,['-e','process.stdout.write("ok")'])).trim(),'ok');const abort=new AbortController();const p=run(process.execPath,['-e','setInterval(()=>{},1000)'],{signal:abort.signal});setTimeout(()=>abort.abort(Error('cancel test')),100);await assert.rejects(p,/cancel test/);});
test('real HTTP file streaming above Bridge legacy limit and byte ranges',async()=>{const file=path.join(temp,'large.mp4');await writeFile(file,Buffer.alloc(29*1024**2,7));const server=http.createServer((req,res)=>{void serveFile(req,res,file,'video/mp4','test').catch(()=>res.destroy());});await new Promise(r=>server.listen(0,'127.0.0.1',r));try{const url='http://127.0.0.1:'+server.address().port;let r=await fetch(url,{method:'HEAD'});assert.equal(Number(r.headers.get('content-length')),29*1024**2);r=await fetch(url,{headers:{range:'bytes=100-199'}});assert.equal(r.status,206);assert.equal((await r.arrayBuffer()).byteLength,100);r=await fetch(url,{headers:{range:'bytes=999999999-'}});assert.equal(r.status,416);r=await fetch(url);assert.equal((await r.arrayBuffer()).byteLength,29*1024**2);}finally{server.closeAllConnections();await new Promise(r=>server.close(r));}});
test('runner owns lifecycle independently of submitting browser',async()=>{const id=crypto.randomUUID(),rootId=crypto.randomUUID(),dir=path.join(temp,id);await mkdir(dir);await writeFile(path.join(dir,'video.mp4'),'fixture');const asset={root:rootId,directory:id,video:'video.mp4',size:7,duration:1};let issued=false,complete=false;const events=[];const provider=http.createServer((req,res)=>{assert.equal(req.url,'/api/ai/frames');res.setHeader('content-type','application/json');res.end(JSON.stringify({report:{engine:'openai-frames-v1'}}));});await new Promise(r=>provider.listen(0,'127.0.0.1',r));const client=async(action,data)=>{events.push(action);if(action==='claim'){if(issued)return{job:null};issued=true;return{job:{id,lease_token:'lease',payload:{source:'https://youtu.be/abcdefghijk',targets:null},asset,clip:{},revision:1}};}if(action==='complete')complete=true;return{};};const runner=startRunner({client,origin:'http://127.0.0.1:'+provider.address().port,settings:()=>({roots:{[rootId]:temp}}),extractFrames:async()=>({frames:[]}),interval:20});try{for(let i=0;i<100&&!complete;i++)await new Promise(r=>setTimeout(r,20));assert(complete);assert(events.includes('complete'));assert((await stat(path.join(dir,'result-'+id+'.json'))).size>0);}finally{await runner.close();provider.closeAllConnections();await new Promise(r=>provider.close(r));}});
