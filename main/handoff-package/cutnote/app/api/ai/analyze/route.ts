import {parseSegmentTargets,type SegmentTarget} from '@/lib/segment-tagging';
import {apiKey} from '@/lib/ai/settings';
import {generateVideo,uploadVideo,deleteVideo} from '@/lib/ai/gemini';
import {videoProvider} from '@/lib/links/provider';
import {resolveLink} from '@/lib/links/resolve';
import {fetchPublic,readLimited} from '@/lib/links/fetch';
import {crossOrigin,json,bucket,findClip} from '@/lib/server';
import {MAX_FILE_SIZE,videoTypes} from '@/lib/clips';
const knownDuration=(value:unknown)=>typeof value==='number'&&Number.isFinite(value)&&value>0?value:undefined;
async function youtubeDuration(url:string){
 let timeout:ReturnType<typeof setTimeout>|undefined;
 try{return await Promise.race([resolveLink(url).then(info=>knownDuration(info.durationSeconds)),new Promise<undefined>(resolve=>{timeout=setTimeout(()=>resolve(undefined),5000);})]);}
 catch{return undefined;}
 finally{if(timeout)clearTimeout(timeout);}
}
function uploadedDuration(value:unknown){return typeof value==='string'&&/^\d+(?:\.\d{1,9})?s$/.test(value)?knownDuration(Number(value.slice(0,-1))):undefined;}
export async function POST(req:Request){
 if(crossOrigin(req))return json({error:'이 페이지에서 다시 분석해주세요.'},403);
 if(Number(req.headers.get('content-length')||0)>MAX_FILE_SIZE+1024*1024)return json({error:'영상은 25MB까지 분석할 수 있어요.'},413);
 let key:string|null=null,uploadedName:string|undefined;
 const signal=AbortSignal.any([req.signal,AbortSignal.timeout(180000)]);
 try{
  key=await apiKey('gemini');if(!key)return json({error:'전체 영상 분석을 사용하려면 AI 연결에서 Gemini API 키를 한 번 등록해주세요.',code:'AI_NOT_CONNECTED'},409);
  let segmentTargets:SegmentTarget[]|undefined;let uri:string|undefined,mime:string|undefined,durationSeconds:number|undefined,source:{body:ReadableStream<Uint8Array>;size:number;mime:string}|undefined;
  if(req.headers.get('content-type')?.startsWith('multipart/form-data')){const form=await req.formData();segmentTargets=parseSegmentTargets(form.has('segmentTargets')?JSON.parse(String(form.get('segmentTargets'))):undefined);const file=form.get('video');if(!(file instanceof File)||!file.size||file.size>MAX_FILE_SIZE||!videoTypes.includes(file.type))return json({error:'25MB 이하의 지원되는 영상 파일을 선택해주세요.'},400);source={body:file.stream(),size:file.size,mime:file.type};}
  else{const body=await req.json() as {url?:unknown;clipId?:unknown;segmentTargets?:unknown};segmentTargets=parseSegmentTargets(body.segmentTargets);
   if(typeof body.clipId==='string'){const row=await findClip(body.clipId);if(!row?.video_key)return json({error:'저장된 영상 파일을 찾지 못했어요.'},404);const obj=await bucket().get(row.video_key);if(!obj||obj.size>MAX_FILE_SIZE)return json({error:'저장된 영상 파일을 읽지 못했어요.'},422);source={body:obj.body,size:obj.size,mime:obj.httpMetadata?.contentType||'video/mp4'};}
   else if(typeof body.url==='string'){const provider=videoProvider(body.url);if(provider?.kind==='youtube'){uri=provider.url;durationSeconds=await youtubeDuration(provider.url);}else{const info=await resolveLink(body.url);durationSeconds=knownDuration(info.durationSeconds);if(!info.mediaUrl)return json({error:'원본 전체 영상에 접근할 수 없어 분석하지 않았어요. 사이트 안 재생은 가능하지만, 전체 분석에는 공개 영상 파일이나 접근 가능한 원본이 필요해요.',code:'VIDEO_UNAVAILABLE'},422);const{response}=await fetchPublic(info.mediaUrl,'video/*');mime=(response.headers.get('content-type')||'').split(';')[0];if(!videoTypes.includes(mime)){await response.body?.cancel();throw new Error('원본이 분석 가능한 영상 파일이 아니에요.');}const data=await readLimited(response,MAX_FILE_SIZE);const blob=new Blob([data],{type:mime});source={body:blob.stream(),size:blob.size,mime};}}
   else return json({error:'영상 링크나 파일을 선택해주세요.'},400);
  }
  if(source){const uploaded=await uploadVideo(key,source,signal);uploadedName=uploaded.name;uri=uploaded.uri;mime=source.mime;durationSeconds=uploadedDuration(uploaded.videoMetadata?.videoDuration)??durationSeconds;}
  if(!uri)return json({error:'분석할 전체 영상이 없어요.'},400);
  if(durationSeconds!==undefined&&durationSeconds>7200)return json({error:'영상은 최대 2시간까지 분석할 수 있어요.'},400);
  signal.throwIfAborted();
  return json(await generateVideo(key,uri,mime,signal,{durationSeconds,segmentTargets:parseSegmentTargets(segmentTargets,durationSeconds)}));
 }catch(error){return json({error:signal.aborted?'분석을 취소했거나 처리 시간이 초과됐어요.':error instanceof Error?error.message:'영상 전체를 분석하지 못했어요.'},422);}
 finally{if(key&&uploadedName)await deleteVideo(key,uploadedName);}
}
