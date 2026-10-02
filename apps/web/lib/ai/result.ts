import {object} from '@/lib/json';
import {alignSegmentTargets,type SegmentTarget} from '@/features/segments/segment-tagging';
import {parseSegments,parseTime} from '@/lib/segments';
import {validateFields} from '@/lib/clips';
import {taxonomyTags,tagById} from '@/lib/taxonomy';
import {aiTagging,projectedTags} from '@/lib/tagging';
const tagId={type:'string',enum:taxonomyTags.map(t=>t.id)};
const assignment={type:'object',properties:{tagId,aiScore:{type:'number',minimum:0,maximum:1},evidenceMs:{type:'array',minItems:1,maxItems:12,items:{type:'integer',minimum:0,maximum:7200000}}},required:['tagId','aiScore','evidenceMs'],additionalProperties:false};
export const resultSchema={type:'object',properties:{videoAccessible:{type:'boolean'},title:{type:'string'},memo:{type:'string'},canonicalTags:{type:'array',maxItems:48,items:assignment},unclassifiedObservations:{type:'array',maxItems:6,items:{type:'string'}},segments:{type:'array',maxItems:30,items:{type:'object',properties:{title:{type:'string'},startSeconds:{type:'number'},endSeconds:{type:'number'},canonicalTags:{type:'array',maxItems:12,items:assignment},note:{type:'string'}},required:['title','startSeconds','endSeconds','canonicalTags','note'],additionalProperties:false}},observations:{type:'array',items:{type:'string'},minItems:1,maxItems:5}},required:['videoAccessible','title','memo','canonicalTags','unclassifiedObservations','segments','observations'],additionalProperties:false};
export const segmentPrompt=' Split the video into up to 30 useful scene or editing intervals, each independently searchable. Prefer scene boundaries with non-overlapping intervals covering the visible timeline; for long videos group adjacent similar scenes. Do not invent frame-accurate boundaries between sparse samples. Each segment needs a Korean title (max120), startSeconds/endSeconds (0 <= start < end <= duration <=7200), note (max500), and canonicalTags (0–12 dictionary IDs with aiScore and evidenceMs). Independently classify the COLOR, COMPOSITION/SHOT, and visible EDITING EFFECTS of EACH segment using only evidence INSIDE that interval. Never copy global tags into every interval. Preserve uncertainty: inferred production tags are suggestions. Empty category/tag lists are valid. Evidence times are original-video milliseconds inside the segment, not local offsets. Return an empty segments list only if scene timing cannot be estimated at all. ';
export function segmentInstructions(targets?:SegmentTarget[]){return targets?' Analyze ONLY these existing intervals, in the same chronological order; return exactly one segment for each, preserving the exact startSeconds and endSeconds. Do not split, merge, expand, or omit intervals. Independently inspect visible COLOR, COMPOSITION/SHOT and EDITING EFFECTS in EVERY requested interval. Provide canonicalTags with evidenceMs inside that interval. All times use the original video timeline. Never copy global tags across intervals. Use zero tags when no supported dictionary label fits. Intervals: '+JSON.stringify(targets)+'. ':segmentPrompt;}
export function parseProposal(text:string,durationSeconds?:number,targets?:SegmentTarget[]){
 let value:Record<string,unknown>;try{value=object(JSON.parse(text));}catch{throw new Error('분석 결과의 형식을 확인하지 못했어요.');}
 if(!value||value.videoAccessible!==true)throw new Error('AI가 실제 영상 화면을 확인하지 못했어요. 분석 완료로 저장하지 않았어요.');
 if(typeof value.title!=='string'||!value.title.trim()||typeof value.memo!=='string'||!value.memo.trim())throw new Error('분석 결과에 제목·메모가 부족해요. 다시 시도해주세요.');
 const tagging=aiTagging(value.canonicalTags,durationSeconds);
 const fields=validateFields({title:value.title,notes:value.memo,tags:projectedTags(tagging)});
 if(!Array.isArray(value.observations)||!value.observations.length||value.observations.length>5||value.observations.some((x:unknown)=>typeof x!=='string'||x.length>200||!/^\d{1,2}:[0-5]\d(?::[0-5]\d)?(?:\.\d{1,3})?\s/.test(x)))throw new Error('영상의 구간별 근거를 확인하지 못했어요.');
 const maxTime=durationSeconds??7200;if(value.observations.some((s:string)=>parseTime(s.split(/\s/)[0])>maxTime+.5))throw new Error('관찰 근거 시간이 영상 길이를 벗어났어요.');
 if(!Array.isArray(value.unclassifiedObservations)||value.unclassifiedObservations.length>6||value.unclassifiedObservations.some((s:unknown)=>typeof s!=='string'||s.length>200))throw new Error('미분류 관찰 내용을 확인해주세요.');
 if(!Array.isArray(value.segments)||value.segments.length>30)throw new Error('효과 구간 정보를 받지 못했어요.');
 const segments=value.segments.map((raw:unknown)=>{const s=object(raw);
  if(s&&Array.isArray(s.canonicalTags)){if(s.canonicalTags.length>12)throw new Error('구간 태그는 12개까지 제안할 수 있어요.');const segmentTagging=aiTagging(s.canonicalTags,durationSeconds);return{title:s.title,startSeconds:s.startSeconds,endSeconds:s.endSeconds,note:s.note,tagging:segmentTagging,tags:{color:[],shot:[],effect:[]},effects:[]};}
  // Read older reports without inventing confidence/evidence for their interval labels.
  if(!s||!Array.isArray(s.effects)||s.effects.some((id:unknown)=>typeof id!=='string'||!tagById.get(id)?.observable))throw new Error('구간에 사전에 없는 태그가 있어요.');return{...s,tagIds:s.effects,effects:s.effects.map((id:string)=>tagById.get(id)!.display_name.slice(0,30))};
 });
 return{fields,observations:value.observations as string[],tagging,unclassifiedObservations:value.unclassifiedObservations as string[],segments:alignSegmentTargets(parseSegments(segments,durationSeconds),targets)};
}
