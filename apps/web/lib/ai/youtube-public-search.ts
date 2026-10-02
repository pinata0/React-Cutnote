import {object,array} from '@/lib/json';
import {readLimited} from '@/lib/links/fetch';
import {categoryForTag} from '@/lib/taxonomy';
import type {DiscoveryProfile} from '@/features/discovery/discovery-profile';
import type {DiscoveryFormat,YouTubeSuggestion} from './youtube-discovery';

export type PublicYouTubeCandidate=Omit<YouTubeSuggestion,'title'|'channel'|'thumbnail'>;
type SearchVideo={id:string;url:string;shorts:boolean;title:string};
type SearchQuery={query:string;group:'similar'|'explore';label:string};
const MAX_HTML_BYTES=2*1024*1024;
const validId=(value:unknown):value is string=>typeof value==='string'&&/^[A-Za-z0-9_-]{11}$/.test(value);
const plainText=(input:unknown):string=>{const value=object(input);return typeof value.simpleText==='string'?value.simpleText:typeof value.content==='string'?value.content:array(value.runs).map(object).map(run=>typeof run.text==='string'?run.text:'').join('');};

function initialSearchData(html:string):unknown{
 if(html.length>MAX_HTML_BYTES)throw new Error('YouTube 검색 응답이 너무 커요.');
 const marker=/(?:var\s+)?ytInitialData\s*=\s*\{/.exec(html);
 if(!marker)throw new Error('YouTube 공개 검색 결과를 읽지 못했어요.');
 const start=marker.index+marker[0].lastIndexOf('{');let depth=0,inString=false,escaped=false;
 for(let i=start;i<html.length;i++){
  const char=html[i];
  if(inString){if(escaped)escaped=false;else if(char==='\\')escaped=true;else if(char==='"')inString=false;continue;}
  if(char==='"')inString=true;else if(char==='{')depth++;else if(char==='}'&&--depth===0){try{return JSON.parse(html.slice(start,i+1));}catch{break;}}
 }
 throw new Error('YouTube 공개 검색 결과의 형식이 달라졌어요.');
}

function rendererVideo(input:unknown,kind:'video'|'reel'|'shorts'):SearchVideo|null{
 const renderer=object(input);
 const endpoint=object(kind==='shorts'?object(renderer.onTap).innertubeCommand:renderer.navigationEndpoint);
 const id=kind==='video'?renderer.videoId:kind==='reel'?renderer.videoId??object(endpoint.reelWatchEndpoint).videoId:object(endpoint.reelWatchEndpoint).videoId;
 if(!validId(id))return null;
 const path=object(object(endpoint.commandMetadata).webCommandMetadata).url;
 const reelId=object(endpoint.reelWatchEndpoint).videoId;
 // A Shorts label requires the actual search-result navigation endpoint.
 const shorts=typeof path==='string'&&new RegExp('^/shorts/'+id+'(?:[?#].*)?$').test(path)&&reelId===id;
 if(kind!=='video'&&!shorts)return null;
 if(kind==='video'&&object(endpoint.watchEndpoint).videoId&&object(endpoint.watchEndpoint).videoId!==id)return null;
 const title=(kind==='shorts'?plainText(object(renderer.overlayMetadata).primaryText):plainText(renderer.title)).trim().slice(0,240);
 if(!title)return null;
 return{id,url:shorts?'https://www.youtube.com/shorts/'+id:'https://www.youtube.com/watch?v='+id,shorts,title};
}

export function parseYouTubeSearch(html:string):SearchVideo[]{
 const data=initialSearchData(html),contents=object(object(data).contents);
 const root=object(contents.twoColumnSearchResultsRenderer).primaryContents??contents?.singleColumnSearchResultsRenderer??contents?.sectionListRenderer;
 if(!root)throw new Error('YouTube 공개 검색 결과를 찾지 못했어요.');
 const found=new Map<string,SearchVideo>();let visited=0;
 const walk=(node:unknown,depth:number)=>{
  if(!node||typeof node!=='object'||depth>30||++visited>30000||found.size>=80)return;
  if(Array.isArray(node)){for(const item of node)walk(item,depth+1);return;}
  for(const [field,kind]of [['shortsLockupViewModel','shorts'],['reelItemRenderer','reel'],['videoRenderer','video']]as const){
   if(object(node)[field]){const video=rendererVideo(object(node)[field],kind);if(video&&(!found.has(video.id)||video.shorts))found.set(video.id,video);return;}
  }
  for(const[key,value]of Object.entries(node))if(!/adSlot|promoted|searchPyv|tracking|logging|menu|continuation/i.test(key))walk(value,depth+1);
 };
 walk(root,0);return [...found.values()];
}

export function publicYouTubeQueries(profile:DiscoveryProfile,format:DiscoveryFormat):SearchQuery[]{
 const label=(value:string)=>value.replace(/[\r\n\t]/g,' ').trim().slice(0,90);
 const strongest=(category:'color'|'shot'|'effect')=>profile.tags.filter(t=>categoryForTag(t.id)===category).sort((a,b)=>b.weight-a.weight)[0];
 const effect=strongest('effect'),shot=strongest('shot'),color=strongest('color');
 const primary=effect?.label||color?.label;
 const queries:SearchQuery[]=[
  {group:'similar',label:primary?label(primary):'모션 디자인',query:primary?label(primary)+' motion design animation example':'creative motion design animation examples'},
  {group:'similar',label:shot?label(shot.label):'영상 편집',query:shot?label(shot.label)+' cinematic editing shorts':effect?label(effect.label)+' creative edit shorts':'creative video editing shorts'},
  {group:'explore',label:profile.explore[0]?label(profile.explore[0]):'새로운 모션 스타일',query:(profile.explore[0]?label(profile.explore[0]):'experimental motion design')+' shorts'},
 ];
 const seen=new Set<string>();return queries.map(q=>({...q,query:q.query+(format==='shorts'&&!/\bshorts\b/i.test(q.query)?' shorts':'')})).filter(q=>{if(seen.has(q.query))return false;seen.add(q.query);return true;}).slice(0,3);
}

async function fetchSearch(query:string,signal:AbortSignal){
 const url='https://www.youtube.com/results?search_query='+encodeURIComponent(query);
 const response=await fetch(url,{redirect:'manual',signal:AbortSignal.any([signal,AbortSignal.timeout(15000)]),headers:{Accept:'text/html','User-Agent':'Mozilla/5.0 (compatible; Cutnote/1.0; public video reference search)'}});
 if(!response.ok||!(response.headers.get('content-type')||'').includes('text/html')){await response.body?.cancel();throw new Error('YouTube 공개 검색에 연결하지 못했어요.');}
 return parseYouTubeSearch(new TextDecoder().decode(await readLimited(response,MAX_HTML_BYTES)));
}

export async function publicYouTubeCandidates(profile:DiscoveryProfile,format:DiscoveryFormat,signal:AbortSignal):Promise<PublicYouTubeCandidate[]>{
 const queries=publicYouTubeQueries(profile,format),results:{query:SearchQuery;videos:SearchVideo[]}[]=[];let succeeded=0;
 for(let index=0;index<queries.length;index+=2){
  if(signal.aborted)throw new Error('영상 검색을 취소했어요.');
  const batch=await Promise.allSettled(queries.slice(index,index+2).map(async query=>({query,videos:await fetchSearch(query.query,signal)})));
  for(const result of batch)if(result.status==='fulfilled'){succeeded++;results.push(result.value);}
 }
 if(signal.aborted)throw new Error('영상 검색을 취소했어요.');
 if(!succeeded)throw new Error('YouTube 공개 검색을 완료하지 못했어요.');
 const seen=new Set(profile.savedYouTubeIds),candidates:PublicYouTubeCandidate[]=[];
 for(const group of ['similar','explore']as const){
  const queues=results.filter(r=>r.query.group===group).map(r=>({query:r.query,videos:r.videos.filter(v=>format!=='shorts'||v.shorts)}));
  const mixed:{query:SearchQuery;video:SearchVideo}[]=[];
  // Alternate source queries so the first query does not fill every slot.
  for(let index=0;index<80;index++)for(const queue of queues)if(queue.videos[index])mixed.push({query:queue.query,video:queue.videos[index]});
  const unique=new Map<string,{query:SearchQuery;video:SearchVideo}>();for(const item of mixed)if(!seen.has(item.video.id)&&(!unique.has(item.video.id)||item.video.shorts))unique.set(item.video.id,item);
  const available=[...unique.values()],ordered=available.slice();
  // Preserve both formats when the public result includes them, without relabeling watch URLs.
  if(format==='all'){const shorts=available.filter(x=>x.video.shorts),videos=available.filter(x=>!x.video.shorts);ordered.length=0;for(let i=0;i<Math.max(shorts.length,videos.length);i++){if(videos[i])ordered.push(videos[i]);if(shorts[i])ordered.push(shorts[i]);}}
  for(const {query,video}of ordered.slice(0,6)){seen.add(video.id);const reason=group==='similar'?(profile.sourceCount?`저장한 레퍼런스의 ${query.label} 특징으로 검색한 예시예요.`:`${query.label}로 검색한 다양한 편집 예시예요.`):`${query.label}로 검색한 새로운 스타일 예시예요.`;
   candidates.push({id:video.id,url:video.url,shorts:video.shorts,group,reason:reason+' 영상 내용은 아직 분석하지 않았어요.',kind:/\btutorial\b|\bhow to\b|튜토리얼|강좌|강의|만들기/i.test(video.title)?'tutorial':'unknown'});
  }
 }
 return candidates;
}
