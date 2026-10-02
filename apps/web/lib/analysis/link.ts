import {analyzeFrames,extractFrames} from './video';
import type {PixelFrame} from './color';
import type {AnalysisProgress,AnalysisReport} from './types';
import {proxyMedia,type LinkInfo,type LinkFrame} from '../links/types';
async function mediaBlob(url:string,signal:AbortSignal){
 const res=await fetch(proxyMedia(url),{signal});
 if(!res.ok){const data=await res.json().catch(()=>null) as {error?:string}|null;throw new Error(data?.error||'링크의 장면을 가져오지 못했어요.');}
 return res.blob();
}
async function readImages(sources:LinkFrame[],signal:AbortSignal,onProgress:(p:AnalysisProgress)=>void,preview:boolean){
 const frames:PixelFrame[]=[],images=new Map<string,ImageBitmap>();
 try{
  for(const source of sources){
   if(signal.aborted)throw new DOMException('분석 취소','AbortError');
   onProgress({message:preview?'미리보기 이미지를 읽고 있어요.':`영상 장면 ${frames.length+1}/${sources.length} 가져오는 중`,percent:3+frames.length*3});
   let image=images.get(source.url);if(!image){image=await createImageBitmap(await mediaBlob(source.url,signal));images.set(source.url,image);}
   const width=source.width||image.width,height=source.height||image.height;
   if(source.x+width>image.width||source.y+height>image.height)throw new Error('미리보기 장면의 크기를 확인하지 못했어요.');
   const scale=Math.min(1,384/Math.max(width,height)),canvas=document.createElement('canvas');
   canvas.width=Math.max(1,Math.round(width*scale));canvas.height=Math.max(1,Math.round(height*scale));
   const ctx=canvas.getContext('2d',{willReadFrequently:true});if(!ctx)throw new Error('이 브라우저에서 이미지 분석을 시작하지 못했어요.');
   ctx.drawImage(image,source.x,source.y,width,height,0,0,canvas.width,canvas.height);
   const pixels=ctx.getImageData(0,0,canvas.width,canvas.height);frames.push({data:pixels.data,width:canvas.width,height:canvas.height});
  }
  return frames;
 }finally{for(const image of images.values())image.close();}
}
export async function analyzeLink(info:LinkInfo,signal:AbortSignal,onProgress:(p:AnalysisProgress)=>void,onColor:(tags:string[])=>void,onPoster:(poster:Blob)=>void):Promise<AnalysisReport>{
 let frames:PixelFrame[]=[],basis=info.basis;
 try{
  if(basis==='video'&&info.mediaUrl){onProgress({message:'링크의 영상을 가져오고 있어요.',percent:2});frames=await extractFrames(await mediaBlob(info.mediaUrl,signal),signal,onProgress);}
  else if(basis==='storyboard')frames=await readImages(info.frames,signal,onProgress,false);
 }catch(error){if(signal.aborted||!info.previewUrl)throw error;basis='preview';}
 if(!frames.length&&info.previewUrl){basis='preview';frames=await readImages([{url:info.previewUrl,x:0,y:0,width:0,height:0}],signal,onProgress,true);}
 if(!frames.length)throw new Error(info.message||'분석할 장면을 가져오지 못했어요. 링크는 저장할 수 있어요.');
 const canvas=document.createElement('canvas');canvas.width=frames[0].width;canvas.height=frames[0].height;
 canvas.getContext('2d')?.putImageData(new ImageData(new Uint8ClampedArray(frames[0].data),canvas.width,canvas.height),0,0);
 const poster=await new Promise<Blob|null>(resolve=>canvas.toBlob(resolve,'image/jpeg',.85));if(poster&&!signal.aborted)onPoster(poster);
 return analyzeFrames(frames,signal,onProgress,onColor,basis==='unavailable'?'video':basis);
}
export function autoMemo(info:Pick<LinkInfo,'description'|'author'>,report?:AnalysisReport){
 const parts:string[]=[];
 if(info.author)parts.push(`출처: ${info.author}`);
 if(report){parts.push(`색감: ${report.suggestedTags.color.join(', ')} · 구도: ${report.suggestedTags.shot.join(', ')} · 효과: ${report.suggestedTags.effect.join(', ')}`);parts.push(report.basis==='preview'?'미리보기 이미지 1장 기준. 원본 영상을 보며 확인하세요.':report.basis==='storyboard'?'영상의 미리보기 장면 기준 자동분류.':'영상 장면 기준 자동분류.');}
 if(info.description)parts.push(info.description.trim().slice(0,400));
 return parts.join('\n').slice(0,2000);
}
