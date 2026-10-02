import {bucket,crossOrigin,database,findClip,json,unavailable} from '@/lib/server';
import {parseSegments} from '@/lib/segments';
import {MAX_FILE_SIZE} from '@/lib/clips';
import {segmentFingerprint,segmentMediaList,sourceIdentity,cleanSegmentMedia,type SegmentMediaRow} from '@/lib/segment-media';
import {mediaResponse} from '@/lib/media-response';
const changed=()=>json({error:'구간이나 원본이 바뀌었어요. 최신 구간에서 다시 저장해주세요.'},409);
type Context={params:Promise<{id:string;segmentId:string}>};
export async function GET(req:Request,{params}:Context){try{const{id,segmentId}=await params,row=await findClip(id),segment=row&&parseSegments(JSON.parse(row.segments||'[]')).find(s=>s.id===segmentId);if(!row||!segment)return json({error:'구간을 찾지 못했어요.'},404);const fingerprint=await segmentFingerprint(row,segment);if(new URL(req.url).searchParams.get('v')!==fingerprint)return changed();const file=await database().prepare('SELECT * FROM segment_media WHERE clip_id=? AND segment_id=? AND fingerprint=? AND status=? ORDER BY created_at DESC, object_key DESC LIMIT 1').bind(id,segmentId,fingerprint,'ready').first<SegmentMediaRow>();if(!file)return json({error:'아직 구간 영상 파일을 저장하지 않았어요.'},404);return mediaResponse(req,file.object_key,segment.title||row.title+' 구간');}catch(e){return unavailable(e);}}
export const HEAD=GET;
export async function POST(req:Request,{params}:Context){
 if(crossOrigin(req))return json({error:'이 페이지에서 다시 저장해주세요.'},403);
 if(Number(req.headers.get('content-length')||0)>MAX_FILE_SIZE+1024*1024)return json({error:'구간 영상은 25MB까지 저장할 수 있어요.'},413);
 let key:string|undefined;
 try{const{id,segmentId}=await params,row=await findClip(id),segment=row&&parseSegments(JSON.parse(row.segments||'[]')).find(s=>s.id===segmentId);if(!row||!segment)return json({error:'구간을 찾지 못했어요.'},404);
 const form=await req.formData(),file=form.get('video'),fingerprint=await segmentFingerprint(row,segment);if(form.get('fingerprint')!==fingerprint)return changed();
 const duration=Number(form.get('durationSeconds')),width=Number(form.get('width')),height=Number(form.get('height'));
 if(!(file instanceof File)||!file.size||file.size>MAX_FILE_SIZE||!['video/mp4','video/webm'].includes(file.type)||!Number.isFinite(duration)||Math.abs(duration-(segment.endSeconds-segment.startSeconds))>.4||![width,height].every(n=>Number.isInteger(n)&&n>0&&n<=640)||Math.min(width,height)>360)return json({error:'구간 영상 파일의 길이·형식·크기를 확인해주세요.'},400);
 const magic=new Uint8Array(await file.slice(0,16).arrayBuffer());if(file.type==='video/webm'?![0x1a,0x45,0xdf,0xa3].every((n,i)=>magic[i]===n):String.fromCharCode(...magic.slice(4,8))!=='ftyp')return json({error:'올바른 영상 파일이 아니에요.'},400);
 key=`segments/${id}/${segmentId}/${crypto.randomUUID()}`;
 await database().prepare('INSERT INTO segment_media (object_key,clip_id,segment_id,fingerprint,status,mime,size,duration_ms,width,height,created_at,source_identity,start_ms,end_ms) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)').bind(key,id,segmentId,fingerprint,'pending',file.type,file.size,Math.round(duration*1000),width,height,new Date().toISOString(),sourceIdentity(row),Math.round(segment.startSeconds*1000),Math.round(segment.endSeconds*1000)).run();
 await bucket().put(key,file.stream(),{httpMetadata:{contentType:file.type}});
 const result=await database().prepare("UPDATE segment_media SET status='ready' WHERE status='pending' AND object_key=? AND EXISTS (SELECT 1 FROM clips c, json_each(c.segments) s WHERE c.id=? AND coalesce(c.video_key,c.source_url)=? AND json_extract(s.value,'$.id')=? AND round(json_extract(s.value,'$.startSeconds')*1000)=? AND round(json_extract(s.value,'$.endSeconds')*1000)=?)").bind(key,id,sourceIdentity(row),segmentId,Math.round(segment.startSeconds*1000),Math.round(segment.endSeconds*1000)).run();
 if(!result.meta.changes){await bucket().delete(key);await database().prepare('DELETE FROM segment_media WHERE object_key=?').bind(key).run();return changed();}
 const current=await findClip(id);await cleanSegmentMedia(id);if(!current)return changed();return json({segments:await segmentMediaList(current)},201);
 }catch(e){if(key){try{await bucket().delete(key);await database().prepare('DELETE FROM segment_media WHERE object_key=?').bind(key).run();}catch{}}return unavailable(e);}
}
