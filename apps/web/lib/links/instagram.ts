import {publicUrl} from './fetch';

// Only inspect public JSON belonging to the requested post. Never execute page scripts.
export function instagramVideo(html:string,code:string):string|undefined{
 let remaining=60000;
 const mediaUrl=(value:unknown)=>{
  if(typeof value!=='string')return;
  try{const url=publicUrl(value);if(['cdninstagram.com','fbcdn.net'].some(host=>url.hostname===host||url.hostname.endsWith('.'+host))&&/\.mp4$/i.test(url.pathname))return url.href;}catch{}
 };
 for(const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)){
  if(!/\btype\s*=\s*["']application\/(?:ld\+)?json["']/i.test(match[1]))continue;
  let root:unknown;try{root=JSON.parse(match[2]);}catch{continue;}
  const stack:Array<{value:unknown;depth:number}>=[{value:root,depth:0}];
  while(stack.length&&remaining-->0){
   const{value,depth}=stack.pop()!;if(depth>64)continue;
   if(typeof value==='string'&&/^[\[{]/.test(value)){try{stack.push({value:JSON.parse(value),depth:depth+1});}catch{}continue;}
   if(!value||typeof value!=='object')continue;
   const node=value as Record<string,unknown>;
   if(node.code===code||node.shortcode===code){
    const versions=Array.isArray(node.video_versions)?node.video_versions:[];
    for(const version of versions){const url=mediaUrl(version?.url);if(url)return url;}
    const url=mediaUrl(node.video_url);if(url)return url;
   }
   for(const child of Object.values(node))if(child&&typeof child==='object'||typeof child==='string'&&/^[\[{]/.test(child))stack.push({value:child,depth:depth+1});
  }
  if(remaining<=0)break;
 }
}
