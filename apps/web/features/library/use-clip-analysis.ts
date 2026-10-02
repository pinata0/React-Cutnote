'use client';

import type { AnalysisProgress,AnalysisReport } from '@/lib/analysis/types';
import { analyzeWholeVideo } from '@/lib/analysis/whole-video';
import { request } from '@/lib/client-request';
import { type Clip } from '@/lib/clips';
import { videoProvider } from '@/lib/links/provider';
import { proxyMedia,type LinkInfo } from '@/lib/links/types';
import type { Dispatch,SetStateAction } from 'react';
import { useEffect,useRef,useState } from 'react';
import { type AiStatus } from '../connections/ai-connection';
import type { Draft } from './clip-draft';
type AnalysisInput={editing:Clip|null;automatic:(fields:Partial<Draft>)=>void;completeAnalysis:(result:{report:AnalysisReport;title:string;memo:string})=>void;setPoster:Dispatch<SetStateAction<Blob|null>>;setAiStatus:Dispatch<SetStateAction<AiStatus|null>>};
export function useClipAnalysis({editing,automatic,completeAnalysis,setPoster,setAiStatus}:AnalysisInput){
 const[analysis,setAnalysis]=useState<AnalysisReport|null>(null),[analysisProgress,setAnalysisProgress]=useState<AnalysisProgress|null>(null),[analyzing,setAnalyzing]=useState(false),[analysisError,setAnalysisError]=useState('');
 const analysisController=useRef<AbortController|null>(null);
 const linkTimerRef=useRef<ReturnType<typeof setTimeout>|null>(null);
 useEffect(()=>()=>{if(linkTimerRef.current)clearTimeout(linkTimerRef.current);},[]);
 useEffect(()=>()=>analysisController.current?.abort(),[]);
 function stopAnalysis(){if(linkTimerRef.current)clearTimeout(linkTimerRef.current);linkTimerRef.current=null;analysisController.current?.abort();analysisController.current=null;setAnalyzing(false);}
 async function classify(source:File|string){
  stopAnalysis();const controller=new AbortController();analysisController.current=controller;setAnalyzing(true);setAnalysisError('');setAnalysisProgress({message:'전체 영상의 색감·구도·효과를 분석하고 있어요.',percent:0});
  try{const status=await request<AiStatus>('/api/ai/status',{signal:controller.signal});if(analysisController.current!==controller)return;setAiStatus(status);if(!status.configured)throw new Error('분석에 사용할 AI 서비스를 먼저 연결해주세요.');if(status.provider==='openai'){const result=await analyzeWholeVideo(source,controller.signal,p=>{if(analysisController.current===controller)setAnalysisProgress(p);});if(analysisController.current===controller&&!controller.signal.aborted)completeAnalysis(result);return;}let options:RequestInit;if(source instanceof File){const body=new FormData();body.set('video',source);options={method:'POST',body,signal:controller.signal};}else options={method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({clipId:editing?.id}),signal:controller.signal};const result=await request<{report:AnalysisReport;title:string;memo:string}>('/api/ai/analyze',options);if(analysisController.current!==controller||controller.signal.aborted)return;completeAnalysis(result);}
  catch(e){if(analysisController.current===controller&&!controller.signal.aborted)setAnalysisError((e as Error).message);}
  finally{if(analysisController.current===controller)setAnalyzing(false);}
 }
 async function classifyUrl(value:string){
  stopAnalysis();const controller=new AbortController();analysisController.current=controller;setAnalyzing(true);setAnalysisError('');setAnalysisProgress({message:'원본 영상 정보를 확인하고 있어요.',percent:0});
  try{
   let info:LinkInfo|undefined;
   try{const data=await request<{link:LinkInfo}>('/api/links/resolve',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({url:value.trim()}),signal:controller.signal});if(analysisController.current!==controller)return;info=data.link;automatic({title:data.link.title});
    if(data.link.previewUrl){void fetch(proxyMedia(data.link.previewUrl),{signal:controller.signal}).then(async res=>{if(!res.ok)return;const image=await createImageBitmap(await res.blob());try{const canvas=document.createElement('canvas');canvas.width=640;canvas.height=Math.max(1,Math.round(640*image.height/image.width));canvas.getContext('2d')?.drawImage(image,0,0,canvas.width,canvas.height);canvas.toBlob(blob=>{if(blob&&analysisController.current===controller&&!controller.signal.aborted)setPoster(blob);},'image/jpeg',.8);}finally{image.close();}}).catch(()=>{});}
   }catch{if(controller.signal.aborted)return;}
   if(analysisController.current!==controller)return;setAnalysisProgress({message:'전체 영상의 색감·구도·효과와 구간별 근거를 분석하고 있어요.',percent:0});
   const status=await request<AiStatus>('/api/ai/status',{signal:controller.signal});if(analysisController.current!==controller)return;setAiStatus(status);if(!status.configured)throw new Error('분석에 사용할 AI 서비스를 먼저 연결해주세요.');const provider=videoProvider(value)?.kind==='youtube'&&status.providers?.gemini?'gemini':status.provider;if(provider==='openai'){if(!info?.mediaUrl)throw new Error(videoProvider(value)?.kind==='youtube'?'현재 OpenAI가 연결되어 있어요. 이 YouTube 링크는 Gemini를 연결하면 전체 영상을 직접 분석할 수 있어요. OpenAI로 분석하려면 원본 파일을 업로드해주세요.':'OpenAI로 분석할 원본 영상 파일에 접근하지 못했어요. 분석하려면 영상 파일을 업로드해주세요.');const media=await fetch(proxyMedia(info.mediaUrl),{signal:controller.signal});if(!media.ok)throw new Error('원본 파일을 불러오지 못했어요. 파일 업로드로 시도해주세요.');const result=await analyzeWholeVideo(await media.blob(),controller.signal,p=>{if(analysisController.current===controller)setAnalysisProgress(p);});if(analysisController.current===controller&&!controller.signal.aborted)completeAnalysis(result);return;}
   const result=await request<{report:AnalysisReport;title:string;memo:string}>('/api/ai/analyze',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({url:value.trim()}),signal:controller.signal});if(analysisController.current!==controller||controller.signal.aborted)return;completeAnalysis(result);
  }catch(e){if(analysisController.current===controller&&!controller.signal.aborted)setAnalysisError((e as Error).message+' 링크만 먼저 저장할 수도 있어요.');}
  finally{if(analysisController.current===controller)setAnalyzing(false);}
 }
 return {analysis,setAnalysis,analysisProgress,setAnalysisProgress,analyzing,setAnalyzing,analysisError,setAnalysisError,linkTimerRef,stopAnalysis,classify,classifyUrl};
}
