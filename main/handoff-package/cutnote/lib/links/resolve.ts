import {fetchPublic,publicUrl,readLimited} from './fetch';
import {linkTitle,type LinkInfo,type LinkFrame} from './types';
import {instagramVideo} from './instagram';
import {videoProvider} from './provider';
export function decodeHtml(s:string){return s.replace(/&(?:amp|quot|apos|lt|gt|#39|#x[0-9a-f]+|#\d+);/gi,e=>{const names:Record<string,string>={'&amp;':'&','&quot;':'"','&apos;':"'",'&#39;':"'",'&lt;':'<','&gt;':'>'};if(names[e.toLowerCase()])return names[e.toLowerCase()];const n=e[2].toLowerCase()==='x'?parseInt(e.slice(3,-1),16):parseInt(e.slice(2,-1),10);return n>0&&n<=0x10ffff?String.fromCodePoint(n):'';});}
export function meta(html:string,key:string){for(const tag of html.match(/<meta\b[^>]*>/gi)||[]){const attrs:Record<string,string>={};for(const match of tag.matchAll(/([\w:-]+)\s*=\s*(["'])([\s\S]*?)\2/g))attrs[match[1].toLowerCase()]=decodeHtml(match[3]);if((attrs.property||attrs.name||'').toLowerCase()===key)return attrs.content||'';}return '';}
export function playerData(html:string):{videoDetails?:{title?:string;shortDescription?:string;author?:string;lengthSeconds?:string};storyboards?:{playerStoryboardSpecRenderer?:{spec?:string}}}|null{
 const match=/(?:var\s+)?ytInitialPlayerResponse\s*=\s*\{/.exec(html);if(!match)return null;const start=match.index+match[0].lastIndexOf('{');let depth=0,inString=false,escaped=false;
 for(let i=start;i<html.length;i++){const c=html[i];if(inString){if(escaped)escaped=false;else if(c==='\\')escaped=true;else if(c==='"')inString=false;continue;}if(c==='"')inString=true;else if(c==='{')depth++;else if(c==='}'&&--depth===0){try{return JSON.parse(html.slice(start,i+1));}catch{return null;}}}return null;
}
export function storyboardFrames(spec:string):LinkFrame[]{
 const[base,...levels]=spec.split('|');if(!base)return[];
 const parsed=levels.map((s,index)=>{const[w,h,count,cols,rows,interval,name,signature]=s.split('#');return{w:+w,h:+h,count:+count,cols:+cols,rows:+rows,interval:+interval,name,signature,index};}).filter(s=>[s.w,s.h,s.count,s.cols,s.rows].every(n=>Number.isInteger(n)&&n>0)&&s.w<=1024&&s.h<=1024&&s.cols*s.rows<=1000&&s.count<=1000000&&s.name&&s.signature).sort((a,b)=>b.w*b.h-a.w*a.h);
 const level=parsed[0];if(!level)return[];const ids=[...new Set([.12,.38,.64,.88].map(r=>Math.min(level.count-1,Math.floor(level.count*r))))];
 return ids.map(n=>{const sheet=Math.floor(n/(level.cols*level.rows)),cell=n%(level.cols*level.rows);const uri=base.replaceAll('$L',String(level.index)).replaceAll('$N',level.name).replaceAll('$M',String(sheet));const url=publicUrl(uri);if(url.hostname!=='i.ytimg.com')throw new Error('미리보기 장면 주소를 확인하지 못했어요.');url.searchParams.set('sigh',level.signature);return{url:url.href,x:(cell%level.cols)*level.w,y:Math.floor(cell/level.cols)*level.h,width:level.w,height:level.h};});
}
function youtubeId(url:URL){const host=url.hostname.replace(/^www\.|^m\./,'');const id=host==='youtu.be'?url.pathname.split('/')[1]:host==='youtube.com'?(url.searchParams.get('v')||(/^\/(shorts|embed|live)\//.test(url.pathname)?url.pathname.split('/')[2]:'')):'';return id&&/^[\w-]{11}$/.test(id)?id:null;}
export async function resolveLink(value:string):Promise<LinkInfo>{
 const input=publicUrl(value);const id=youtubeId(input);const instagram=videoProvider(input.href);const canonical=id?'https://www.youtube.com/watch?v='+id:input.href;
 const info:LinkInfo={url:canonical,title:linkTitle(canonical),description:'',author:'',basis:'unavailable',frames:[],message:'분석 가능한 장면을 가져오지 못했어요. 링크는 그대로 저장할 수 있어요.'};
 if(id){
  const results=await Promise.allSettled([fetchPublic(canonical).then(async({response})=>new TextDecoder().decode(await readLimited(response,5*1024*1024))),fetchPublic('https://www.youtube.com/oembed?format=json&url='+encodeURIComponent(canonical),'application/json').then(async({response})=>JSON.parse(new TextDecoder().decode(await readLimited(response,200000))))]);
  const embed=results[1].status==='fulfilled'?results[1].value:null;const player=results[0].status==='fulfilled'?playerData(results[0].value):null;
  info.title=String(player?.videoDetails?.title||embed?.title||'YouTube '+id).slice(0,120);info.description=String(player?.videoDetails?.shortDescription||'').slice(0,1200);info.author=String(player?.videoDetails?.author||embed?.author_name||'').slice(0,100);info.previewUrl=embed?.thumbnail_url;
  const duration=Number(player?.videoDetails?.lengthSeconds);if(Number.isFinite(duration)&&duration>0)info.durationSeconds=duration;
  const spec=player?.storyboards?.playerStoryboardSpecRenderer?.spec;if(typeof spec==='string')try{info.frames=storyboardFrames(spec);}catch{}
  if(info.frames.length){info.basis='storyboard';info.message='영상의 여러 미리보기 장면을 분석해요.';}else if(info.previewUrl){info.basis='preview';info.message='영상 장면을 가져오지 못해 대표 이미지 1장만 참고해요. 영상 전체의 분류가 아니에요.';}return info;
 }
 const{response,url}=await fetchPublic(canonical,'text/html,video/*;q=0.9');const type=(response.headers.get('content-type')||'').split(';')[0];
 if(type.startsWith('video/')){await response.body?.cancel();info.basis='video';info.mediaUrl=url;info.message='링크의 영상 장면을 분석해요.';return info;}
 if(!type.includes('text/html')){await response.body?.cancel();return info;}
 const html=new TextDecoder().decode(await readLimited(response,5*1024*1024));info.title=(meta(html,'og:title')||decodeHtml(/<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1]||'')||info.title).trim().slice(0,120);info.description=(meta(html,'og:description')||meta(html,'description')).slice(0,1200);info.author=meta(html,'author').slice(0,100);
 if(input.hostname==='instagram.com'||input.hostname.endsWith('.instagram.com')){const rawTitle=meta(html,'og:title');const by=/^(.+?) on Instagram:/i.exec(rawTitle);if(by)info.author=by[1].slice(0,100);const shortTitle=rawTitle.replace(/^.+? on Instagram:\s*/i,'').split('\n')[0].replace(/^[\s"“”]+|[\s"“”]+$/g,'');if(shortTitle)info.title=shortTitle.slice(0,120);}
 const media=meta(html,'og:video:secure_url')||meta(html,'og:video:url')||meta(html,'og:video');const mediaType=meta(html,'og:video:type');const image=meta(html,'og:image:secure_url')||meta(html,'og:image');
 if(image)try{info.previewUrl=publicUrl(new URL(image,url).href).href;}catch{}
 if(media&&(mediaType.startsWith('video/')||/\.(mp4|webm|mov)(?:\?|$)/i.test(media)))try{info.mediaUrl=publicUrl(new URL(media,url).href).href;info.basis='video';info.message='링크에서 공개된 영상 장면을 분석해요.';}catch{}
 if(!info.mediaUrl&&instagram?.kind==='instagram'){const video=instagramVideo(html,instagram.id);if(video){info.mediaUrl=video;info.basis='video';info.message='공개 인스타 영상 원본에 접근할 수 있어요.';}}
 if(info.basis==='unavailable'&&info.previewUrl){info.basis='preview';info.message='대표 이미지만 가져왔어요. 전체 영상 분석에는 원본 파일이 필요해요.';}
 return info;
}
