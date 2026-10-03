import {bucket,crossOrigin,database,findClip,json,serialize,unavailable} from '@/lib/server';
import {MAX_FILE_SIZE,videoTypes} from '@/lib/clips';
import {parseSegments} from '@/lib/segments';
import {mediaResponse} from '@/lib/media-response';
import {cleanSegmentMedia} from '@/lib/segment-media';
export async function GET(req:Request,{params}:{params:Promise<{id:string}>}){try{const{id}=await params,row=await findClip(id),key=new URL(req.url).searchParams.get('poster')==='1'?row?.poster_key:row?.video_key;if(!key||!row)return json({error:'파일을 찾지 못했어요.'},404);return mediaResponse(req,key,row.title);}catch(e){return unavailable(e);}}
export const HEAD=GET;
export async function POST(req:Request,{params}:{params:Promise<{id:string}>}){
 if(crossOrigin(req))return json({error:'이 페이지에서 다시 저장해주세요.'},403);
 if(Number(req.headers.get('content-length')||0)>MAX_FILE_SIZE+1024*1024)return json({error:'영상 파일은 25MB까지 저장할 수 있어요.'},413);
 let key:string|undefined;
 try{const{id}=await params,row=await findClip(id);if(!row)return json({error:'영상을 찾지 못했어요.'},404);if(row.video_key||row.local_asset)return json({error:'이미 영상 파일을 보관하고 있어요.'},409);
 const form=await req.formData(),file=form.get('video'),duration=Number(form.get('durationSeconds'));
 if(!(file instanceof File)||!file.size||file.size>MAX_FILE_SIZE||!videoTypes.includes(file.type)||!Number.isFinite(duration)||duration<=0||duration>7200)return json({error:'25MB 이하의 재생 가능한 영상 파일을 선택해주세요.'},400);
 const prior=serialize(row),known=prior.analysis&&'durationSeconds' in prior.analysis?prior.analysis.durationSeconds:undefined;
 if((known!==undefined&&Math.abs(known-duration)>1)||parseSegments(prior.segments).some(s=>s.endSeconds>duration+.05))return json({error:'저장된 구간과 파일 길이가 달라요. 같은 영상의 원본 파일을 선택해주세요.'},400);
 key=`clips/${id}/video-${crypto.randomUUID()}`;await bucket().put(key,file.stream(),{httpMetadata:{contentType:file.type}});
 const result=await database().prepare('UPDATE clips SET video_key=?,revision=revision+1 WHERE id=? AND video_key IS NULL AND revision=?').bind(key,id,row.revision||0).run();
 if(!result.meta.changes){await bucket().delete(key);return json({error:'영상 정보가 바뀌었어요. 다시 열고 파일을 첨부해주세요.'},409);}key=undefined;
 const current=await findClip(id);await cleanSegmentMedia(id);if(!current)return json({error:'영상이 삭제됐어요.'},404);return json({clip:serialize(current)},201);
 }catch(e){if(key)try{await bucket().delete(key);}catch{}return unavailable(e);}
}
