import {tagById,taxonomyVersion,categoryForTag} from './taxonomy';
import type {Tags} from './clips';
export type TagAssignment={tagId:string;aiScore:number|null;source:'ai_observed'|'ai_inferred'|'user';status:'accepted'|'suggested'|'rejected';decisionBy:'policy'|'user';evidenceMs:number[]};
export type Tagging={taxonomyVersion:string;assignments:TagAssignment[]};
export const emptyTagging=():Tagging=>({taxonomyVersion,assignments:[]});
export function parseTagging(value:unknown,durationSeconds?:number):Tagging{
 if(value===undefined||value===null)return emptyTagging();const v=value as Tagging;
 if(!v||v.taxonomyVersion!==taxonomyVersion||!Array.isArray(v.assignments)||v.assignments.length>403)throw new Error('태그 사전 버전이나 분류 정보를 확인해주세요.');
 const ids=new Set<string>();const assignments=v.assignments.map(a=>{
  const tag=tagById.get(a?.tagId);if(!tag||ids.has(a.tagId))throw new Error('알 수 없거나 중복된 표준 태그예요.');ids.add(a.tagId);
  if(!['ai_observed','ai_inferred','user'].includes(a.source)||!['accepted','suggested','rejected'].includes(a.status)||!['policy','user'].includes(a.decisionBy))throw new Error('태그 검수 정보를 확인해주세요.');
  if(a.aiScore!==null&&(typeof a.aiScore!=='number'||!Number.isFinite(a.aiScore)||a.aiScore<0||a.aiScore>1))throw new Error('AI 점수는 0~1 범위여야 해요.');
  if(a.source!=='user'&&a.aiScore===null)throw new Error('AI 점수가 없어요.');
  if(!Array.isArray(a.evidenceMs)||a.evidenceMs.length>12||a.evidenceMs.some(t=>!Number.isInteger(t)||t<0||t>7200000||(durationSeconds!==undefined&&t>Math.ceil(durationSeconds*1000))))throw new Error('태그의 영상 근거 시간을 확인해주세요.');
  const source:TagAssignment['source']=a.source==='user'?'user':tag.observable&&a.source==='ai_observed'?'ai_observed':'ai_inferred';
  if(a.source!=='user'&&!a.evidenceMs.length)throw new Error('AI 태그에 영상 근거가 없어요.');
  const status:TagAssignment['status']=a.decisionBy==='policy'&&a.status==='accepted'&&(!tag.auto_accept_allowed||source==='ai_inferred'||Number(a.aiScore)<.85)?'suggested':a.status;
  return{tagId:a.tagId,aiScore:a.aiScore,source,status,decisionBy:a.decisionBy,evidenceMs:[...new Set(a.evidenceMs)].sort((a,b)=>a-b)};
 });return{taxonomyVersion:v.taxonomyVersion,assignments:assignments.filter(a=>a.decisionBy==='user'||a.source==='user'||Number(a.aiScore)>=.6)};
}
export function aiTagging(value:unknown,durationSeconds?:number):Tagging{
 if(!Array.isArray(value)||value.length>48)throw new Error('AI 표준 태그 결과를 확인해주세요.');
 const seen=new Set<string>();const assignments:TagAssignment[]=[];
 for(const row of value){const tag=tagById.get(row?.tagId);if(!tag||seen.has(row.tagId))throw new Error('AI가 사전에 없거나 중복된 태그를 반환했어요.');seen.add(tag.id);
  const source=tag.observable?'ai_observed':'ai_inferred';
  const assignment:TagAssignment={tagId:tag.id,aiScore:row.aiScore,source,status:tag.auto_accept_allowed&&tag.observable&&row.aiScore>=.85?'accepted':'suggested',decisionBy:'policy',evidenceMs:row.evidenceMs};
  parseTagging({taxonomyVersion,assignments:[assignment]},durationSeconds);
  if(!assignment.evidenceMs.length)throw new Error('AI 태그에 영상 근거가 없어요.');
  if(Number(row.aiScore)>=.6)assignments.push(assignment);
 }return parseTagging({taxonomyVersion,assignments},durationSeconds);
}
export function mergeTagging(previous:Tagging|undefined|null,next:Tagging):Tagging{const kept=(previous?.assignments||[]).filter(a=>a.decisionBy==='user');const ids=new Set(kept.map(a=>a.tagId));return parseTagging({taxonomyVersion:next.taxonomyVersion,assignments:[...kept,...next.assignments.filter(a=>!ids.has(a.tagId))]});}
export function decideTag(value:Tagging,id:string,status:'accepted'|'rejected'){if(!tagById.has(id))throw new Error('표준 태그를 선택해주세요.');const current=value.assignments.find(a=>a.tagId===id);return parseTagging({...value,assignments:[...value.assignments.filter(a=>a.tagId!==id),{...(current||{tagId:id,aiScore:null,source:'user' as const,evidenceMs:[]}),status,decisionBy:'user'}]});}
export function acceptedTags(tagging?:Tagging|null){return(tagging?.assignments||[]).filter(a=>a.status==='accepted');}
export function projectedTags(tagging?:Tagging|null):Tags{const result:Tags={color:[],shot:[],effect:[]};for(const assignment of acceptedTags(tagging)){const tag=tagById.get(assignment.tagId);if(tag){const bucket=result[categoryForTag(tag.id)];const label=tag.display_name.slice(0,30).toLowerCase();if(!bucket.includes(label)&&bucket.length<10)bucket.push(label);}}return result;}
