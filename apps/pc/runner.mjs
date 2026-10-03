import {readFile,stat} from 'node:fs/promises';
import {download,frames,assetFile,exportLocal} from './media.mjs';
import {inside,atomicJson} from './settings.mjs';
export function failureCode(error,phase){
 if(error?.code==='ENOSPC')return'disk_full';
 const known=['analysis_failed','needs_auth','tool_missing','disk_full','unsupported','source_missing','conflict','interrupted','storage_failed','cancelled'];
 if(known.includes(error?.code))return error.code;
 return phase==='analyze'?'analysis_failed':phase==='frames'?'frames_failed':phase==='export'?'export_failed':phase==='download'?'download_failed':'storage_failed';
}
export function workerClient(origin,token){return async(action,body={},signal)=>{const response=await fetch(origin+'/api/internal/jobs',{method:'POST',headers:{'content-type':'application/json',authorization:'Bearer '+token},body:JSON.stringify({action,...body}),signal:signal||AbortSignal.timeout(15000)});const data=await response.json();if(!response.ok)throw Object.assign(Error('PC 작업 API 실패'),{code:response.status===409?'conflict':'storage_failed'});return data;};}
export function startRunner({client,origin,settings,downloadMedia=download,extractFrames=frames,interval=1500}){
 let stopped=false,busy=false,active=null;const tick=async()=>{
  if(stopped||busy)return;busy=true;let job,heartbeat,phase='download';
  try{
   job=(await client('claim')).job;if(!job)return;
   const abort=new AbortController();active=abort;const identity={id:job.id,token:job.lease_token};
   heartbeat=setInterval(()=>{void client('heartbeat',identity).then(r=>{if(r.cancel)abort.abort(Object.assign(Error('cancelled'),{code:'cancelled'}));}).catch(()=>abort.abort(Object.assign(Error('interrupted'),{code:'interrupted'})));},5000);
   if(!job.clip)throw Object.assign(Error('cancelled'),{code:'cancelled'});
   const progress=(value)=>{void client('progress',{...identity,phase,progress:value}).catch(()=>{});};
   let asset=job.asset,revision=job.revision;const config=settings();
   if(asset)try{await stat(await assetFile(config,asset));}catch{throw Object.assign(Error('source_missing'),{code:'source_missing'});}
   if(!asset){asset=await downloadMedia(config,job,abort.signal,progress);revision=(await client('attach',{...identity,asset,revision},abort.signal)).revision;}
   if(job.kind==='export'){phase='export';await client('progress',{...identity,phase,progress:50});const result=await exportLocal(config,asset,job,abort.signal);await client('complete',{...identity,result,revision},abort.signal);return;}
   const root=config.roots[asset.root],checkpoint=await inside(root,asset.directory,'result-'+job.id+'.json');let result;
   try{const saved=JSON.parse(await readFile(checkpoint,'utf8'));if(saved.payload===JSON.stringify(job.payload)&&saved.videoSize===asset.size)result=saved.result;}catch{}
   if(!result){phase='frames';await client('progress',{...identity,phase,progress:50});const input=await extractFrames(config,asset,job.payload.targets,abort.signal,progress);
    phase='analyze';await client('progress',{...identity,phase,progress:80});
    const response=await fetch(origin+'/api/ai/frames',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(input),signal:AbortSignal.any([abort.signal,AbortSignal.timeout(185000)])});
    if(!response.ok)throw Object.assign(Error('analysis_failed'),{code:'analysis_failed'});result=await response.json();await atomicJson(checkpoint,{payload:JSON.stringify(job.payload),videoSize:asset.size,result});
   }
   phase='commit';await client('progress',{...identity,phase,progress:95});await client('complete',{...identity,result,revision},abort.signal);
  }catch(e){if(job)await client('fail',{id:job.id,token:job.lease_token,code:active?.signal.aborted?active.signal.reason?.code||'interrupted':failureCode(e,phase)}).catch(()=>{});}
  finally{clearInterval(heartbeat);active=null;busy=false;}
 };
 const timer=setInterval(()=>void tick(),interval);void tick();
 return{tick,get busy(){return busy;},async close(){stopped=true;clearInterval(timer);active?.abort(Object.assign(Error('interrupted'),{code:'interrupted'}));while(busy)await new Promise(r=>setTimeout(r,50));}};
}
