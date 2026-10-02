import {fixWebmDuration} from '@fix-webm-duration/fix';
import {MAX_FILE_SIZE} from './clips';
export function waitForMedia(video:HTMLVideoElement,event:string,signal?:AbortSignal,timeout=20000){return new Promise<void>((resolve,reject)=>{const finish=(error?:Error)=>{clearTimeout(timer);video.removeEventListener(event,ready);video.removeEventListener('error',failed);signal?.removeEventListener('abort',aborted);if(error)reject(error);else resolve();};const ready=()=>finish(),failed=()=>finish(new Error('영상 파일을 재생하지 못했어요. MP4 또는 WebM 파일을 확인해주세요.')),aborted=()=>finish(new Error('저장을 취소했어요.'));const timer=setTimeout(()=>finish(new Error('영상 읽기에 시간이 오래 걸려요. 원본 파일을 첨부해주세요.')),timeout);video.addEventListener(event,ready,{once:true});video.addEventListener('error',failed,{once:true});signal?.addEventListener('abort',aborted,{once:true});if(signal?.aborted)aborted();});}
export async function videoInfo(blob:Blob,signal?:AbortSignal){const video=document.createElement('video'),url=URL.createObjectURL(blob);try{video.preload='metadata';const loaded=waitForMedia(video,'loadedmetadata',signal);video.src=url;await loaded;if(!Number.isFinite(video.duration)||video.duration<=0)throw new Error('영상 길이를 읽지 못했어요. MP4 파일을 선택해주세요.');return{durationSeconds:video.duration,width:video.videoWidth,height:video.videoHeight};}finally{video.removeAttribute('src');video.load();URL.revokeObjectURL(url);}}
export async function exportSegment(source:()=>Promise<Blob>,start:number,end:number,signal:AbortSignal,progress:(percent:number,message:string)=>void){
 if(!window.MediaRecorder||!HTMLCanvasElement.prototype.captureStream)throw new Error('이 브라우저에서 구간 저장을 지원하지 않아요. 최신 Chrome 또는 컷노트 앱에서 열어주세요.');
 if(end-start>300)throw new Error('파일로 저장할 구간은 한 번에 5분까지 지원해요. 구간을 더 짧게 나눠주세요.');
 if(end-start<.3)throw new Error('영상 파일로 저장하려면 0.3초 이상 구간을 선택해주세요.');
 const mime=['video/webm;codecs=vp8,opus','video/webm','video/mp4'].find(type=>MediaRecorder.isTypeSupported(type));if(!mime)throw new Error('저장 가능한 영상 형식이 없어요. 최신 Chrome에서 열어주세요.');
 const audio=new AudioContext();void audio.resume();const video=document.createElement('video');video.playsInline=true;video.preload='auto';video.style.cssText='position:fixed;width:2px;height:2px;left:0;bottom:0;opacity:0;pointer-events:none';document.body.appendChild(video);let url='',stream:MediaStream|undefined,recorder:MediaRecorder|undefined;
 const life=new AbortController(),abort=()=>life.abort(signal.reason);signal.addEventListener('abort',abort,{once:true});const visible=()=>{if(document.visibilityState==='hidden')life.abort(new Error('화면을 나가 저장을 중단했어요. 앱을 열어둔 상태에서 다시 저장해주세요.'));};document.addEventListener('visibilitychange',visible);
 try{
  progress(0,'원본 영상 불러오는 중…');const blob=await source();life.signal.throwIfAborted();url=URL.createObjectURL(blob);const ready=waitForMedia(video,'loadeddata',life.signal);video.src=url;await ready;
  if(end>video.duration+.05)throw new Error('구간 끝이 영상 길이를 벗어났어요. 구간 시간을 수정해주세요.');
  const scale=Math.min(1,640/Math.max(video.videoWidth,video.videoHeight),360/Math.min(video.videoWidth,video.videoHeight));const width=Math.max(2,Math.floor(video.videoWidth*scale/2)*2),height=Math.max(2,Math.floor(video.videoHeight*scale/2)*2);
  const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;const context=canvas.getContext('2d');if(!context)throw new Error('구간 영상을 만들지 못했어요.');
  if(start>0){const sought=waitForMedia(video,'seeked',life.signal);video.currentTime=start;await sought;}context.drawImage(video,0,0,width,height);
  stream=canvas.captureStream(24);const destination=audio.createMediaStreamDestination();audio.createMediaElementSource(video).connect(destination);destination.stream.getAudioTracks().forEach(track=>stream!.addTrack(track));await audio.resume();
  recorder=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:550000,audioBitsPerSecond:64000});const chunks:Blob[]=[];let size=0,elapsed=0,started=0;
  await new Promise<void>((resolve,reject)=>{
   let timer=0,stalled=0,done=false;
   const finish=(error?:Error)=>{if(done)return;done=true;clearInterval(timer);life.signal.removeEventListener('abort',cancel);video.removeEventListener('error',failed);video.pause();if(recorder!.state==='recording')elapsed+=performance.now()-started;recorder!.onstop=()=>{if(error)reject(error);else resolve();};if(recorder!.state!=='inactive')recorder!.stop();else if(error)reject(error);else resolve();};
   const cancel=()=>finish(life.signal.reason instanceof Error?life.signal.reason:new Error('저장을 취소했어요.')),failed=()=>finish(new Error('영상 재생이 중단됐어요. 파일을 첨부하고 다시 시도해주세요.'));
   life.signal.addEventListener('abort',cancel,{once:true});video.addEventListener('error',failed,{once:true});
   recorder!.ondataavailable=e=>{if(e.data.size){chunks.push(e.data);size+=e.data.size;if(size>MAX_FILE_SIZE)finish(new Error('구간 파일이 25MB를 넘었어요. 더 짧게 나눠주세요.'));}};recorder!.onerror=()=>finish(new Error('구간 변환을 완료하지 못했어요.'));
   recorder!.start(250);started=performance.now();void video.play().catch(()=>finish(new Error('영상 재생을 시작하지 못했어요. 다시 저장을 눌러주세요.')));
   timer=window.setInterval(()=>{if(life.signal.aborted){cancel();return;}if(video.currentTime>=end||video.ended){finish();return;}if(video.readyState<3){if(recorder!.state==='recording'){elapsed+=performance.now()-started;recorder!.pause();stalled=performance.now();}if(performance.now()-stalled>15000)finish(new Error('영상 읽기가 중단됐어요. 원본 파일로 다시 저장해주세요.'));return;}if(recorder!.state==='paused'){recorder!.resume();started=performance.now();}context.drawImage(video,0,0,width,height);progress(Math.min(99,Math.round((video.currentTime-start)/(end-start)*100)),'저화질 구간 영상 만드는 중…');},1000/24);
  });
  life.signal.throwIfAborted();const durationSeconds=elapsed/1000;if(Math.abs(durationSeconds-(end-start))>.35)throw new Error('저장된 영상의 길이가 구간과 달라요. 앱을 열어둔 상태에서 다시 시도해주세요.');
  let output=new Blob(chunks,{type:mime.split(';')[0]});if(output.type==='video/webm')output=await fixWebmDuration(output,elapsed,{logger:false});
  const info=await videoInfo(output,life.signal);if(Math.abs(info.durationSeconds-(end-start))>.4||!output.size||output.size>MAX_FILE_SIZE)throw new Error('구간 파일을 검증하지 못했어요. 다시 시도해주세요.');
  progress(100,'구간 파일 확인 완료');return{blob:output,...info};
 }finally{signal.removeEventListener('abort',abort);document.removeEventListener('visibilitychange',visible);if(recorder&&recorder.state!=='inactive')recorder.stop();video.pause();video.removeAttribute('src');video.load();video.remove();stream?.getTracks().forEach(t=>t.stop());await audio.close().catch(()=>{});if(url)URL.revokeObjectURL(url);}
}
