import {taxonomyTags,tagById,resolveAliases,categoryForTag,isDescendant,normalizeAlias} from './taxonomy';
import {withLegacyStatus,type ClipSegment} from './segments';
import {segmentTags} from './segments';
import type {Clip} from './clips';
import type {SegmentResult} from './segment-search';
export type EffectGroup={label:string;tagIds:string[]};
export type EffectIntent={summary:string;groups:EffectGroup[]};
export type FeedbackValue='match'|'partial'|'irrelevant';
export type FeedbackRecord={clipId:string;segmentId:string;signature:string;value:FeedbackValue|null};
export const feedbackChoices=[{value:'match' as const,label:'원하는 효과예요'},{value:'partial' as const,label:'비슷하지만 달라요'},{value:'irrelevant' as const,label:'관련 없어요'}];
export const effectTags=taxonomyTags.filter(t=>!['subject','shot_type'].includes(t.namespace));
const allowed=new Set(effectTags.map(t=>t.id));
export const intentSchema={type:'object',additionalProperties:false,properties:{summary:{type:'string'},groups:{type:'array',items:{type:'object',additionalProperties:false,properties:{label:{type:'string'},tagIds:{type:'array',items:{type:'string'}}},required:['label','tagIds']}}},required:['summary','groups']};
export function parseIntent(value:unknown):EffectIntent{
 const v=value as EffectIntent;if(!v||typeof v.summary!=='string'||v.summary.length>300||!Array.isArray(v.groups)||v.groups.length>5)throw new Error('효과 검색 조건을 확인해주세요.');
 const groups:EffectGroup[]=[];const seen=new Set<string>();for(const g of v.groups){if(!g||typeof g.label!=='string'||!g.label.trim()||g.label.length>45||!Array.isArray(g.tagIds)||!g.tagIds.length||g.tagIds.length>5||g.tagIds.some(id=>typeof id!=='string'||!allowed.has(id)))throw new Error('효과 태그는 사전에서 5개 조건까지 선택해주세요.');const ids=[...new Set(g.tagIds)].sort(),key=JSON.stringify(ids);if(!seen.has(key)){seen.add(key);groups.push({label:g.label.trim(),tagIds:ids});}}
 return{summary:v.summary.trim(),groups};
}
export function intentKey(intent:EffectIntent){return JSON.stringify(parseIntent(intent).groups.map(g=>g.tagIds).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b))));}
export function confirmedEffectIds(s:ClipSegment){
 const ids=new Set((s.tagging?.assignments||[]).filter(a=>a.status==='accepted').map(a=>a.tagId));
 const status=(id:string)=>s.tagging?.assignments.find(a=>a.tagId===id)?.status??s.legacyStatus?.[id];
 for(const id of s.tagIds||[])if(status(id)==='accepted')ids.add(id);
 for(const c of ['color','shot','effect'] as const){const labels=s.tags?.[c]??(c==='effect'&&!s.tagIds?s.effects:[]);for(const label of labels){const matches=resolveAliases(label).filter(id=>categoryForTag(id)===c);if(matches.length===1&&(!status(matches[0])||status(matches[0])==='accepted'))ids.add(matches[0]);}}
 return[...ids].filter(id=>allowed.has(id)).sort();
}
export function segmentSignature(item:SegmentResult){return JSON.stringify([item.clip.sourceUrl,item.clip.videoUrl,item.segment.startSeconds,item.segment.endSeconds,confirmedEffectIds(item.segment)]);}
export function recommendationItems(clips:Clip[]):SegmentResult[]{return clips.flatMap(clip=>withLegacyStatus(clip.segments||[],clip.tagging).map(segment=>({clip,segment,tags:segmentTags(segment)})));}
export function seedIntent(item:SegmentResult):EffectIntent{return{summary:'선택한 구간의 확정 태그로 비슷한 효과를 찾아요.',groups:confirmedEffectIds(item.segment).sort((a,b)=>priority(a)-priority(b)).slice(0,5).map(id=>({label:tagById.get(id)!.display_name,tagIds:[id]}))};}
const moodTags=new Set('dreamy ethereal cyberpunk y2k retro_futurism synthwave vaporwave lo_fi grunge psychedelic surreal'.split(' ').map(id=>'visual_style.'+id));
function priority(id:string){const ns=tagById.get(id)?.namespace;if(ns==='visual_style')return moodTags.has(id)?3:0;return['transformation','compositing','production_technique','generation_method'].includes(ns||'')?0:['motion_style','camera_motion'].includes(ns||'')?1:['texture','geometry_pattern'].includes(ns||'')?2:3;}
// Related appearance and movement families are suggestions, never exact identity.
const families=[
 {ids:['transformation.glow','transformation.bloom','visual_style.neon','visual_style.dreamy','visual_style.ethereal','visual_style.light_leak'],reason:'빛이 번지거나 발광하는 인상이 비슷해요'},
 {ids:['visual_style.glitch','visual_style.digital_glitch','visual_style.analog_glitch','visual_style.rgb_split','transformation.rgb_split','visual_style.chromatic_aberration','transformation.chromatic_aberration','visual_style.datamosh','transformation.datamosh'],reason:'화면이나 색상이 어긋나는 표현이 비슷해요'},
 {ids:['motion_style.shake','motion_style.jitter','motion_style.wiggle','camera_motion.handheld','motion_style.handheld'],reason:'화면이나 요소가 흔들리는 움직임이 비슷해요'},
 {ids:['motion_style.zoom','motion_style.crash_zoom','camera_motion.dolly_in','camera_motion.dolly_out','camera_motion.dolly_zoom','motion_style.dolly_zoom','transformation.radial_blur','transformation.zoom_blur'],reason:'확대·축소나 중심으로 퍼지는 느낌이 비슷해요'},
 {ids:['motion_style.float','motion_style.drift','motion_style.hover','motion_style.sway','visual_style.dreamy','visual_style.ethereal'],reason:'부드럽게 떠다니는 분위기가 비슷해요'},
 {ids:['visual_style.outline','transformation.outline','transformation.edge_detection','visual_style.line_art','visual_style.wireframe'],reason:'윤곽선이 드러나는 표현이 비슷해요'},
 {ids:['visual_style.pixel_art','transformation.pixelate','transformation.mosaic','visual_style.dither','visual_style.halftone'],reason:'픽셀이나 점으로 나뉜 질감이 비슷해요'},
 {ids:['texture.grainy','visual_style.film_grain','texture.noisy','visual_style.noise','visual_style.film','visual_style.vhs'],reason:'입자나 노이즈가 있는 질감이 비슷해요'},
 {ids:['motion_style.spin','motion_style.rotate','motion_style.orbit','camera_motion.orbit','transformation.twirl'],reason:'회전하는 움직임이나 형태가 비슷해요'},
 {ids:['motion_style.stutter','motion_style.frame_skip','transformation.stutter','transformation.frame_skip','motion_style.choppy'],reason:'움직임이 끊기는 리듬이 비슷해요'},
 {ids:['transformation.blur','transformation.directional_blur','transformation.motion_blur','texture.soft','visual_style.dreamy'],reason:'흐릿하고 부드럽게 번지는 인상이 비슷해요'},
];
export type Recommendation=SegmentResult&{kind:'exact'|'similar';reason:string;feedback:FeedbackValue|null;signature:string;weights:number[]};
export function recommendSegments(items:SegmentResult[],intent:EffectIntent,feedback:FeedbackRecord[]=[],exclude?:string):Recommendation[]{
 if(!intent.groups.length)return[];const output:Recommendation[]=[];
 for(const item of items){if(exclude===item.clip.id+'/'+item.segment.id)continue;const ids=confirmedEffectIds(item.segment),weights=[0,0,0,0],matched:string[]=[],reasons:string[]=[];
 for(const group of intent.groups){const validTargets=group.tagIds.filter(target=>!['rejected','suggested'].includes(item.segment.tagging?.assignments.find(a=>a.tagId===target)?.status??item.segment.legacyStatus?.[target]??''));const exact=validTargets.find(target=>ids.some(id=>isDescendant(id,target)));
 if(exact){matched.push(group.label);weights[priority(exact)]+=2;continue;}
 const related=families.find(f=>validTargets.some(id=>f.ids.includes(id))&&ids.some(id=>f.ids.includes(id)));if(related){const target=validTargets.find(id=>related.ids.includes(id))!;const tier=Math.max(priority(target),Math.min(...ids.filter(id=>related.ids.includes(id)).map(priority)));weights[tier]+=1;reasons.push(tier===3?'분위기가 비슷해요':tier===2?'시각적인 질감·형태가 비슷해요':related.reason);}}
 if(!matched.length&&!reasons.length)continue;const signature=segmentSignature(item),vote=feedback.find(f=>f.clipId===item.clip.id&&f.segmentId===item.segment.id&&f.signature===signature)?.value??null;const exact=matched.length===intent.groups.length;
 output.push({...item,kind:exact?'exact':'similar',reason:exact?matched.join(' · ')+' 조건을 모두 포함해요':(matched.length?matched.join(' · ')+' 조건이 겹쳐요. ':'')+[...new Set(reasons)].slice(0,2).join(' · '),feedback:vote,signature,weights});}
 const vote=(v:FeedbackValue|null)=>v==='match'?1:v==='partial'?-1:v==='irrelevant'?-2:0;
 return output.sort((a,b)=>(a.kind===b.kind?0:a.kind==='exact'?-1:1)||a.weights.reduce((n,w,i)=>n||b.weights[i]-w,0)||vote(b.feedback)-vote(a.feedback));
}
const presets:Record<string,EffectGroup[]>={
 glow:[{label:'빛이 번짐',tagIds:['transformation.glow','transformation.bloom']}],
 dynamic:[{label:'역동적인 움직임',tagIds:['motion_style.crash_zoom','motion_style.shake','motion_style.fast_motion','camera_motion.whip_pan']}],
 dreamy:[{label:'몽환적인 느낌',tagIds:['visual_style.dreamy','visual_style.ethereal','transformation.bloom']}],
 strong:[{label:'강렬한 표현',tagIds:['color.high_contrast','visual_style.glitch','visual_style.neon']}],
};
export function presetIntent(name:string):EffectIntent{return{summary:'선택한 느낌을 기준으로 찾아요.',groups:presets[name]||[]};}
export function localEffectIntent(query:string):EffectIntent{
 const whole=resolveAliases(query).filter(id=>allowed.has(id));if(whole.length)return parseIntent({summary:'검색할 효과 태그를 확인해주세요.',groups:[{label:query.slice(0,45),tagIds:whole.slice(0,5)}]});
 const q=normalizeAlias(query);if(/없이|제외|않|말고|천천히|느리|slow|빠르게|quick|아웃|축소|zoomout|멀어/.test(q))return{summary:'방향·속도·제외 조건은 태그를 직접 선택해 조정해주세요.',groups:[]};
 const groups:EffectGroup[]=[];const add=(label:string,ids:string[])=>groups.push({label,tagIds:ids});
 if(/흔들|셰이크|shake|jitter/.test(q))add('흔들림',['motion_style.shake','motion_style.jitter','camera_motion.handheld']);
 if(/확대|줌|zoom|다가오/.test(q))add('확대',['motion_style.zoom','motion_style.crash_zoom','camera_motion.dolly_in']);
 if(/글리치|glitch|깨지/.test(q))add('글리치',['visual_style.glitch']);
 if(/빛.*번|발광|글로우|glow|bloom/.test(q))groups.push(...presets.glow);
 if(/몽환|dreamy/.test(q))groups.push(...presets.dreamy);
 if(/체커|체스판|checkerboard/.test(q))add('체커보드',['geometry_pattern.checkerboard']);
 if(!groups.length){const exact=resolveAliases(query).filter(id=>allowed.has(id));if(exact.length)add(query.slice(0,45),exact.slice(0,5));}
 return parseIntent({summary:groups.length?'검색할 효과 태그를 확인해주세요.':'원하는 느낌을 골라 검색 범위를 좁혀보세요.',groups:groups.slice(0,5)});
}
