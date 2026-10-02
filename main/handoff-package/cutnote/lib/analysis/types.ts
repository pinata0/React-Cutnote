import {parseTagging,type Tagging} from '../tagging';
import {parseSegments,type ClipSegment} from '../segments';
import {categories,type Tags} from '../clips';
type ReportBase={analyzedAt:string;suggestedTags:Tags;notes:string[];segments?:ClipSegment[];tagging?:Tagging;unclassifiedObservations?:string[];promptVersion?:string};
export type AnalysisReport=ReportBase & ({engine:'mobileclip-s0-v1';frameCount:number;basis?:'video'|'storyboard'|'preview'}|{engine:'gemini-video-v1';basis:'full-video';model:string;sampleFps:2;durationSeconds?:number}|{engine:'openai-frames-v1';basis:'full-duration-frames';model:string;frameCount:number;durationSeconds:number});
export type AnalysisProgress={message:string;percent:number};
export function parseAnalysis(value:unknown):AnalysisReport|null{
 if(value===null||value===undefined||value==='')return null;
 if(typeof value!=='object')throw new Error('자동분류 정보를 확인해주세요.');
 const v=value as Record<string,unknown>;
 if(typeof v.analyzedAt!=='string'||!Number.isFinite(Date.parse(v.analyzedAt)))throw new Error('자동분류 정보가 올바르지 않아요.');
 if(v.engine==='openai-frames-v1'){if(v.basis!=='full-duration-frames'||v.model!=='gpt-6-sol'||!Number.isInteger(v.frameCount)||Number(v.frameCount)<2||Number(v.frameCount)>120||typeof v.durationSeconds!=='number'||!Number.isFinite(v.durationSeconds)||v.durationSeconds<=0)throw new Error('전체 구간 분석 기준을 확인해주세요.');}
 else if(v.engine==='gemini-video-v1'){if(v.basis!=='full-video'||v.sampleFps!==2||v.model!=='gemini-3.8-flash')throw new Error('전체 영상 분석 기준을 확인해주세요.');}
 else if(v.engine==='mobileclip-s0-v1'){if(!Number.isInteger(v.frameCount)||Number(v.frameCount)<1||Number(v.frameCount)>5||v.basis!==undefined&&!['video','storyboard','preview'].includes(String(v.basis)))throw new Error('분석 기준을 확인해주세요.');}
 else throw new Error('자동분류 정보가 올바르지 않아요.');
 const duration=(v.engine==='openai-frames-v1'||v.engine==='gemini-video-v1')?v.durationSeconds:undefined;
 if(duration!==undefined&&(typeof duration!=='number'||!Number.isFinite(duration)||duration<=0||duration>7200))throw new Error('영상 길이는 0초보다 크고 2시간 이하여야 해요.');
 const suggestedTags={} as Tags;if(!v.suggestedTags||typeof v.suggestedTags!=='object')throw new Error('자동분류 태그가 없어요.');
 for(const k of categories){const arr=(v.suggestedTags as Record<string,unknown>)[k];if(!Array.isArray(arr)||arr.length>10||arr.some(t=>typeof t!=='string'||!t||t.length>30))throw new Error('자동분류 태그가 올바르지 않아요.');suggestedTags[k]=arr as string[];}
 if(!Array.isArray(v.notes)||v.notes.length>8||v.notes.some(t=>typeof t!=='string'||t.length>250))throw new Error('자동분류 설명이 올바르지 않아요.');
 if(v.unclassifiedObservations!==undefined&&(!Array.isArray(v.unclassifiedObservations)||v.unclassifiedObservations.length>6||v.unclassifiedObservations.some(t=>typeof t!=='string'||t.length>200)))throw new Error('미분류 관찰 내용을 확인해주세요.');
 const base={...(v.tagging===undefined?{}:{tagging:parseTagging(v.tagging,duration)}),...(v.unclassifiedObservations===undefined?{}:{unclassifiedObservations:v.unclassifiedObservations as string[]}),...(v.promptVersion===undefined?{}:{promptVersion:String(v.promptVersion).slice(0,40)}),analyzedAt:v.analyzedAt,suggestedTags,notes:v.notes as string[],...(v.segments===undefined?{}:{segments:parseSegments(v.segments,duration)})};
 return v.engine==='openai-frames-v1'?{...base,engine:v.engine,basis:'full-duration-frames',model:String(v.model),frameCount:Number(v.frameCount),durationSeconds:Number(v.durationSeconds)}:v.engine==='gemini-video-v1'?{...base,engine:v.engine,basis:'full-video',model:String(v.model),sampleFps:2,...(duration===undefined?{}:{durationSeconds:duration})}:{...base,engine:'mobileclip-s0-v1',basis:(v.basis||'video') as 'video'|'storyboard'|'preview',frameCount:Number(v.frameCount)};
}
