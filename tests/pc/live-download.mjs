// Opt-in service check. Downloads remain under the ignored .tools directory.
import path from 'node:path';
import {mkdir,writeFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {loadSettings} from '../../apps/pc/settings.mjs';
import {download,frames} from '../../apps/pc/media.mjs';
import {diagnose} from '../../apps/pc/process.mjs';
const root=path.resolve('.tools/live-ingestion');
process.env.CUTNOTE_DOWNLOAD_DIR=path.join(root,'videos');
const settings=await loadSettings(path.join(root,'runtime'));
await settings.update({ytDlp:path.resolve('.tools/yt-dlp.exe'),ffmpeg:path.resolve('.tools/ffmpeg/ffmpeg-9.0.2-essentials_build/bin/ffmpeg.exe'),ffprobe:path.resolve('.tools/ffmpeg/ffmpeg-9.0.2-essentials_build/bin/ffprobe.exe')});
console.log(JSON.stringify(await diagnose(settings.get())));
const results=[];
for(const [name,source] of [['youtube','https://www.youtube.com/watch?v=-hzFMRT-bbU'],['instagram','https://www.instagram.com/reel/DcwzP1IuUD9/']]){
 if(process.env.CUTNOTE_LIVE_PROVIDER&&name!==process.env.CUTNOTE_LIVE_PROVIDER)continue;
 const started=Date.now();
 try{
  const job={id:randomUUID(),payload:{source}};
  const asset=await download(settings.get(),job,AbortSignal.timeout(180000),()=>{});
  const input=await frames(settings.get(),asset,null,AbortSignal.timeout(180000),()=>{});
  await writeFile(path.join(root,'frames.json'),JSON.stringify(input));
  results.push({name,download:'passed',frames:input.frames.length,duration:asset.duration,bytes:asset.size,asset,elapsedMs:Date.now()-started});
 }catch(error){results.push({name,status:'failed',code:error.code||error.name,message:error.message,diagnostic:error.diagnostic,elapsedMs:Date.now()-started});}
 console.log(JSON.stringify(results.at(-1)));
}
await mkdir(root,{recursive:true});await writeFile(path.join(root,'result.json'),JSON.stringify(results,null,2));
