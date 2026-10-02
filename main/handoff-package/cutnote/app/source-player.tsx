'use client';
import {useEffect,useRef,useState} from 'react';
import {ExternalLink,Loader2} from 'lucide-react';
import {VideoPlayer} from './video-player';
import {proxyMedia} from '@/lib/links/types';
import {timecode,type PlaybackRange} from '@/lib/segments';
import {videoProvider} from '@/lib/links/provider';
type YoutubePlayer={destroy:()=>void;seekTo:(seconds:number,allowSeekAhead:boolean)=>void;playVideo:()=>void;pauseVideo:()=>void;getCurrentTime:()=>number;getDuration:()=>number};
type YoutubeApi={Player:new(target:HTMLElement,options:{videoId:string;width:string;height:string;playerVars:Record<string,string|number>;events:{onReady:()=>void;onError:(event:{data:number})=>void}})=>YoutubePlayer};
declare global{interface Window{YT?:YoutubeApi;onYouTubeIframeAPIReady?:()=>void}}
let api:Promise<YoutubeApi>|undefined;
function youtubeApi(){if(window.YT?.Player)return Promise.resolve(window.YT);if(api)return api;api=new Promise<YoutubeApi>((resolve,reject)=>{const previous=window.onYouTubeIframeAPIReady;const timer=setTimeout(()=>{api=undefined;reject(new Error('Player unavailable'));},12000);window.onYouTubeIframeAPIReady=()=>{previous?.();clearTimeout(timer);if(window.YT?.Player)resolve(window.YT);else reject(new Error('Player unavailable'));};const script=document.createElement('script');script.src='https://www.youtube.com/iframe_api';script.async=true;script.onerror=()=>{clearTimeout(timer);api=undefined;reject(new Error('Player unavailable'));};document.head.appendChild(script);});return api;}
function SourcePlayerSession({url,title,range}:{url:string;title?:string;range?:PlaybackRange|null}){
 const source=videoProvider(url),mount=useRef<HTMLDivElement>(null),playerRef=useRef<YoutubePlayer|null>(null),[instagramMedia,setInstagramMedia]=useState(''),[rangeError,setRangeError]=useState(''),[state,setState]=useState<'loading'|'ready'|'failed'>('loading'),[error,setError]=useState('');
 const id=source?.id,kind=source?.kind;
 useEffect(()=>{if(kind!=='youtube'||!id||!mount.current)return;let alive=true,player:YoutubePlayer|undefined;const timer=setTimeout(()=>{if(alive){setState('failed');setError('이 브라우저에서 플레이어를 불러오지 못했어요. 원본에서 전체 영상을 볼 수 있어요.');}},18000);
 const fail=(code?:number)=>{if(!alive)return;clearTimeout(timer);setState('failed');setError(code===101||code===150?'영상 제작자가 외부 사이트 재생을 제한했어요. 원본에서 재생해주세요.':code===100?'영상이 비공개이거나 삭제되어 재생할 수 없어요.':'이 브라우저에서 플레이어를 불러오지 못했어요. 원본에서 전체 영상을 볼 수 있어요.');};
 void youtubeApi().then(yt=>{if(!alive||!mount.current)return;const target=document.createElement('div');mount.current.replaceChildren(target);player=new yt.Player(target,{videoId:id,width:'100%',height:'100%',playerVars:{playsinline:1,rel:0,origin:window.location.origin},events:{onReady:()=>{if(alive){clearTimeout(timer);setState('ready');}},onError:e=>fail(e.data)}});playerRef.current=player;const iframe=mount.current.querySelector('iframe');if(iframe){iframe.title=(title||'원본 영상')+' 재생';iframe.referrerPolicy='strict-origin-when-cross-origin';}}).catch(()=>fail());
 return()=>{alive=false;clearTimeout(timer);playerRef.current=null;try{player?.destroy();}catch{}};
 },[id,kind,title]);
 useEffect(()=>{
  if(kind!=='youtube'||state!=='ready'||!range||!playerRef.current)return;
  const player=playerRef.current;let active=true,started=false;
  const frame=requestAnimationFrame(()=>{if(!active)return;setRangeError('');try{if(player.getDuration()>0&&range.endSeconds>player.getDuration()+.1){setRangeError('구간의 끝 시간이 영상 길이를 넘어요. 시간을 조정해주세요.');return;}mount.current?.scrollIntoView({behavior:'smooth',block:'center'});player.seekTo(range.startSeconds,true);player.playVideo();started=true;}catch{setRangeError('플레이어가 준비되지 않았어요. 잠시 후 구간을 다시 선택해주세요.');return;}});
  const timer=setInterval(()=>{if(!started)return;if(!active||playerRef.current!==player){clearInterval(timer);return;}try{if(player.getCurrentTime()>=range.endSeconds){if(range.loop){player.seekTo(range.startSeconds,true);player.playVideo();}else{player.pauseVideo();clearInterval(timer);}}}catch{clearInterval(timer);}},100);
  return()=>{active=false;cancelAnimationFrame(frame);clearInterval(timer);if(playerRef.current===player)try{player.pauseVideo();}catch{}};
 },[id,kind,state,range]);
 useEffect(()=>{if(kind!=='instagram'||!range)return;const controller=new AbortController();void fetch('/api/links/resolve',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({url}),signal:controller.signal}).then(async res=>{const data=await res.json() as {link?:{mediaUrl?:string}};if(controller.signal.aborted)return;if(!res.ok||!data.link?.mediaUrl)throw new Error('이 인스타 영상은 원본 파일에 접근할 수 없어 구간 재생이 어려워요. 원본에서 재생하거나 영상 파일을 업로드해주세요.');setRangeError('');setInstagramMedia(proxyMedia(data.link.mediaUrl));}).catch(error=>{if(!controller.signal.aborted)setRangeError(error.message);});return()=>controller.abort();},[id,kind,range,url]);
 if(!source)return null;
 return <section className={'source-player '+source.kind} aria-label="원본 영상 재생">{source.kind==='youtube'?<div className="youtube-stage"><div ref={mount} className="youtube-mount"/>{state!=='ready'&&<div className="player-message" role="status">{state==='loading'?<><Loader2 size={25} className="spinner"/><span>전체 영상 플레이어를 불러오는 중…</span></>:<><p>{error}</p><a className="primary" href={source.url} target="_blank" rel="noopener noreferrer"><ExternalLink size={16}/>YouTube에서 전체 영상 보기</a></>}</div>}</div>:instagramMedia?<VideoPlayer src={instagramMedia} range={range}/>:<iframe key={source.embed} src={source.embed} title={(title||'원본 영상')+' 재생'} allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen referrerPolicy="strict-origin-when-cross-origin"/>}{range&&kind==='instagram'&&!instagramMedia&&!rangeError&&<p className="form-note" role="status">구간 재생용 원본 영상을 불러오는 중…</p>}{rangeError&&<p className="error" role="alert">{rangeError}</p>}{range&&kind==='youtube'&&<p className="form-note" role="status">선택 구간 {timecode(range.startSeconds)}–{timecode(range.endSeconds)} · {range.loop?'구간 반복 재생':'끝에서 자동 정지'}</p>}<p className="form-note">원본 전체 영상의 재생을 지원해요. 재생이나 로그인이 제한되면 <a href={source.url} target="_blank" rel="noopener noreferrer">원본에서 열기 <ExternalLink size={12}/></a>를 이용하세요.</p></section>;
}

export function SourcePlayer(props:Parameters<typeof SourcePlayerSession>[0]){return <SourcePlayerSession key={props.url} {...props}/>;}
