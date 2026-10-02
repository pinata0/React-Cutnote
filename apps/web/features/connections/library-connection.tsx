'use client';
import {useSyncExternalStore,useState} from 'react';
import {Monitor,Cloud,RefreshCw,Check,Loader2,Settings2,Sparkles} from 'lucide-react';
import {Dialog,DialogTrigger,DialogContent,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import type {AiStatus} from './ai-connection';
const subscribeHost=()=>()=>{};
type LibrarySync={busy:boolean;at:number|null;error:string;videos:number;segments:number;refresh:()=>Promise<void>};
export function LibraryConnection({status,onStatus,sync,onConfigureAi}:{status:AiStatus|null;onStatus:(value:AiStatus)=>void;sync?:LibrarySync;onConfigureAi?:()=>void}){
 const[open,setOpen]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const host=useSyncExternalStore(subscribeHost,()=>window.location.host,()=> '');
 const pc=status?.workspace?.kind==='pc',remote=status?.workspace?.keyManagement==='pc';
 async function check(){setBusy(true);setError('');try{const res=await fetch('/api/ai/status',{cache:'no-store'});const data=await res.json() as AiStatus&{error?:string};if(!res.ok)throw new Error(data.error||'연결 상태를 확인하지 못했어요.');onStatus(data);}catch{setError('보관함 연결을 확인하지 못했어요. PC와 연결 프로그램이 켜져 있는지 확인해주세요.');}finally{setBusy(false);}}
 return <Dialog open={open} onOpenChange={setOpen}>
 <DialogTrigger asChild><button type="button" className={'connection-settings-trigger'+(sync?.error?' needs-attention':'')} aria-label="연결 설정" title="연결 설정"><Settings2 size={19}/>{sync?.error&&<span className="connection-attention" aria-label="연결 확인 필요"/>}</button></DialogTrigger>
 <DialogContent className="clip-dialog connection-settings-dialog"><DialogTitle>연결 설정</DialogTitle><DialogDescription>보관함 동기화와 영상 분석 AI를 관리해요.</DialogDescription>
 <section className="library-connection" aria-label="보관함 연결">
  <div className="library-connection-heading"><span>{pc?<Monitor size={16}/>:<Cloud size={16}/>}<strong>{status?.workspace?(pc?'PC 보관함':'온라인 보관함'):'보관함 연결 확인 중'}</strong></span><div className="connection-providers">{(['openai','gemini'] as const).map(provider=><span key={provider} data-connected={!!status?.providers?.[provider]}>{status?.providers?.[provider]&&<Check size={13}/>} {provider==='openai'?'OpenAI':'Gemini'} {status?status.providers?.[provider]?'연결됨':'미연결':'확인 중'}</span>)}</div></div>
  {sync&&<div className="library-sync"><div role="status" aria-live="polite">{sync.busy?<span>최신 보관함을 불러오는 중…</span>:sync.error?<span className="sync-failed">연결을 확인해주세요</span>:sync.at?<><strong>영상 {sync.videos}개 · 구간 {sync.segments}개</strong><span>마지막 동기화 {new Date(sync.at).toLocaleTimeString('ko-KR',{hour:'2-digit',minute:'2-digit',second:'2-digit'})}</span></>:<span>보관함을 불러오는 중…</span>}</div><button type="button" className="secondary" onClick={()=>{void check();void sync.refresh();}} disabled={sync.busy} aria-label={pc?'PC 보관함 동기화':'보관함 새로고침'}>{sync.busy?<Loader2 size={16} className="spinner"/>:<RefreshCw size={16}/>} {pc?'PC와 동기화':'새로고침'}</button>{sync.error&&<p className="error" role="alert">{sync.error}{sync.at?' 마지막으로 불러온 내용은 그대로 보여드려요.':''}</p>}</div>}
  <details><summary>연결 정보 · 휴대폰 사용 안내</summary><div className="connection-detail-heading"><p>{host}</p><button type="button" className="subtle-button" onClick={()=>void check()} disabled={busy} aria-label="보관함 연결 다시 확인">{busy?<Loader2 size={15} className="spinner"/>:<RefreshCw size={15}/>}연결 확인</button></div><p>{status?.workspace?(pc?remote?'이 화면에서 저장·수정한 내용도 PC에 함께 반영돼요. 영상·태그·즐겨찾기·카드 순서와 API 연결을 함께 사용하므로 키를 다시 입력하지 않아도 돼요.':'앱과 다른 컴퓨터가 이 PC에 연결하면 같은 영상·태그·즐겨찾기·카드 순서를 사용해요. 어느 기기에서 저장해도 함께 반영되고, 화면을 열어두면 5초마다 변경을 확인해요.':'이 온라인 보관함과 PC 로컬 보관함은 서로 별개예요. PC와 앱을 함께 쓰려면 컴퓨터에서는 로컬 컷노트를 열고 앱에서는 그 PC에 연결하세요.'):'현재 보관함의 AI 연결을 확인하고 있어요.'}</p>{pc&&<><ol><li>컴퓨터에서 컷노트와 연결 프로그램을 켜두세요.</li><li>휴대폰을 같은 Wi-Fi에 연결하고 컷노트 앱의 <b>설정</b>을 여세요.</li><li>컴퓨터 주소와 연결 코드를 입력하세요. 휴대폰에 127.0.0.1을 입력하면 연결되지 않아요.</li></ol><p>공개 YouTube 링크 분석에는 PC에 연결한 Gemini를 사용해요. API 키는 PC에서 한 번만 관리해요.</p></>}</details>
  {error&&<p role="alert" className="error">{error}</p>}
 </section>
 {onConfigureAi&&<button type="button" className="secondary manage-ai-button" onClick={()=>{setOpen(false);onConfigureAi();}}><Sparkles size={17}/>{remote?'AI 사용 안내':'AI 연결 관리'}</button>}
 </DialogContent></Dialog>;
}
