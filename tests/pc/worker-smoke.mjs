// Opt-in integration: real built Worker, isolated D1, gateway, FFmpeg and Bridge.
// Uses the previously downloaded Instagram fixture. No paid provider is called.
import assert from 'node:assert/strict';
import path from 'node:path';
import {readFile,mkdir,copyFile,writeFile,readdir} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import {startPc} from '../../apps/pc/start.mjs';
import {loadSettings} from '../../apps/pc/settings.mjs';
import {createBridge} from '../../apps/android/bridge/server.mjs';
const root=path.resolve('.tools/worker-smoke'),webRoot=path.resolve('apps/web');
const sourceRoot=path.resolve('.tools/live-ingestion/videos');
const candidates=await readdir(sourceRoot);
let fixture,fixtureDir;
for(const id of candidates){try{fixture=JSON.parse(await readFile(path.join(sourceRoot,id,'asset.json')));fixtureDir=path.join(sourceRoot,id);break;}catch{}}
assert(fixture,'Run live-download first to obtain a real fixture.');
process.env.CUTNOTE_DOWNLOAD_DIR=path.join(root,'videos');
process.env.WRANGLER_SEND_METRICS='false';process.env.WRANGLER_WRITE_LOGS='false';process.env.CLOUDFLARE_CF_FETCH_ENABLED='false';
const statePath=path.join(root,'state'),runtimePath=path.join(root,'runtime');
const settings=await loadSettings(runtimePath);
const tools=JSON.parse(await readFile(path.resolve('.tools/live-ingestion/runtime/settings.json'))).tools;
await settings.update(tools);
const migration=spawnSync(process.execPath,[path.join(webRoot,'scripts/init-local-db.mjs')],{cwd:webRoot,env:{...process.env,CUTNOTE_STATE_DIR:statePath},encoding:'utf8',windowsHide:true});
assert.equal(migration.status,0,'Isolated migration failed: '+migration.stderr);
const options={webRoot,statePath,runtimePath,port:5273,workerPort:5275};
let pc=await startPc(options),bridge;
const origin='http://127.0.0.1:5273';
async function api(url,body){const response=await fetch(origin+url,body===undefined?{}:{method:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify(body)});assert(response.ok,await response.clone().text());return response.json();}
async function until(id,state){for(let i=0;i<120;i++){const job=(await api('/api/jobs')).jobs.find(j=>j.id===id);if(job&&state.includes(job.state))return job;await new Promise(r=>setTimeout(r,250));}throw Error('Job timeout');}
try{
 const status=await api('/api/ai/status');assert(status.localIngestAvailable);assert(status.canConnect);assert(!status.providers.openai,'This offline smoke must not use a paid provider');
 const id=randomUUID(),dir=path.join(settings.get().roots[settings.get().rootId],id);await mkdir(dir,{recursive:true});await copyFile(path.join(fixtureDir,'video.mp4'),path.join(dir,'video.mp4'));
 const asset={...fixture,root:settings.get().rootId,directory:id,poster:null};await writeFile(path.join(dir,'asset.json'),JSON.stringify(asset));
 const request={requestId:id,kind:'ingest',sourceUrl:'https://www.instagram.com/reel/DcwzP1IuUD9/'};
 await api('/api/jobs',request);await api('/api/jobs',request);
 const failed=await until(id,['failed']);assert.equal(failed.errorCode,'analysis_failed');
 const clips=(await api('/api/clips')).clips;assert.equal(clips.filter(c=>c.id===id).length,1);const clip=clips.find(c=>c.id===id);assert(clip.localVideo);
 let media=await fetch(origin+clip.videoUrl,{headers:{range:'bytes=0-99'}});assert.equal(media.status,206);assert.equal((await media.arrayBuffer()).byteLength,100);
 assert.equal((await fetch(origin+'/api/internal/jobs')).status,403);assert.equal((await fetch(origin+'/api/%69nternal/jobs')).status,403);assert.equal((await fetch(origin+'/api/jobs',{method:'POST',headers:{origin:'https://untrusted.example'}})).status,403);
 const segment={id:'test-segment',startSeconds:1,endSeconds:3,effects:[],note:'smoke'};
 const edit=await fetch(origin+'/api/clips/'+id,{method:'PATCH',headers:{origin,'content-type':'application/json'},body:JSON.stringify({revision:clip.revision,segments:[segment]})});assert(edit.ok,await edit.clone().text());
 const exportId=randomUUID();await api('/api/jobs',{requestId:exportId,kind:'export',clipId:id,segmentTargets:[segment]});assert.equal((await until(exportId,['completed','failed'])).state,'completed');
 const exported=(await api('/api/segment-media/'+id)).segments[0].file;assert(exported);media=await fetch(origin+exported.url,{headers:{range:'bytes=0-15'}});assert.equal(media.status,206);assert.equal((await media.arrayBuffer()).byteLength,16);
 bridge=createBridge({publicOrigin:'http://127.0.0.1:5274',projectRoot:webRoot,upstream:origin,pairingSecret:'smoke-only-pairing'}).server;await new Promise(r=>bridge.listen(5274,'127.0.0.1',r));
 assert.equal((await fetch('http://127.0.0.1:5274/api/jobs')).status,401);
 const lan=await fetch('http://127.0.0.1:5274/api/jobs',{headers:{'x-cutnote-pairing':'smoke-only-pairing'}});assert.equal(lan.status,200);assert((await lan.json()).jobs.some(j=>j.id===id));
 assert.equal((await fetch('http://127.0.0.1:5274/api/pc/settings',{headers:{'x-cutnote-pairing':'smoke-only-pairing'}})).status,403);
 await pc.close();pc=await startPc(options);const resumed=(await api('/api/jobs')).jobs;assert.equal(resumed.find(j=>j.id===id).state,'failed');assert.equal(resumed.find(j=>j.id===exportId).state,'completed');
 console.log('PASS: real Worker/D1 migration, durable duplicate receipt, cached actual Instagram source, real FFmpeg frames, missing-key analysis failure, local byte ranges/export, authenticated Bridge, blocked management/internal routes, restart persistence. OpenAI service and Android device NOT tested.');
}finally{if(bridge){bridge.closeAllConnections();await new Promise(r=>bridge.close(r));}await pc.close();}
