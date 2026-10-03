import {segmentTags,withLegacyStatus} from './segments';
import {acceptedTags,projectedTags,type Tagging} from './tagging';
import {resolveAliases,isDescendant,tagById,categoryForTag} from './taxonomy';
export const categories = ['color','shot','effect'] as const;
export type Category=typeof categories[number];
export type Tags=Record<Category,string[]>;
export type Clip={localVideo?:boolean;favorite?:boolean;favoriteSegmentIds?:string[];id:string;title:string;sourceUrl:string;videoUrl:string|null;posterUrl:string|null;tags:Tags;notes:string;createdAt:string;revision?:number;tagging?:Tagging;analysisHistory?:import('./analysis/types').AnalysisReport[];segments?:import('./segments').ClipSegment[];analysis?:import('./analysis/types').AnalysisReport|null};
export type TagFilter={category:Category;value:string};
export const MAX_FILE_SIZE=25*1024*1024;
export const videoTypes=['video/mp4','video/webm','video/quicktime','video/ogg'];
export function splitTags(value:string){return [...new Set(value.split(/[,，\n]/).map(s=>s.trim().replace(/^#+/,'').normalize('NFKC').toLowerCase()).filter(Boolean))];}
export function validateFields(value:unknown){
 if(!value||typeof value!=='object')throw new Error('등록 내용을 확인해주세요.');
 const v=value as Record<string,unknown>;
 if(v.title!==undefined&&(typeof v.title!=='string'||v.title.trim().length>120))throw new Error('제목은 120자까지 입력할 수 있어요.');
 if(v.notes!==undefined&&(typeof v.notes!=='string'||v.notes.length>2000))throw new Error('메모는 2,000자까지 입력할 수 있어요.');
 if(v.tags!==undefined&&(!v.tags||typeof v.tags!=='object'))throw new Error('태그 형식을 확인해주세요.');
 const tags={} as Tags;
 for(const category of categories){const arr=((v.tags||{}) as Record<string,unknown>)[category]??[];if(!Array.isArray(arr)||arr.length>10||arr.some(x=>typeof x!=='string'||!x.trim()||x.trim().length>30))throw new Error('태그는 각각 30자, 종류별 10개까지 입력할 수 있어요.');tags[category]=[...new Set(arr.map(x=>(x as string).trim().normalize('NFKC').toLowerCase()))];}

 return{title:(typeof v.title==='string'?v.title.trim():'')||'새 레퍼런스',notes:typeof v.notes==='string'?v.notes.trim():'',tags};
}
function allowedLegacy(value:string,category:Category,tagging?:Tagging){const candidates=resolveAliases(value).filter(id=>categoryForTag(id)===category);return!candidates.length||candidates.some(id=>tagging?.assignments.find(a=>a.tagId===id)?.status!=='rejected');}
export function displayTags(clip:Pick<Clip,'tags'|'tagging'|'segments'>):Tags{const generated=projectedTags(clip.tagging),result:Tags={color:[],shot:[],effect:[]};for(const category of categories)result[category]=[...new Set([...clip.tags[category].filter(t=>allowedLegacy(t,category,clip.tagging)),...generated[category]])];for(const segment of withLegacyStatus(clip.segments||[],clip.tagging))for(const category of categories)for(const label of segmentTags(segment)[category])if(!result[category].includes(label))result[category].push(label);return result;}
export function clipTagIds(clip:Clip){const ids=new Set(acceptedTags(clip.tagging).map(a=>a.tagId));for(const category of categories)for(const value of clip.tags[category]){const matches=resolveAliases(value).filter(id=>categoryForTag(id)===category);if(matches.length===1&&clip.tagging?.assignments.find(a=>a.tagId===matches[0])?.status!=='rejected')ids.add(matches[0]);}for(const segment of withLegacyStatus(clip.segments||[],clip.tagging)){for(const a of acceptedTags(segment.tagging))ids.add(a.tagId);for(const id of segment.tagIds||[]){const status=segment.tagging?.assignments.find(a=>a.tagId===id)?.status??segment.legacyStatus?.[id];if(status==='accepted')ids.add(id);}for(const category of categories)for(const label of segmentTags(segment)[category]){const matches=resolveAliases(label).filter(id=>categoryForTag(id)===category);if(matches.length===1)ids.add(matches[0]);}}return[...ids];}
export type SearchOptions={canonicalIds?:string[];mode?:'and'|'or';review?:'all'|'suggested'|'user'};
export function filterClips(clips:Clip[],query:string,filters:TagFilter[],options:SearchOptions={}){
 const wholeAliases=resolveAliases(query);const words=query.normalize('NFKC').toLowerCase().trim().split(/[\s,]+/).filter(Boolean);
 return clips.filter(clip=>{const ids=clipTagIds(clip),tags=displayTags(clip),assignments=clip.tagging?.assignments||[];
  if(options.review==='suggested'&&!assignments.some(a=>a.status==='suggested'))return false;
  if(options.review==='user'&&!assignments.some(a=>a.status==='accepted'&&a.decisionBy==='user'))return false;
  const haystack=[clip.title,clip.notes,...categories.flatMap(c=>tags[c]),...ids.flatMap(id=>{const t=tagById.get(id);return t?[t.display_name,...t.aliases]:[];}),...(clip.segments||[]).map(s=>s.note)].join(' ').normalize('NFKC').toLowerCase();
  const queryMatch=words.every(w=>haystack.includes(w))||wholeAliases.some(parent=>ids.some(id=>isDescendant(id,parent)));
  const matches=[...filters.map(f=>tags[f.category].includes(f.value)),...(options.canonicalIds||[]).map(parent=>ids.some(id=>isDescendant(id,parent)))];
  return queryMatch&&(!matches.length||(options.mode==='or'?matches.some(Boolean):matches.every(Boolean)));
 });
}
export function sourceName(clip:Clip){if(clip.videoUrl)return 'VIDEO FILE';try{const host=new URL(clip.sourceUrl).hostname;if(/(^|\.)youtube\.com$/.test(host)||host==='youtu.be')return 'YOUTUBE';if(/(^|\.)instagram\.com$/.test(host))return 'INSTAGRAM';return 'LINK';}catch{return 'LINK';}}
