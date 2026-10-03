'use client';
import {useState,type FormEvent} from 'react';
import {Check,Loader2,ExternalLink} from 'lucide-react';
import {Dialog,DialogContent,DialogTitle,DialogDescription} from '@/components/ui/dialog';
export type AiStatus={localIngestAvailable?:boolean;configured:boolean;canConnect:boolean;provider:'openai'|'gemini';model:string;providers?:{openai:boolean;gemini:boolean};workspace?:import('@/lib/workspace-context').WorkspaceContext};
export function AiConnection({open,onOpenChange,status,onConnected,initialProvider,resumeAnalysis=false}:{open:boolean;onOpenChange:(value:boolean)=>void;status:AiStatus|null;onConnected:(status:AiStatus)=>void;initialProvider:AiStatus['provider'];resumeAnalysis?:boolean}){
 const[key,setKey]=useState(''),[provider,setProvider]=useState(initialProvider),[busy,setBusy]=useState(false),[error,setError]=useState('');
 function close(value:boolean){if(busy)return;if(!value){setKey('');setError('');}onOpenChange(value);}
 async function connect(event:FormEvent){event.preventDefault();setBusy(true);setError('');try{const res=await fetch('/api/ai/connect',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({apiKey:key,provider})});const data=await res.json() as AiStatus&{error?:string};if(!res.ok)throw new Error(data.error||'연결하지 못했어요.');setKey('');onConnected(data);onOpenChange(false);}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 return <Dialog open={open} onOpenChange={close}><DialogContent className="clip-dialog ai-dialog">
  <DialogTitle>영상 분석 AI 연결</DialogTitle><DialogDescription>{resumeAnalysis?'키를 연결하면 현재 영상 분석을 바로 시작해요.':'API 키를 연결하면 제목·색감·구도·효과·메모를 자동으로 채워요.'}</DialogDescription>
  <div className="connection-summary"><strong>{status?.configured?`기본 분석 서비스: ${status.provider==='openai'?'OpenAI':'Gemini'}`:'연결 대기 중'}</strong>
   {status?.providers&&<p>OpenAI {status.providers.openai?'연결됨':'미연결'} · Gemini {status.providers.gemini?'연결됨':'미연결'}. 공개 YouTube는 연결된 Gemini를 사용하고, 나머지는 기본 서비스로 분석해요.</p>}
   {provider==='openai'?<><p>OpenAI는 원본 영상의 처음부터 끝까지 프레임을 추출해 분석해요. 음성은 제외하고, 영상당 최대 120장을 사용해요.</p><p>YouTube·Instagram 재생 링크만으로는 원본을 읽지 못할 수 있어요. 이 경우 파일 업로드가 필요해요.</p><p>추출한 프레임은 OpenAI로 전달되며 연결한 API 계정의 사용량·요금이 적용돼요.</p></>:<><p>Gemini는 공개 YouTube 링크나 업로드 영상의 전체 길이를 초당 2개 프레임과 음성으로 분석해요. 빠른 효과를 놓칠 수 있어요.</p><p>영상은 Google로 전달되며 연결한 API 계정의 사용량·요금이 적용돼요. Instagram 원본 접근이 제한되면 파일 업로드가 필요해요.</p></>}
  </div>
  {status?.workspace?.keyManagement==='pc'?<div className="pc-key-notice"><strong>이 휴대폰은 PC의 AI 연결을 사용해요</strong><p>API 키를 휴대폰에 다시 입력하지 않아도 돼요. 연결을 추가하거나 바꾸려면 컴퓨터의 로컬 컷노트에서 AI 연결을 여세요.</p><p>공개 YouTube는 PC에 연결한 Gemini로 분석해요. PC에서 연결한 뒤 이 화면을 닫고 ‘연결 확인’을 누르세요.</p><button type="button" className="secondary" onClick={()=>close(false)}>확인</button></div>:<form onSubmit={connect}><label className="field">AI 서비스<select value={provider} onChange={e=>{setProvider(e.target.value as AiStatus['provider']);setKey('');setError('');}} disabled={busy}><option value="openai">OpenAI · 내 API 키 사용</option><option value="gemini">Gemini · 공개 YouTube 링크 직접 분석</option></select></label>
   <label className="field">{provider==='openai'?'OpenAI':'Gemini'} API 키<input type="password" autoComplete="off" spellCheck={false} value={key} onChange={e=>{setKey(e.target.value);setError('');}} required minLength={20} maxLength={1024} disabled={busy||!status?.canConnect} placeholder={provider==='openai'?'sk-…':'Google AI Studio에서 복사한 API 키'}/></label>
   <p className="form-note">키를 복사해 붙여넣으세요. 따옴표나 {provider==='openai'?'OPENAI_API_KEY=':'GEMINI_API_KEY='}가 포함되어도 괜찮아요. 서버에 암호화해 저장하고 다시 표시하지 않아요.</p>
   <a className="key-help" href={provider==='openai'?'https://platform.openai.com/api-keys':'https://aistudio.google.com/apikey'} target="_blank" rel="noopener noreferrer">{provider==='openai'?'OpenAI':'Google AI Studio'}에서 키 관리 <ExternalLink size={14}/></a>
   {!status?.canConnect&&<p className="error">연결 저장소를 준비하지 못했어요. 페이지를 새로고침한 뒤 다시 확인해주세요.</p>}{error&&<p className="error" role="alert">{error}</p>}
   <div className="form-actions"><button type="button" className="secondary" onClick={()=>close(false)} disabled={busy}>닫기</button><button type="submit" className="primary" disabled={busy||!status?.canConnect}>{busy?<Loader2 size={16} className="spinner"/>:<Check size={16}/>} {busy?'연결 확인 중…':resumeAnalysis?'연결하고 분석 시작':'키 연결'}</button></div>
  </form>}
 </DialogContent></Dialog>;
}
