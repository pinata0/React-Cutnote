import {tagById,categoryForTag,resolveAliases} from './taxonomy';
import {parseTagging,projectedTags,type Tagging} from './tagging';
import type {Tags} from './clips';
import {randomId} from './id';
export type ClipSegment={id:string;startSeconds:number;endSeconds:number;effects:string[];note:string;tagIds?:string[];title?:string;tags?:Tags;tagging?:Tagging;legacyStatus?:Record<string,'accepted'|'suggested'|'rejected'>};
export type PlaybackRange=Pick<ClipSegment,'startSeconds'|'endSeconds'>&{requestId:number;loop?:boolean};
const groups=['color','shot','effect'] as const;
export function withLegacyStatus(segments:ClipSegment[],parent?:Tagging):ClipSegment[]{return segments.map(s=>!s.tags&&!s.tagging&&!s.legacyStatus?{...s,legacyStatus:Object.fromEntries((s.tagIds||s.effects.flatMap(label=>resolveAliases(label).filter(id=>categoryForTag(id)==='effect'))).flatMap(id=>{const assignment=parent?.assignments.find(a=>a.tagId===id);return assignment?[[id,assignment.status]]:s.tagIds?[[id,'suggested']]:[];})) as ClipSegment['legacyStatus']}:s);}
export function segmentTags(segment:ClipSegment):Tags{
 const result:Tags={color:[],shot:[],effect:[]},generated=projectedTags(segment.tagging);
 for(const category of groups){const legacy=segment.tags?.[category]??(category==='effect'&&!segment.tagIds?segment.effects:[]);result[category]=[...new Set([...legacy.filter(label=>{const ids=resolveAliases(label).filter(id=>categoryForTag(id)===category);return!ids.length||ids.some(id=>(segment.tagging?.assignments.find(a=>a.tagId===id)?.status??segment.legacyStatus?.[id])!=='rejected');}),...generated[category]])];}
 for(const id of segment.tagIds||[]){const tag=tagById.get(id),decision=segment.tagging?.assignments.find(a=>a.tagId===id);const status=decision?.status??segment.legacyStatus?.[id];if(tag&&(!status||status==='accepted')){const group=result[categoryForTag(id)],label=tag.display_name.slice(0,30).toLowerCase();if(!group.includes(label))group.push(label);}}
 return result;
}
export function parseSegments(value:unknown,duration?:number):ClipSegment[]{
 if(value===undefined||value===null)return[];
 if(!Array.isArray(value)||value.length>30)throw new Error('구간 클립은 최대 30개까지 저장할 수 있어요.');
 const ids=new Set<string>();
 return value.map(item=>{
  if(!item||typeof item!=='object')throw new Error('구간 클립을 확인해주세요.');
  const s=item as Record<string,unknown>,start=s.startSeconds,end=s.endSeconds;
  if(typeof start!=='number'||typeof end!=='number'||!Number.isFinite(start)||!Number.isFinite(end)||start<0||end<=start||end>7200||(duration!==undefined&&end>duration+.05))throw new Error('구간은 시작보다 끝이 늦어야 하며 영상 길이 안에 있어야 해요. 최대 2시간까지 지원해요.');
  const normalizedStart=Math.round(start*1000)/1000,normalizedEnd=Math.round(end*1000)/1000;if(normalizedEnd<=normalizedStart)throw new Error('구간은 0.001초 이상이어야 해요.');
  const effects=s.effects??[];
  if(!Array.isArray(effects)||effects.length>10||effects.some(v=>typeof v!=='string'||!v.trim()||v.trim().length>30))throw new Error('구간 효과는 30자, 10개까지 입력할 수 있어요.');
  if(typeof s.note!=='string'||s.note.length>500)throw new Error('구간 메모는 500자까지 입력할 수 있어요.');
  if(s.title!==undefined&&(typeof s.title!=='string'||s.title.length>120))throw new Error('구간 제목은 120자까지 입력할 수 있어요.');
  const id=typeof s.id==='string'&&/^[\w-]{1,64}$/.test(s.id)?s.id:randomId();if(ids.has(id))throw new Error('중복된 구간을 확인해주세요.');ids.add(id);
  if(s.tagIds!==undefined&&(!Array.isArray(s.tagIds)||s.tagIds.length>48||s.tagIds.some(id=>typeof id!=='string'||!tagById.has(id))))throw new Error('구간의 표준 태그를 확인해주세요.');
  let legacyStatus:ClipSegment['legacyStatus'];if(s.legacyStatus!==undefined){if(!s.legacyStatus||typeof s.legacyStatus!=='object'||Array.isArray(s.legacyStatus)||Object.entries(s.legacyStatus).some(([id,status])=>!tagById.has(id)||!['accepted','suggested','rejected'].includes(String(status))))throw new Error('기존 구간 검수 상태를 확인해주세요.');legacyStatus=s.legacyStatus as ClipSegment['legacyStatus'];}
  let tags:Tags|undefined;if(s.tags!==undefined){if(!s.tags||typeof s.tags!=='object')throw new Error('구간 태그 형식을 확인해주세요.');tags={color:[],shot:[],effect:[]};for(const category of groups){const list=(s.tags as Record<string,unknown>)[category]??[];if(!Array.isArray(list)||list.length>10||list.some(t=>typeof t!=='string'||!t.trim()||t.trim().length>30))throw new Error('구간 태그는 30자, 종류별 10개까지 입력할 수 있어요.');tags[category]=[...new Set(list.map(t=>(t as string).trim().normalize('NFKC').toLowerCase()))];}}
  const tagging=s.tagging===undefined?undefined:parseTagging(s.tagging,duration);
  if(tagging?.assignments.some(a=>a.source!=='user'&&a.evidenceMs.some(ms=>ms<Math.round(normalizedStart*1000)||ms>Math.round(normalizedEnd*1000))))throw new Error('구간 태그의 관찰 근거가 해당 구간을 벗어났어요.');
  return{...(legacyStatus?{legacyStatus}:{}),...(s.tagIds?{tagIds:[...new Set(s.tagIds as string[])]}:{}),...(tags?{tags}:{}),...(tagging?{tagging}:{}),...(s.title===undefined?{}:{title:(s.title as string).trim()}),id,startSeconds:normalizedStart,endSeconds:normalizedEnd,effects:[...new Set(effects.map(t=>(t as string).trim().normalize('NFKC').toLowerCase()))],note:s.note.trim()};
 }).sort((a,b)=>a.startSeconds-b.startSeconds||a.endSeconds-b.endSeconds);
}
export function timecode(seconds:number){const total=Math.round(seconds*10)/10;const h=Math.floor(total/3600),m=Math.floor(total/60)%60,s=total%60;return(h?String(h).padStart(2,'0')+':':'')+String(m).padStart(2,'0')+':'+s.toFixed(s%1?1:0).padStart(s%1?4:2,'0');}
export function parseTime(value:string){const text=value.trim();if(/^\d+(?:\.\d{1,3})?$/.test(text))return Number(text);if(!/^\d{1,2}:[0-5]\d(?::[0-5]\d)?(?:\.\d{1,3})?$/.test(text))return NaN;return text.split(':').reduce((sum,n)=>sum*60+Number(n),0);}
