'use client';
import { emptyLibraryOrder,type LibraryOrder } from '@/features/library/library-order';

import { request } from '@/lib/client-request';
import { type Clip } from '@/lib/clips';
import type { Dispatch,SetStateAction } from 'react';
import { useCallback,useEffect,useRef,useState } from 'react';
import { toast } from 'sonner';
export function useLibrarySync(setSelected:Dispatch<SetStateAction<Clip|null>>){
 const[order,setOrder]=useState<LibraryOrder>(emptyLibraryOrder);
 const orderPendingRef=useRef(false),orderVersionRef=useRef(0);
 const[clips,setClips]=useState<Clip[]>([]),[loading,setLoading]=useState(true),[loadError,setLoadError]=useState('');
 const[syncing,setSyncing]=useState(true),[syncedAt,setSyncedAt]=useState<number|null>(null),[syncError,setSyncError]=useState('');
 const loadedOnceRef=useRef(false),refreshController=useRef<AbortController|null>(null);
 const openedSharedClip=useRef(false);
 const listRequestRef=useRef(0);
 const loadClips=useCallback((automatic=false)=>{
  if(automatic&&refreshController.current)return Promise.resolve();
  const orderRequest=orderVersionRef.current;const version=++listRequestRef.current;refreshController.current?.abort();const controller=new AbortController();refreshController.current=controller;
  const timeout=setTimeout(()=>controller.abort(),12000);
  return request('/api/clips',{cache:'no-store',signal:controller.signal}).then(data=>{if(version===listRequestRef.current){loadedOnceRef.current=true;setLoadError('');setSyncError('');setClips(data.clips);if(!openedSharedClip.current){const id=new URLSearchParams(window.location.search).get('clip');if(id){openedSharedClip.current=true;const shared=data.clips.find(c=>c.id===id);if(shared)setSelected(shared);else toast.error('저장된 클립을 찾지 못했어요.');}}if(!orderPendingRef.current&&orderRequest===orderVersionRef.current&&data.order)setOrder(data.order);setSelected(current=>current?(data.clips.find(clip=>clip.id===current.id)||null):null);setSyncedAt(Date.now());}}).catch(e=>{if(version===listRequestRef.current){const message=controller.signal.aborted?'PC 응답을 기다리다 시간이 초과됐어요. 같은 Wi-Fi와 PC 실행 상태를 확인해주세요.':(e as Error).message;setSyncError(message);if(!loadedOnceRef.current)setLoadError(message);}}).finally(()=>{clearTimeout(timeout);if(refreshController.current===controller){refreshController.current=null;setSyncing(false);setLoading(false);}});
 },[setSelected]);
 const refresh=useCallback((quiet=false,automatic=false)=>{if(automatic&&refreshController.current)return Promise.resolve();if(!quiet&&!loadedOnceRef.current)setLoading(true);setSyncing(true);setSyncError('');return loadClips(automatic);},[loadClips]);
 useEffect(()=>{void loadClips();},[loadClips]);
 useEffect(()=>{const update=()=>{if(document.visibilityState==='visible')void refresh(true,true);};const sync=()=>{if(document.visibilityState==='visible')void refresh(true);};window.addEventListener('focus',update);window.addEventListener('online',update);window.addEventListener('cutnote:sync',sync);document.addEventListener('visibilitychange',update);const timer=setInterval(update,5000);return()=>{clearInterval(timer);refreshController.current?.abort();window.removeEventListener('focus',update);window.removeEventListener('online',update);window.removeEventListener('cutnote:sync',sync);document.removeEventListener('visibilitychange',update);};},[refresh]);
 return {order,setOrder,orderPendingRef,orderVersionRef,clips,setClips,loading,setLoading,loadError,setLoadError,syncing,syncedAt,syncError,loadedOnceRef,listRequestRef,refresh};
}
