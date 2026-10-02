import data from './taxonomy-data';
export type TaxonomyTag={id:string;namespace:string;display_name:string;aliases:string[];parent:string;observable:boolean;auto_accept_allowed:boolean};
export const taxonomyVersion=data.version;
export const taxonomyTags:TaxonomyTag[]=data.tags;
export const taxonomyNamespaces=data.namespaces;
export const tagById=new Map(taxonomyTags.map(t=>[t.id,t]));
export const namespaceNames:Record<string,string>={visual_style:'시각 스타일',generation_method:'생성 방식',production_technique:'제작 기법',transformation:'변형 효과',motion_style:'요소 움직임',texture:'질감',geometry_pattern:'형태·패턴',compositing:'합성',color:'색감',shot_type:'구도',camera_motion:'카메라 움직임',subject:'피사체'};
export const normalizeAlias=(value:string)=>value.normalize('NFKC').toLowerCase().replace(/[\s_\-./]+/g,'').trim();
const aliases=new Map<string,string[]>();
for(const tag of taxonomyTags)for(const term of [tag.id,tag.display_name,...tag.aliases]){const key=normalizeAlias(term);aliases.set(key,[...new Set([...(aliases.get(key)||[]),tag.id])]);}
export function resolveAliases(value:string,namespace?:string){return(aliases.get(normalizeAlias(value))||[]).filter(id=>!namespace||tagById.get(id)?.namespace===namespace);}
export function isDescendant(id:string,parent:string){if(id===parent)return true;const seen=new Set<string>();let tag=tagById.get(id);while(tag&&!seen.has(tag.id)){seen.add(tag.id);if(tag.parent===parent)return true;tag=tagById.get(tag.parent);}return false;}
export function findTaxonomy(value:string,namespace?:string){const query=normalizeAlias(value);return taxonomyTags.filter(t=>(!namespace||t.namespace===namespace)&&(!query||[t.id,t.display_name,...t.aliases].some(s=>normalizeAlias(s).includes(query))));}
export function categoryForTag(id:string):'color'|'shot'|'effect'{const namespace=tagById.get(id)?.namespace;return namespace==='color'?'color':namespace==='shot_type'?'shot':'effect';}
export const taxonomyPrompt='Allowed tag dictionary (id | display name | O=visible; I=inferred production/generation):\n'+taxonomyTags.map(t=>`${t.id}|${t.display_name}|${t.observable?'O':'I'}`).join('\n');
