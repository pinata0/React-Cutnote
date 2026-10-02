import {categories,type Clip,type Tags} from '../../lib/clips';
import {withLegacyStatus} from '../../lib/segments';
import {tagById,resolveAliases,categoryForTag,isDescendant,taxonomyVersion} from '../../lib/taxonomy';
import type {Tagging} from '../../lib/tagging';
import {videoProvider} from '../../lib/links/provider';
export type DiscoveryProfile={version:string;sourceCount:number;tags:{id:string;label:string;weight:number}[];savedYouTubeIds:string[];explore:string[]};
function confirmed(tags:Tags|undefined,tagging:Tagging|undefined,legacy:Record<string,string>={},ids:string[]=[]){
 const status=new Map(Object.entries(legacy));for(const a of tagging?.assignments||[])status.set(a.tagId,a.status);
 const result=new Set([...status].filter(([,state])=>state==='accepted').map(([id])=>id));
 for(const id of ids)if(status.get(id)==='accepted')result.add(id);
 for(const category of categories)for(const label of tags?.[category]||[]){const found=resolveAliases(label).filter(id=>categoryForTag(id)===category);if(found.length===1&&(!status.has(found[0])||status.get(found[0])==='accepted'))result.add(found[0]);}
 const valid=[...result].filter(id=>tagById.has(id)&&tagById.get(id)!.namespace!=='subject');
 return valid.filter(parent=>!valid.some(id=>id!==parent&&isDescendant(id,parent)));
}
export function discoveryProfile(clips:Clip[]):DiscoveryProfile{
 const sources=new Map<string,{features:Map<string,number>;favorite:boolean}>(),saved=new Set<string>();
 for(const clip of clips){const provider=videoProvider(clip.sourceUrl);if(provider?.kind==='youtube')saved.add(provider.id);const source=provider?provider.kind+':'+provider.id:clip.sourceUrl||clip.id;const entry=sources.get(source)||{features:new Map(),favorite:false};entry.favorite ||= !!clip.favorite;
  for(const id of confirmed(clip.tags,clip.tagging))entry.features.set(id,Math.max(entry.features.get(id)||0,1));
  for(const segment of withLegacyStatus(clip.segments||[],clip.tagging)){
   const tags=segment.tags||{color:[],shot:[],effect:segment.tagIds?[]:segment.effects};
   for(const id of confirmed(tags,segment.tagging,segment.legacyStatus,segment.tagIds))entry.features.set(id,Math.max(entry.features.get(id)||0,clip.favoriteSegmentIds?.includes(segment.id)?1.5:1));
  }sources.set(source,entry);
 }
 const weights=new Map<string,number>();let sourceCount=0;
 for(const source of sources.values()){if(!source.features.size)continue;sourceCount++;const sum=[...source.features.values()].reduce((a,b)=>a+b,0);for(const[id,weight]of source.features)weights.set(id,(weights.get(id)||0)+(weight/sum)*(source.favorite?2:1));}
 const ranked=[...weights].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0]));
 // Reserve room for composition and color, then fill with strong visual features.
 const chosen=new Set<string>();for(const category of categories){const match=ranked.find(([id])=>categoryForTag(id)===category);if(match)chosen.add(match[0]);}for(const[id]of ranked)if(chosen.size<6)chosen.add(id);
 const tags=[...chosen].map(id=>({id,label:tagById.get(id)!.display_name,weight:Math.round(weights.get(id)!*1000)/1000})).sort((a,b)=>b.weight-a.weight);
 const known=[...weights.keys()].map(id=>[id,tagById.get(id)!.display_name,...tagById.get(id)!.aliases].join(' ').toLowerCase()).join(' ');
 const alternatives=[{match:/paper|cutout|콜라주|종이/,query:'paper cutout collage animation'},{match:/watercolor|watercolour|수채/,query:'watercolor hand drawn animation'},{match:/clay|stop.?motion|스톱/,query:'clay stop motion animation'},{match:/minimal|kinetic|typograph|타이포/,query:'minimal kinetic typography motion design'},{match:/pixel|픽셀/,query:'pixel art motion animation'},{match:/retro|vhs|grain|빈티지/,query:'retro analog film title animation'}];
 return{version:'discovery-v2-'+taxonomyVersion,sourceCount,tags,savedYouTubeIds:[...saved].sort(),explore:alternatives.filter(a=>!a.match.test(known)).slice(0,2).map(a=>a.query)};
}
export function discoveryIdentity(profile:DiscoveryProfile){return JSON.stringify(profile);}
