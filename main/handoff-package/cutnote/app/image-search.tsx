'use client';
import NextImage from 'next/image';
import {useEffect,useRef,useState} from 'react';
import {ImagePlus,Loader2,Search} from 'lucide-react';
import {Dialog,DialogContent,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import type {ImageQuery} from '@/lib/image-search';
import type {AiStatus} from './ai-connection';
export type PhotoSearch=ImageQuery&{preview:string};
async function preparePhoto(file:File){
 if(!['image/jpeg','image/png','image/webp'].includes(file.type)||!file.size||file.size>10*1024*1024)throw new Error('10MB 이하의 JPG·PNG·WebP 사진을 선택해주세요.');
 const url=URL.createObjectURL(file),img=new Image();
 try{await new Promise<void>((resolve,reject)=>{img.onload=()=>resolve();img.onerror=()=>reject(new Error('사진 파일을 읽지 못했어요. 다른 사진을 선택해주세요.'));img.src=url;});
 if(!img.naturalWidth||!img.naturalHeight||img.naturalWidth*img.naturalHeight>60000000)throw new Error('사진 해상도가 너무 커요. 크기를 줄여주세요.');
 const scale=Math.min(1,1280/Math.max(img.naturalWidth,img.naturalHeight)),canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(img.naturalWidth*scale));canvas.height=Math.max(1,Math.round(img.naturalHeight*scale));const context=canvas.getContext('2d');if(!context)throw new Error('이 브라우저에서 사진을 처리하지 못했어요.');context.fillStyle='#ffffff';context.fillRect(0,0,canvas.width,canvas.height);context.drawImage(img,0,0,canvas.width,canvas.height);return canvas.toDataURL('image/jpeg',.8);
 }finally{URL.revokeObjectURL(url);}
}
function ImageSearchSession({open,onOpenChange,onSearch,status}:{open:boolean;onOpenChange:(open:boolean)=>void;onSearch:(query:PhotoSearch)=>void;status:AiStatus|null}){
 const[image,setImage]=useState(''),[name,setName]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false),[preparing,setPreparing]=useState(false);
 const version=useRef(0),controller=useRef<AbortController|null>(null);
 function cancel(){version.current++;controller.current?.abort();controller.current=null;setBusy(false);setPreparing(false);}
 useEffect(()=>()=>{version.current++;controller.current?.abort();},[]);
 async function choose(file?:File){cancel();setImage('');setName('');setError('');if(!file)return;const id=version.current;setPreparing(true);try{const result=await preparePhoto(file);if(id===version.current){setImage(result);setName(file.name);}}catch(e){if(id===version.current)setError((e as Error).message);}finally{if(id===version.current)setPreparing(false);}}
 function close(){cancel();onOpenChange(false);}
 async function search(){if(!image||busy||preparing)return;cancel();const id=version.current,c=new AbortController();controller.current=c;setBusy(true);setError('');try{const res=await fetch('/api/ai/image-query',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({image}),signal:c.signal});const data=await res.json() as ImageQuery&{error?:string};if(!res.ok)throw new Error(data.error||'사진을 분석하지 못했어요.');if(id!==version.current||c.signal.aborted)return;onSearch({...data,preview:image});close();}catch(e){if(id===version.current&&!c.signal.aborted)setError((e as Error).message);}finally{if(id===version.current){setBusy(false);controller.current=null;}}}
 return <Dialog open={open} onOpenChange={next=>{if(!next)close();else onOpenChange(true);}}><DialogContent className="clip-dialog photo-dialog"><DialogTitle>사진으로 구간 찾기</DialogTitle><DialogDescription>사진의 색감·구도·시각 효과와 비슷한 태그가 있는 저장 구간을 찾아요. 움직임이나 제작 방식은 사진으로 판단하지 않아요.</DialogDescription>
 <label className="dropzone photo-drop"><ImagePlus size={28}/><strong>{name||'검색할 사진 선택'}</strong><span>JPG · PNG · WebP / 최대 10MB</span><input type="file" aria-label="검색할 사진 선택" accept="image/jpeg,image/png,image/webp" onChange={e=>{const file=e.target.files?.[0];e.target.value='';void choose(file);}}/></label>
 {image&&<NextImage unoptimized width={640} height={360} className="photo-preview" src={image} alt="검색할 사진 미리보기"/>}{preparing&&<p role="status">사진을 준비하고 있어요…</p>}
 <p className="form-note">검색 사진은 컷노트에 저장하지 않으며, 분석을 위해 연결한 {status?.provider==='openai'?'OpenAI':'Gemini'} 서비스로 전송돼요. 현재 보관함의 API 연결을 사용해요.</p>
 {!status?.configured&&<p className="error">상단 ‘AI 연결’에서 API를 연결한 뒤 이용해주세요.</p>}{error&&<p className="error" role="alert">{error}</p>}{busy&&<p className="analysis-running" role="status"><Loader2 size={17} className="spinner"/>사진에서 검색할 특징을 찾고 있어요…</p>}
 <div className="form-actions"><button className="secondary" onClick={close}>{busy?'취소':'닫기'}</button><button className="primary" disabled={!image||busy||preparing||!status?.configured} onClick={()=>void search()}><Search size={17}/>사진으로 구간 찾기</button></div>
 </DialogContent></Dialog>;
}

export function ImageSearch(props:Parameters<typeof ImageSearchSession>[0]){return props.open?<ImageSearchSession {...props}/>:null;}
