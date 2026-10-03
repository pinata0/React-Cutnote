'use client';
import {useEffect,useEffectEvent,useRef,useState,type FormEvent} from 'react';
import Link from 'next/link';
import {jobMessages,terminalJob,type PcJob} from '@/lib/jobs/types';
import {shareLaunch} from '@/lib/mobile-share';
type Settings={folder:string;tools:Record<string,string>;diagnostics:Record<string,{ready:boolean;version?:string}>};
async function api<T=Record<string,unknown>>(url:string,body?:unknown):Promise<T>{const response=await fetch(url,body===undefined?{cache:'no-store'}:{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});const data=await response.json() as T & {error?:string};if(!response.ok)throw Error(data.error||'PC 연결을 확인해주세요.');return data;}
export function PcIngest({location}:{location?:string}){
 const[jobs,setJobs]=useState<PcJob[]>([]),[available,setAvailable]=useState(false),[url,setUrl]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[settings,setSettings]=useState<Settings|null>(null);
 const requestId=useRef<string|null>(null),started=useRef(false),running=useRef(false);
 const launch=location?shareLaunch(new URL(location).search):null;
 const selected=location?new URL(location).searchParams.get('job')||launch?.id:null;
 const jobEndpoint=selected?'/api/jobs?id='+encodeURIComponent(selected):'/api/jobs';
 async function refresh(){try{const data=await api<{available:boolean;jobs:PcJob[]}>(jobEndpoint);setAvailable(data.available);setJobs(data.jobs||[]);}catch(e){setError((e as Error).message);}}
 async function submit(source:string,id?:string){if(running.current)return;running.current=true;setBusy(true);setError('');try{requestId.current=id||requestId.current||crypto.randomUUID();const data=await api<{job:PcJob}>('/api/jobs',{requestId:requestId.current,kind:'ingest',sourceUrl:source});setAvailable(true);setMessage('PC에 접수했어요. 이제 모바일 화면을 닫아도 처리돼요. PC 실행기는 켜두세요.');if(location){window.history.replaceState(null,'','/mobile?saved='+data.job.clipId+'&accepted='+requestId.current+'&job='+data.job.id);}else{setUrl('');requestId.current=null;}await refresh();window.dispatchEvent(new Event('cutnote:sync'));}catch(e){setError((e as Error).message+' 접수를 확인하지 못했다면 같은 요청으로 다시 시도하세요.');}finally{running.current=false;setBusy(false);}}
 useEffect(()=>{let live=true;const update=async()=>{try{const data=await api<{available:boolean;jobs:PcJob[]}>(jobEndpoint);if(live){setAvailable(data.available);setJobs(data.jobs||[]);}}catch(e){if(live)setError((e as Error).message);}};void update();const timer=setInterval(()=>void update(),3000);return()=>{live=false;clearInterval(timer);};},[jobEndpoint]);
 const submitShared=useEffectEvent((entry:NonNullable<ReturnType<typeof shareLaunch>>)=>{void submit(entry.url,entry.id);});
 useEffect(()=>{if(!location||started.current)return;const entry=shareLaunch(new URL(location).search);if(!entry)return;const timer=setTimeout(()=>{started.current=true;submitShared(entry);},0);return()=>clearTimeout(timer);},[location]);
 async function action(job:PcJob,name:string){setError('');try{await api('/api/jobs/'+job.id+'/'+name,{});await refresh();}catch(e){setError((e as Error).message);}}
 async function configure(event?:FormEvent){event?.preventDefault();setError('');try{setSettings(await api<Settings>('/api/pc/settings',event&&settings?{folder:settings.folder,...settings.tools}:undefined));}catch(e){setError((e as Error).message);}}
 if(!available&&!location)return null;
 const shown=selected?jobs.filter(j=>j.id===selected):jobs.slice(0,8);
 return <section className="pc-ingest" aria-label="PC 영상 수집"><h2>PC에 영상 저장하고 분석</h2><p>공개 YouTube · Instagram 영상 → PC 폴더 → OpenAI 분석</p>
 {!launch&&<form onSubmit={e=>{e.preventDefault();void submit(url);}}><label className="field">영상 링크<input type="url" required value={url} maxLength={2000} placeholder="YouTube · Instagram 영상 주소" onChange={e=>{setUrl(e.target.value);requestId.current=null;}} disabled={busy}/></label><button className="primary" disabled={busy||!url}>PC에 저장하고 분석</button></form>}
 {launch&&error&&<button className="primary" disabled={busy} onClick={()=>void submit(launch.url,launch.id)}>같은 공유 요청 다시 접수</button>}
 {message&&<p role="status">{message}</p>}{error&&<p className="error" role="alert">{error}</p>}
 <ul>{shown.map(job=><li key={job.id}><Link href={'/?clip='+job.clipId}>보관함 영상 보기</Link><p role="status">{job.cancelRequested&&!terminalJob(job.state)?jobMessages.cancel_requested:jobMessages[job.errorCode||'']||jobMessages[job.state]||jobMessages[job.phase]||job.state} {!terminalJob(job.state)&&`${job.progress}%`}</p>{!terminalJob(job.state)?<button className="secondary" disabled={job.cancelRequested} onClick={()=>void action(job,'cancel')}>취소</button>:job.state!=='completed'&&<button className="secondary" onClick={()=>void action(job,'retry')}>실패 단계부터 재시도</button>}</li>)}</ul>
 {!location&&<details onToggle={e=>{if(e.currentTarget.open&&!settings)void configure();}}><summary>PC 저장 폴더와 다운로드 도구 설정</summary><p>설정은 PC에서만 변경할 수 있어요. 도구가 없으면 운영 안내에 따라 준비해주세요.</p>{settings&&<form onSubmit={configure}><label className="field">저장 폴더<input value={settings.folder} onChange={e=>setSettings({...settings,folder:e.target.value})}/></label>{(['ytDlp','ffmpeg','ffprobe'] as const).map(name=><label className="field" key={name}>{name} 실행 파일 절대 경로 (빈 값: PATH)<input value={settings.tools[name]||''} onChange={e=>setSettings({...settings,tools:{...settings.tools,[name]:e.target.value}})}/><small>{settings.diagnostics[name]?.ready?settings.diagnostics[name].version:'실행 파일을 찾지 못했어요.'}</small></label>)}<button className="secondary">설정 저장·도구 점검</button></form>}</details>}
 </section>;
}
