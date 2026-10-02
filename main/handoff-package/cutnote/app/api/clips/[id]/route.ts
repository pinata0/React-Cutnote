import {parseFavoriteChange,updateFavorite} from '@/lib/favorites';
import {cleanSegmentMedia} from '@/lib/segment-media';
import {parseSegments} from '@/lib/segments';
import {parseTagging,mergeTagging,decideTag} from '@/lib/tagging';
import {validateFields} from '@/lib/clips';
import {parseAnalysis} from '@/lib/analysis/types';
import {bucket,crossOrigin,database,findClip,json,serialize,unavailable} from '@/lib/server';
const conflict=()=>json({error:'다른 화면에서 클립을 수정했어요. 최신 내용을 다시 열어주세요. 수정 내용은 덮어쓰지 않았어요.',code:'CLIP_CHANGED'},409);
export async function PATCH(req:Request,{params}:{params:Promise<{id:string}>}){
 if(crossOrigin(req))return json({error:'이 페이지에서 다시 수정해주세요.'},403);
 let body:Record<string,unknown>;try{body=await req.json() as Record<string,unknown>;if(!body||typeof body!=='object')throw new Error();}catch{return json({error:'입력 내용을 확인해주세요.'},400);}
 try{
  const{id}=await params;if(Object.prototype.hasOwnProperty.call(body,'favoriteChange')){let change;try{change=parseFavoriteChange(body);}catch(e){return json({error:(e as Error).message},400);}return await updateFavorite(id,change);}
  const row=await findClip(id);if(!row)return json({error:'클립을 찾지 못했어요.'},404);const prior=serialize(row);
  if(body.revision!==undefined&&body.revision!==prior.revision)return conflict();
  if(body.expected!==undefined){const expected=body.expected as Record<string,unknown>;if(!expected||typeof expected!=='object')return conflict();for(const key of ['title','notes','tags','analysis','segments','tagging','revision'] as const){if(Object.prototype.hasOwnProperty.call(expected,key)&&JSON.stringify(expected[key])!==JSON.stringify(prior[key]??(key==='analysis'?null:undefined)))return conflict();}}
  let fields,analysis,segments,tagging,history;
  try{
   fields=validateFields({title:body.title??prior.title,notes:body.notes??prior.notes,tags:body.tags??prior.tags});
   analysis=Object.prototype.hasOwnProperty.call(body,'analysis')?parseAnalysis(body.analysis):prior.analysis??null;
   const duration=analysis&&(analysis.engine==='openai-frames-v1'||analysis.engine==='gemini-video-v1')?analysis.durationSeconds:undefined;
   segments=parseSegments(Object.prototype.hasOwnProperty.call(body,'segments')?body.segments:prior.segments||[],duration);
   tagging=body.tagging===undefined?prior.tagging!:parseTagging(body.tagging,duration);
   if(body.tagging===undefined&&body.analysis!==undefined&&analysis?.tagging)tagging=mergeTagging(prior.tagging,analysis.tagging);
   if(body.tagDecision!==undefined){const decision=body.tagDecision as {tagId?:unknown;status?:unknown};if(!decision||typeof decision.tagId!=='string'||!['accepted','rejected'].includes(String(decision.status)))throw new Error('태그 승인 또는 거절을 선택해주세요.');tagging=decideTag(tagging,decision.tagId,decision.status as 'accepted'|'rejected');}
   history=prior.analysisHistory||[];if(prior.analysis&&!history.some(r=>JSON.stringify(r)===JSON.stringify(prior.analysis)))history=[...history,prior.analysis];if(analysis&&JSON.stringify(analysis)!==JSON.stringify(prior.analysis))history=[...history,analysis].slice(-10);
  }catch(e){return json({error:e instanceof Error?e.message:'입력을 확인해주세요.'},400);}
  const updated={...row,title:fields.title,tags:JSON.stringify(fields.tags),notes:fields.notes,analysis:analysis?JSON.stringify(analysis):null,segments:JSON.stringify(segments),tagging:JSON.stringify(tagging),analysis_history:JSON.stringify(history),revision:(row.revision||0)+1};
  const result=await database().prepare(`UPDATE clips SET title=?,tags=?,notes=?,analysis=?,segments=?,tagging=?,analysis_history=?,revision=?,favorite_segments=COALESCE((SELECT json_group_array(value) FROM json_each(favorite_segments) WHERE value IN (SELECT json_extract(value,'$.id') FROM json_each(?))), '[]') WHERE id=? AND revision=?`).bind(updated.title,updated.tags,updated.notes,updated.analysis,updated.segments,updated.tagging,updated.analysis_history,updated.revision,updated.segments,id,row.revision||0).run();
  if(!result.meta.changes)return conflict();try{await cleanSegmentMedia(id);}catch{}const current=await findClip(id);return current?json({clip:serialize(current)}):json({error:'영상을 찾지 못했어요.'},404);
 }catch(e){return unavailable(e);}
}
export async function DELETE(req:Request,{params}:{params:Promise<{id:string}>}){
 if(crossOrigin(req))return json({error:'이 페이지에서 다시 삭제해주세요.'},403);
 try{const{id}=await params;const row=await findClip(id);if(!row){await cleanSegmentMedia(id);return json({deleted:true});}const keys=[row.video_key,row.poster_key].filter((s):s is string=>Boolean(s));const deleted=await database().prepare('DELETE FROM clips WHERE id=? AND revision=?').bind(id,row.revision||0).run();if(!deleted.meta.changes)return conflict();if(keys.length)await bucket().delete(keys);await cleanSegmentMedia(id);return json({deleted:true});}catch(e){return unavailable(e);}
}
