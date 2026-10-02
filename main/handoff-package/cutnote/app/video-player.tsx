'use client';
import {useEffect,useRef,useState} from 'react';
import {timecode,type PlaybackRange} from '@/lib/segments';
function VideoPlayerSession({src,poster,range,onLoadedData,className='detail-video'}:{src:string;poster?:string;range?:PlaybackRange|null;onLoadedData?:(video:HTMLVideoElement)=>void;className?:string}){
 const ref=useRef<HTMLVideoElement>(null),[error,setError]=useState('');
 useEffect(()=>{const video=ref.current;if(!video||!range)return;let active=true;const start=()=>{if(!active)return;setError('');if(Number.isFinite(video.duration)&&range.endSeconds>video.duration+.05){setError('구간의 끝 시간이 영상 길이를 넘어요. 정보 수정에서 시간을 조정해주세요.');return;}video.scrollIntoView({behavior:'smooth',block:'center'});video.currentTime=range.startSeconds;void video.play().catch(()=>{if(active)setError('재생 버튼을 누르면 선택한 구간이 시작돼요.');});};const frame=video.readyState>=1?requestAnimationFrame(start):null;if(frame===null) video.addEventListener('loadedmetadata',start,{once:true});const stop=()=>{if(active&&video.currentTime>=range.endSeconds){if(range.loop){video.currentTime=range.startSeconds;void video.play().catch(()=>{});}else{video.pause();clearInterval(timer);}}};const timer=setInterval(stop,100);return()=>{active=false;if(frame!==null)cancelAnimationFrame(frame);clearInterval(timer);video.removeEventListener('loadedmetadata',start);video.pause();};},[src,range]);
 return <div><video ref={ref} className={className} src={src} poster={poster} controls playsInline preload="metadata" onLoadedData={e=>onLoadedData?.(e.currentTarget)} onError={()=>setError('영상을 재생하지 못했어요. 원본 파일이나 접근 권한을 확인해주세요.')}/>{range&&<p className="form-note" role="status">선택 구간 {timecode(range.startSeconds)}–{timecode(range.endSeconds)} · {range.loop?'구간 반복 재생':'끝에서 자동 정지'}</p>}{error&&<p className="error" role="alert">{error}</p>}</div>;
}

export function VideoPlayer(props:Parameters<typeof VideoPlayerSession>[0]){return <VideoPlayerSession key={props.src} {...props}/>;}
