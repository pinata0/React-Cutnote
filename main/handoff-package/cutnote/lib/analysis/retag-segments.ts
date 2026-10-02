import type {Clip} from '../clips';
import type {ClipSegment} from '../segments';
import {parseSegmentTargets,mergeSegmentTagging} from '../segment-tagging';
import {analyzeWholeVideo} from './whole-video';
import {emptyTagging} from '../tagging';
import {proxyMedia} from '../links/types';
import {videoProvider} from '../links/provider';
import type {AnalysisReport} from './types';
async function request(url:string,options:RequestInit){const response=await fetch(url,options);const data=await response.json() as {error?:string;configured:boolean;providers?:{gemini?:boolean};provider:string;report:AnalysisReport;link:{mediaUrl?:string};clip:Clip};if(!response.ok)throw new Error(data.error||'구간 태그를 분석하지 못했어요.');return data;}
export async function retagSegments(clip:Clip,selected:ClipSegment[],signal:AbortSignal,onProgress:(message:string)=>void):Promise<Clip>{
 const segmentTargets=parseSegmentTargets(selected)!;onProgress('구간별 색감·구도·효과를 확인하고 있어요…');
 const status=await request('/api/ai/status',{signal});if(!status.configured)throw new Error('이 보관함에 AI를 먼저 연결해주세요.');
 const provider=videoProvider(clip.sourceUrl)?.kind==='youtube'&&status.providers?.gemini?'gemini':status.provider;
 let result:{report:AnalysisReport};
 if(provider==='gemini')result=await request('/api/ai/analyze',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...(!clip.videoUrl?{url:clip.sourceUrl}:{clipId:clip.id}),segmentTargets}),signal});
 else{
  let url=clip.videoUrl;if(!url){const {link}=await request('/api/links/resolve',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({url:clip.sourceUrl}),signal});if(!link.mediaUrl)throw new Error('구간 분석에 원본 영상이 필요해요. 공개 YouTube는 Gemini를 연결하거나 원본 파일을 첨부해주세요.');url=proxyMedia(link.mediaUrl);}
  result=await analyzeWholeVideo(url!,signal,p=>onProgress(p.message),segmentTargets);
 }
 const proposed=new Map(result.report.segments?.map(s=>[s.id,s]));if(selected.some(s=>!proposed.has(s.id)))throw new Error('일부 구간 결과를 받지 못했어요. 기존 태그를 유지해요.');
 const segments=(clip.segments||[]).map(s=>proposed.has(s.id)?mergeSegmentTagging(s,proposed.get(s.id)!.tagging||emptyTagging()):s);
 signal.throwIfAborted();onProgress('분석한 구간 태그를 저장하고 있어요…');
 return(await request('/api/clips/'+clip.id,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({revision:clip.revision||0,segments}),signal})).clip;
}
