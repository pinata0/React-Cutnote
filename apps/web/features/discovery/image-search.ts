import {object} from '@/lib/json';
import {taxonomyTags,tagById,resolveAliases,categoryForTag,isDescendant} from '../../lib/taxonomy';
import type {SegmentResult} from '../segments/segment-search';
import type {ClipSegment} from '../../lib/segments';
const staticNamespaces=new Set(['color','shot_type','subject','texture','geometry_pattern']);
const appearances=new Set([
 ...'ascii pixel_art low_poly voxel wireframe outline line_art sketch pencil ink charcoal watercolor oil_paint pastel comic manga anime cartoon cel_shading halftone ben_day_dots dither duotone tritone posterized threshold solarized negative monochrome silhouette film_grain film_scratch light_leak old_photo neon scanline noise rgb_split chromatic_aberration'.split(' ').map(id=>'visual_style.'+id),
 ...'blur sharpen glow bloom distortion pixelate mosaic rgb_split chromatic_aberration kaleidoscope mirror tile directional_blur radial_blur zoom_blur edge_detection emboss threshold contour outline'.split(' ').map(id=>'transformation.'+id)
]);
export const imageTags=taxonomyTags.filter(t=>t.observable&&(staticNamespaces.has(t.namespace)||appearances.has(t.id)));
const allowed=new Set(imageTags.map(t=>t.id));
// Explicit appearance pairs only; retain the taxonomy namespaces everywhere else.
const appearanceGroups=[['visual_style.rgb_split','transformation.rgb_split'],['visual_style.chromatic_aberration','transformation.chromatic_aberration'],['visual_style.outline','transformation.outline'],['visual_style.threshold','transformation.threshold'],['visual_style.monochrome','color.monochrome']];
const appearanceKey=(id:string)=>appearanceGroups.find(group=>group.includes(id))?.[0]||id;
export type ImageQueryTag={tagId:string;aiScore:number;reason:string};
export type ImageQuery={summary:string;tags:ImageQueryTag[];provider?:'openai'|'gemini'};
export const imageQuerySchema={type:'object',additionalProperties:false,properties:{imageReadable:{type:'boolean'},summary:{type:'string'},tags:{type:'array',items:{type:'object',additionalProperties:false,properties:{tagId:{type:'string',enum:imageTags.map(t=>t.id)},aiScore:{type:'number'},reason:{type:'string'}},required:['tagId','aiScore','reason']}}},required:['imageReadable','summary','tags']};
export function parseImageQuery(text:string):ImageQuery{
 let v:Record<string,unknown>;try{v=object(JSON.parse(text));}catch{throw new Error('사진 분석 결과를 읽지 못했어요. 다시 시도해주세요.');}
 if(!v||typeof v.imageReadable!=='boolean'||typeof v.summary!=='string'||v.summary.length>400||!Array.isArray(v.tags)||v.tags.length>12)throw new Error('사진 분석 결과 형식을 확인하지 못했어요. 다시 시도해주세요.');
 if(!v.imageReadable)throw new Error('AI가 사진을 읽지 못했어요. 다른 사진을 선택해주세요.');
 const seen=new Set<string>();const tags:ImageQueryTag[]=[];
 for(const t of v.tags){if(!t||!allowed.has(t.tagId)||!Number.isFinite(t.aiScore)||t.aiScore<0||t.aiScore>1||typeof t.reason!=='string'||!t.reason.trim()||t.reason.length>160)throw new Error('사진에서 확인할 수 없는 태그가 반환됐어요. 다시 시도해주세요.');if(!seen.has(t.tagId)&&t.aiScore>=.6){seen.add(t.tagId);tags.push({tagId:t.tagId,aiScore:t.aiScore,reason:t.reason.trim()});}}
 if(!tags.length)throw new Error('사진에서 검색할 특징을 찾지 못했어요. 색감이나 피사체가 선명한 사진으로 시도해주세요.');
 return{summary:v.summary.trim(),tags};
}
// Never borrow a parent video's tags: each result must be supported by this interval.
export function searchableSegmentIds(segment:ClipSegment){
 const ids=new Set<string>(),decisions=new Map((segment.tagging?.assignments||[]).map(a=>[a.tagId,a.status]));
 const status=(id:string)=>decisions.get(id)??segment.legacyStatus?.[id];
 for(const a of segment.tagging?.assignments||[])if(a.status==='accepted')ids.add(a.tagId);
 for(const id of segment.tagIds||[])if(status(id)==='accepted')ids.add(id);
 for(const category of ['color','shot','effect'] as const){const labels=segment.tags?.[category]??(category==='effect'&&!segment.tagIds?segment.effects:[]);for(const label of labels){const matches=resolveAliases(label).filter(id=>categoryForTag(id)===category);if(matches.length&&new Set(matches.map(appearanceKey)).size===1&&matches.every(id=>!status(id)||status(id)==='accepted'))ids.add(matches[0]);}}
 return[...ids].filter(id=>allowed.has(id));
}
export type ImageSegmentResult=SegmentResult&{imageMatch?:{score:number;labels:string[]}};
export function rankImageSegments(items:SegmentResult[],query:ImageQuery):ImageSegmentResult[]{
 return items.map(item=>{const ids=searchableSegmentIds(item.segment),matches=new Map<string,{score:number;label:string}>();
 for(const tag of query.tags){if(!allowed.has(tag.tagId))continue;const decision=item.segment.tagging?.assignments.find(a=>a.tagId===tag.tagId)?.status??item.segment.legacyStatus?.[tag.tagId];if(decision==='rejected'||decision==='suggested')continue;const exact=ids.includes(tag.tagId),equivalent=!exact&&ids.some(id=>appearanceKey(id)===appearanceKey(tag.tagId)),related=!exact&&!equivalent&&ids.some(id=>isDescendant(id,tag.tagId)||isDescendant(tag.tagId,id));if(!exact&&!equivalent&&!related)continue;const score=tag.aiScore*(exact?1:equivalent?.8:.5),key=appearanceKey(tag.tagId);if(score>(matches.get(key)?.score||0))matches.set(key,{score,label:tagById.get(tag.tagId)!.display_name+(equivalent?' 유사':related?' 계열':'')});}
 return{...item,imageMatch:{score:[...matches.values()].reduce((n,m)=>n+m.score,0),labels:[...new Set([...matches.values()].map(m=>m.label))]}};
 }).filter(item=>item.imageMatch.score>0).sort((a,b)=>b.imageMatch.score-a.imageMatch.score);
}
