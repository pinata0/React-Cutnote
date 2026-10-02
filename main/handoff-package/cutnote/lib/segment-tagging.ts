import {parseSegments,type ClipSegment} from './segments';
import {emptyTagging,mergeTagging,decideTag,type Tagging} from './tagging';
import {resolveAliases,categoryForTag} from './taxonomy';
import {splitTags,type Category} from './clips';
export type SegmentTarget=Pick<ClipSegment,'id'|'startSeconds'|'endSeconds'>;
export function parseSegmentTargets(value:unknown,duration?:number):SegmentTarget[]|undefined{
 if(value===undefined)return undefined;
 if(!Array.isArray(value)||!value.length||value.some(s=>!s||typeof s.id!=='string'||!/^[-\w]{1,64}$/.test(s.id)))throw new Error('분석할 구간을 선택해주세요.');
 return parseSegments(value.map(s=>({...s,effects:[],note:''})),duration).map(({id,startSeconds,endSeconds})=>({id,startSeconds,endSeconds}));
}
export function alignSegmentTargets(segments:ClipSegment[],targets?:SegmentTarget[]){
 if(!targets)return segments;
 if(segments.length!==targets.length)throw new Error('요청한 구간의 태그를 모두 받지 못했어요. 기존 구간은 유지돼요.');
 return segments.map((s,i)=>{const t=targets[i];if(Math.abs(s.startSeconds-t.startSeconds)>.001||Math.abs(s.endSeconds-t.endSeconds)>.001)throw new Error('분석 결과의 구간이 요청한 구간과 달라요. 기존 구간은 유지돼요.');return{...s,...t};});
}
export function mergeSegmentTagging(previous:ClipSegment,next:Tagging):ClipSegment{
 // tagIds identify old AI labels. Free-form user tags and explicit review decisions survive.
 const effects=previous.tagIds?previous.effects.filter(label=>!resolveAliases(label).some(id=>previous.tagIds!.includes(id))):previous.effects;
 let prior=previous.tagging||emptyTagging();for(const[id,status]of Object.entries(previous.legacyStatus||{}))if(status==='rejected'&&!prior.assignments.some(a=>a.tagId===id))prior=decideTag(prior,id,'rejected');
 return{...previous,tagIds:undefined,legacyStatus:undefined,effects,tagging:mergeTagging(prior,next)};
}
export function refreshSegmentTags(previous:ClipSegment[],analyzed:ClipSegment[]){
 return previous.map(s=>{
  const exact=analyzed.find(a=>a.id===s.id&&a.startSeconds===s.startSeconds&&a.endSeconds===s.endSeconds);if(exact?.tagging)return mergeSegmentTagging(s,exact.tagging);
  const assignments=new Map<string,Tagging['assignments'][number]>();
  for(const found of analyzed)for(const a of found.tagging?.assignments||[]){const evidenceMs=a.evidenceMs.filter(ms=>ms>=Math.round(s.startSeconds*1000)&&ms<Math.round(s.endSeconds*1000));if(!evidenceMs.length)continue;const old=assignments.get(a.tagId);assignments.set(a.tagId,old?{...old,aiScore:Math.max(old.aiScore||0,a.aiScore||0),evidenceMs:[...new Set([...old.evidenceMs,...evidenceMs])].slice(0,12)}:{...a,evidenceMs});}
  let covered=s.startSeconds;for(const part of [...analyzed].filter(a=>a.tagging).sort((a,b)=>a.startSeconds-b.startSeconds)){if(part.startSeconds>covered+.001)break;if(part.endSeconds>covered)covered=part.endSeconds;if(covered>=s.endSeconds)break;}
  return assignments.size||covered>=s.endSeconds?mergeSegmentTagging(s,{...emptyTagging(),assignments:[...assignments.values()]}):s;
 });
}
export function editManualSegmentTags(segment:Pick<ClipSegment,'tagging'|'tagIds'|'legacyStatus'>,before:string,value:string,category:Category){
 const labels=splitTags(value),matches=labels.flatMap(label=>resolveAliases(label).filter(id=>categoryForTag(id)===category));
 let next=segment.tagging||emptyTagging();for(const label of splitTags(before)){const ids=resolveAliases(label).filter(id=>categoryForTag(id)===category);if(ids.length===1&&!matches.includes(ids[0]))next=decideTag(next,ids[0],'rejected');}
 for(const label of labels){const ids=resolveAliases(label).filter(id=>categoryForTag(id)===category);if(ids.length===1)next=decideTag(next,ids[0],'accepted');}
 return{tagging:next,tagIds:segment.tagIds?.filter(id=>categoryForTag(id)!==category||matches.includes(id)),legacyStatus:segment.legacyStatus?Object.fromEntries(Object.entries(segment.legacyStatus).filter(([id])=>categoryForTag(id)!==category||matches.includes(id))):undefined};
}
export function pendingSegmentTags(segment:ClipSegment){return(segment.tagging?.assignments.filter(a=>a.status==='suggested').length||0)+Object.entries(segment.legacyStatus||{}).filter(([id,status])=>status==='suggested'&&!segment.tagging?.assignments.some(a=>a.tagId===id)).length;}
