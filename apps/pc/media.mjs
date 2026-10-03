import {mkdir,readFile,readdir,stat,rm,rename} from 'node:fs/promises';
import path from 'node:path';
import {inside,atomicJson,requireSpace,uuid} from './settings.mjs';
import {run,toolchain} from './process.mjs';
import {egressProxy} from './egress.mjs';
const failure=code=>Object.assign(Error(code),{code});
export function sampleTimes(duration,targets){if(!Number.isFinite(duration)||duration<.1||duration>7200)throw failure('unsupported');if(targets){const count=Math.max(2,Math.floor(120/targets.length));return [...new Set(targets.flatMap(t=>{const gap=t.endSeconds-t.startSeconds,pad=Math.min(.01,gap/100),n=Math.min(count,Math.max(2,Math.ceil(gap*2)));return Array.from({length:n},(_,i)=>t.startSeconds+pad+(gap-2*pad)*i/(n-1));}))].sort((a,b)=>a-b);}const count=Math.min(120,Math.max(2,Math.ceil(duration*2))),end=Math.max(.001,duration-.1);return Array.from({length:count},(_,i)=>.001+(end-.001)*i/(count-1));}
export async function assetFile(settings,asset,poster=false){if(!uuid.test(asset?.root)||!uuid.test(asset?.directory))throw failure('source_missing');const root=settings.roots[asset.root];if(!root)throw failure('source_missing');const name=poster?asset.poster:asset.video;if(!['video.mp4','video.webm','poster.jpg'].includes(name)&&!/^export-[a-f0-9-]{36}\.mp4$/.test(name))throw failure('source_missing');return inside(root,asset.directory,name);}
export async function download(settings,job,signal,progress){
 const tools=await toolchain(settings),root=settings.roots[settings.rootId];await requireSpace(root);
 if(!uuid.test(job.id))throw failure('unsupported');const dir=await inside(root,job.id);await mkdir(dir,{recursive:true});
 const manifest=await inside(root,job.id,'asset.json');
 try{const prior=JSON.parse(await readFile(manifest,'utf8'));const file=await assetFile(settings,prior);if((await stat(file)).size===prior.size)return prior;}catch{}
 const stage=await inside(root,job.id,'staging');await mkdir(stage,{recursive:true});const proxy=await egressProxy();let timer;
 try{
  const abort=new AbortController(),combined=AbortSignal.any([signal,abort.signal]);
  timer=setInterval(()=>{void (async()=>{await requireSpace(root,512*1024**2);let size=0;for(const name of await readdir(stage)){const f=await inside(root,job.id,'staging',name);const info=await stat(f);if(info.isFile())size+=info.size;}if(size>3*1024**3)throw failure('disk_full');})().catch(e=>abort.abort(e));},2000);
  const args=['--ignore-config','--no-plugin-dirs','--no-remote-components','--no-js-runtimes','--js-runtimes','node:'+process.execPath,'--proxy',proxy.url,'--no-playlist','--max-downloads','1','--socket-timeout','30','--retries','2','--fragment-retries','2','--max-filesize','2G','--match-filters','!is_live & duration <=? 7200','--ffmpeg-location',path.dirname(tools.ffmpeg),'-f','bv*[height<=?1080][vcodec^=avc1]+ba[acodec^=mp4a]/b[height<=?1080][ext=mp4]/b[height<=?1080]','--merge-output-format','mp4','--newline','--progress-template','download:%(progress._percent_str)s','-o',path.join(stage,'source.%(ext)s'),'--',job.payload.source];
  await run(tools.ytDlp,args,{signal:combined,timeout:30*60000,successCodes:[0,101],onLine:line=>{const n=parseFloat(line);if(Number.isFinite(n))progress(Math.round(n*.5));}});
  const candidates=(await readdir(stage)).filter(name=>/^source\.(mp4|webm|mkv)$/.test(name));if(candidates.length!==1)throw failure('unsupported');const source=await inside(root,job.id,'staging',candidates[0]);if((await stat(source)).size>2*1024**3)throw failure('unsupported');
  const info=JSON.parse(await run(tools.ffprobe,['-v','error','-protocol_whitelist','file,pipe','-show_format','-show_streams','-of','json',source],{signal}));
  let duration=Number(info.streams?.find(s=>s.codec_type==='video')?.duration||info.format?.duration);if(!info.streams?.some(s=>s.codec_type==='video')||!Number.isFinite(duration)||duration<.1||duration>7200)throw failure('unsupported');
  const output=await inside(root,job.id,'video.mp4'),pending=await inside(root,job.id,'staging','playback.mp4');
  await run(tools.ffmpeg,['-nostdin','-y','-protocol_whitelist','file,pipe','-i',source,'-map','0:v:0','-map','0:a:0?',...(info.streams.some(s=>s.codec_type==='video'&&s.codec_name!=='h264'||s.codec_type==='audio'&&s.codec_name!=='aac')?['-c:v','libx264','-preset','fast','-crf','22','-c:a','aac']:['-c','copy']),'-movflags','+faststart',pending],{signal,timeout:10*60000});
  const normalized=JSON.parse(await run(tools.ffprobe,['-v','error','-protocol_whitelist','file,pipe','-show_streams','-show_format','-of','json',pending],{signal}));duration=Number(normalized.streams?.find(s=>s.codec_type==='video')?.duration||normalized.format?.duration);
  const size=(await stat(pending)).size;if(size>2*1024**3)throw failure('unsupported');await rename(pending,output);
  const asset={root:settings.rootId,directory:job.id,video:'video.mp4',poster:null,size,duration,mime:'video/mp4'};
  await atomicJson(manifest,asset);
  const poster=await inside(root,job.id,'poster.jpg');try{await run(tools.ffmpeg,['-nostdin','-y','-protocol_whitelist','file,pipe','-i',output,'-frames:v','1','-vf','scale=640:640:force_original_aspect_ratio=decrease,format=yuvj420p',poster],{signal});asset.poster='poster.jpg';}catch{if(signal.aborted)throw signal.reason;}
  await atomicJson(manifest,asset);return asset;
 }catch(error){if(proxy.blocked.size)error.diagnostic=(error.diagnostic||'')+' Blocked hosts: '+[...proxy.blocked].join(', ');throw error;}finally{clearInterval(timer);proxy.close();await cleanDirectory(root,job.id,'staging');}
}
export async function cleanDirectory(root,id,name){if(!uuid.test(id)||!['staging','frames'].includes(name))throw failure('storage_failed');const dir=await inside(root,id,name);await rm(dir,{recursive:true,force:true});}
export async function cleanTemporary(settings){
 for(const root of Object.values(settings.roots)){
  let entries;try{entries=await readdir(root,{withFileTypes:true});}catch(error){if(error.code==='ENOENT')continue;throw error;}
  for(const entry of entries)if(entry.isDirectory()&&uuid.test(entry.name)){await cleanDirectory(root,entry.name,'staging');await cleanDirectory(root,entry.name,'frames');}
 }
}
export async function exportLocal(settings,asset,job,signal){
 const tools=await toolchain(settings),root=settings.roots[asset.root],source=await assetFile(settings,asset),target=job.payload.targets?.[0];
 if(!target||!uuid.test(job.id)||target.endSeconds-target.startSeconds>300)throw failure('unsupported');
 await requireSpace(root,512*1024**2);
 const name='export-'+job.id+'.mp4',final=await inside(root,asset.directory,name);const stage=await inside(root,asset.directory,'frames');await mkdir(stage,{recursive:true});const output=await inside(root,asset.directory,'frames',name);
 try{
  await run(tools.ffmpeg,['-nostdin','-y','-ss',String(target.startSeconds),'-protocol_whitelist','file,pipe','-i',source,'-t',String(target.endSeconds-target.startSeconds),'-map','0:v:0','-map','0:a:0?','-vf','scale=640:360:force_original_aspect_ratio=decrease:force_divisible_by=2','-c:v','libx264','-preset','fast','-crf','25','-pix_fmt','yuv420p','-c:a','aac','-b:a','96k','-movflags','+faststart','-fs',String(26*1024**2),output],{signal,timeout:10*60000});
  const size=(await stat(output)).size;if(size>25*1024**2)throw failure('unsupported');
  const info=JSON.parse(await run(tools.ffprobe,['-v','error','-protocol_whitelist','file,pipe','-show_streams','-show_format','-of','json',output],{signal}));
  const video=info.streams.find(s=>s.codec_type==='video'),duration=Number(info.format.duration);
  if(!video||Math.abs(duration-(target.endSeconds-target.startSeconds))>.4)throw failure('unsupported');
  await rename(output,final);return{...asset,video:name,poster:null,size,duration,width:video.width,height:video.height};
 }finally{await cleanDirectory(root,asset.directory,'frames');}
}
export async function frames(settings,asset,targets,signal,progress){
 const tools=await toolchain(settings),root=settings.roots[asset.root],source=await assetFile(settings,asset);await stat(source);
 const info=JSON.parse(await run(tools.ffprobe,['-v','error','-protocol_whitelist','file,pipe','-select_streams','v:0','-show_entries','stream=avg_frame_rate','-of','json',source],{signal}));const rate=String(info.streams?.[0]?.avg_frame_rate||'30/1').split('/').map(Number),fps=rate[0]/rate[1],frameStep=Number.isFinite(fps)&&fps>0?Math.min(1,1/fps):1/30;
 const dir=await inside(root,asset.directory,'frames');await mkdir(dir,{recursive:true});const samples=sampleTimes(asset.duration,targets),result=[];
 try{for(let i=0;i<samples.length;i++){signal.throwIfAborted();const image=await inside(root,asset.directory,'frames',i+'.jpg');await run(tools.ffmpeg,['-nostdin','-y','-ss',String(Math.max(0,samples[i]-frameStep)),'-protocol_whitelist','file,pipe','-i',source,'-frames:v','1','-vf','scale=480:480:force_original_aspect_ratio=decrease,format=yuvj420p','-q:v','5',image],{signal,timeout:30000});const data=await readFile(image);if(data.length>300000)throw failure('unsupported');result.push({seconds:samples[i],image:'data:image/jpeg;base64,'+data.toString('base64')});progress(50+Math.round((i+1)/samples.length*25));}const body={frames:result,durationSeconds:asset.duration,...(targets?{segmentTargets:targets}:{})};if(Buffer.byteLength(JSON.stringify(body))>20*1024**2)throw failure('unsupported');return body;
 }finally{await cleanDirectory(root,asset.directory,'frames');}
}
