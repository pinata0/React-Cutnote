import {shareIdPattern} from '@/lib/mobile-share';
import {readLibraryOrder} from '@/lib/library-order-server';
import {parseTagging,type Tagging} from '@/lib/tagging';
import {parseSegments,type ClipSegment} from '@/lib/segments';
import {MAX_FILE_SIZE,validateFields,videoTypes} from '@/lib/clips';
import {parseAnalysis,type AnalysisReport} from '@/lib/analysis/types';
import {linkTitle} from '@/lib/links/types';
import {bucket,crossOrigin,database,findClip,json,serialize,unavailable,type ClipRow} from '@/lib/server';
export async function GET(){try{const [result,order]=await Promise.all([database().prepare('SELECT * FROM clips ORDER BY created_at DESC, id DESC').all<ClipRow>(),readLibraryOrder()]);return json({clips:result.results.map(serialize),order});}catch(e){return unavailable(e);}}
export async function POST(req:Request){
 if(crossOrigin(req))return json({error:'이 페이지에서 다시 등록해주세요.'},403);
 if(Number(req.headers.get('content-length')||0)>MAX_FILE_SIZE+2*1024*1024)return json({error:'파일은 25MB까지 등록할 수 있어요.'},413);
 let form:FormData,fields:ReturnType<typeof validateFields>,sourceUrl:string,video:File|null,poster:File|null,analysis:AnalysisReport|null,segments:ClipSegment[],tagging:Tagging,idempotencyKey:string;
 try{
  form=await req.formData();idempotencyKey=String(form.get('idempotencyKey')||'').toLowerCase();if(idempotencyKey&&!shareIdPattern.test(idempotencyKey))throw new Error('공유 요청 정보를 확인해주세요.');fields=validateFields({title:String(form.get('title')||'').trim()||linkTitle(String(form.get('sourceUrl')||'')),notes:form.get('notes')||'',tags:JSON.parse(String(form.get('tags')||'{}'))});
  analysis=parseAnalysis(form.get('analysis')?JSON.parse(String(form.get('analysis'))):null);tagging=parseTagging(form.get('tagging')?JSON.parse(String(form.get('tagging'))):analysis?.tagging,analysis&&(analysis.engine==='openai-frames-v1'||analysis.engine==='gemini-video-v1')?analysis.durationSeconds:undefined);
  segments=parseSegments(form.get('segments')?JSON.parse(String(form.get('segments'))):[],analysis&&(analysis.engine==='openai-frames-v1'||analysis.engine==='gemini-video-v1')?analysis.durationSeconds:undefined);
  const raw=String(form.get('sourceUrl')||'').trim();sourceUrl='';
  video=form.get('video') instanceof File?form.get('video') as File:null;poster=form.get('poster') instanceof File?form.get('poster') as File:null;
  if(idempotencyKey&&(video||poster))throw new Error('자동 공유 저장은 영상 링크만 지원해요.');
  if(video){if(!video.size||video.size>MAX_FILE_SIZE)throw new Error('0MB보다 크고 25MB 이하인 파일을 선택해주세요.');if(!videoTypes.includes(video.type))throw new Error('MP4, WebM, MOV, OGG 영상 파일을 선택해주세요.');}
  else{if(!raw||raw.length>2000)throw new Error('영상 링크를 입력해주세요.');const url=new URL(raw);if(!['https:','http:'].includes(url.protocol)||url.username||url.password)throw new Error('http 또는 https 영상 링크를 입력해주세요.');sourceUrl=url.href;}
  if(poster&&(poster.type!=='image/jpeg'||poster.size>1024*1024))throw new Error('미리보기 이미지를 만들지 못했어요. 파일을 다시 선택해주세요.');
 }catch(e){return json({error:e instanceof SyntaxError||e instanceof TypeError?'입력 형식이나 영상 링크를 확인해주세요.':e instanceof Error?e.message:'입력을 확인해주세요.'},400);}
 const id=idempotencyKey||crypto.randomUUID(),videoKey=video?'clips/'+id+'/video':null;let posterKey=poster?'clips/'+id+'/poster':null;
 try{
  if(video&&videoKey)await bucket().put(videoKey,video.stream(),{httpMetadata:{contentType:video.type}});
  if(poster&&posterKey){try{await bucket().put(posterKey,poster.stream(),{httpMetadata:{contentType:'image/jpeg'}});}catch{const failedPosterKey=posterKey;posterKey=null;console.warn('Cutnote poster unavailable; saving clip without poster');try{await bucket().delete(failedPosterKey);}catch{}}}
  const row:ClipRow={id,title:fields.title,notes:fields.notes,tags:JSON.stringify(fields.tags),source_url:sourceUrl,video_key:videoKey,poster_key:posterKey,created_at:new Date().toISOString(),analysis:analysis?JSON.stringify(analysis):null,segments:JSON.stringify(segments),tagging:JSON.stringify(tagging),revision:0,analysis_history:JSON.stringify(analysis?[analysis]:[])};
  const insertion=await database().prepare('INSERT INTO clips (id,title,source_url,video_key,poster_key,tags,notes,created_at,analysis,segments,tagging,revision,analysis_history) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)'+(idempotencyKey?' ON CONFLICT(id) DO NOTHING':'')).bind(id,row.title,sourceUrl,videoKey,posterKey,row.tags,row.notes,row.created_at,row.analysis,row.segments,row.tagging,row.revision,row.analysis_history).run();
  if(idempotencyKey&&!insertion.meta.changes){const existing=await findClip(id);if(!existing||existing.source_url!==sourceUrl||existing.video_key)return json({error:'같은 공유 요청에 다른 영상이 있어요. 영상을 다시 공유해주세요.'},409);return json({clip:serialize(existing),reused:true});}
  return json({clip:serialize(row),reused:false},201);
 }catch(e){try{const keys=[videoKey,posterKey].filter((s):s is string=>Boolean(s));if(keys.length)await bucket().delete(keys);}catch{}return unavailable(e);}
}
