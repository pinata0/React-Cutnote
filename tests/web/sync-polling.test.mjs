import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const file=readFileSync('apps/web/features/library/use-library-sync.ts','utf8');
function callbackNamed(name, endMarker){
 const marker='const '+name+'=useCallback(',start=file.indexOf(marker)+marker.length;
 const end=file.indexOf(endMarker,start);
 assert(start>=marker.length&&end>start,'Find actual '+name+' callback');
 return file.slice(start,end).replaceAll('(e as Error)','e');
}
const loadCallback=callbackNamed('loadClips',',[setSelected]);');
const refreshCallback=callbackNamed('refresh',',[loadClips]);');
function harness(delay=6000,{loaded=false,fail=false}={}){
 let now=0,id=0;const timers=new Map(),state={clips:loaded?[{id:'existing'}]:[],syncError:'',loading:!loaded,syncing:false,syncedAt:null};
 const counts={requests:0,aborted:0,commits:0};
 const setTimeout=(fn,ms)=>{timers.set(++id,{fn,at:now+ms});return id;};
 const clearTimeout=id=>timers.delete(id);
 const context={openedSharedClip:{current:false},window:{location:{search:''}},URLSearchParams,toast:{error:()=>{}},orderVersionRef:{current:0},listRequestRef:{current:0},refreshController:{current:null},loadedOnceRef:{current:loaded},orderPendingRef:{current:false},AbortController,setTimeout,clearTimeout,Date:{now:()=>now},
  setLoading:v=>state.loading=v,setSyncing:v=>state.syncing=v,setSyncError:v=>state.syncError=v,setLoadError:v=>state.loadError=v,setClips:v=>{state.clips=v;counts.commits++;},setOrder:()=>{},setSelected:()=>{},setSyncedAt:v=>state.syncedAt=v,
  request:(_,{signal})=>{counts.requests++;return new Promise((resolve,reject)=>{let settled=false;const timer=Number.isFinite(delay)?setTimeout(()=>{settled=true;signal.removeEventListener('abort',abort);fail?reject(new Error('offline')):resolve({clips:[{id:'fresh'}],order:{}});},delay):null;const abort=()=>{if(settled)return;settled=true;counts.aborted++;clearTimeout(timer);reject(new Error('aborted'));};signal.addEventListener('abort',abort,{once:true});});}
 };
 context.loadClips=vm.runInNewContext('('+loadCallback+')',context);
 const refresh=vm.runInNewContext('('+refreshCallback+')',context);
 const flush=async()=>{for(let i=0;i<8;i++)await Promise.resolve();};
 async function advance(to){for(;;){const next=[...timers].filter(([,v])=>v.at<=to).sort((a,b)=>a[1].at-b[1].at)[0];if(!next)break;now=next[1].at;timers.delete(next[0]);next[1].fn();await flush();}now=to;await flush();}
 return{state,counts,context,refresh,advance};
}
const checks=[];
{
 const h=harness();void h.refresh();await h.advance(5000);await h.refresh(true,true);assert.equal(h.counts.requests,1);assert.equal(h.counts.aborted,0);await h.advance(6000);assert.equal(h.counts.commits,1);assert.equal(h.state.syncedAt,6000);checks.push('6-second request survives 5-second automatic poll');
}
{
 const h=harness(Infinity,{loaded:true});void h.refresh(true);await h.advance(5000);await h.refresh(true,true);await h.advance(10000);await h.refresh(true,true);await h.advance(12000);assert.equal(h.counts.aborted,1);assert.match(h.state.syncError,/시간이 초과/);assert.equal(h.state.clips[0].id,'existing');assert.equal(h.state.syncing,false);await h.advance(15000);void h.refresh(true,true);assert.equal(h.counts.requests,2);h.context.refreshController.current.abort();checks.push('hung request reaches timeout, preserves existing list, permits retry');
}
{
 const h=harness();void h.refresh();await h.advance(1000);void h.refresh(true);assert.equal(h.counts.requests,2);assert.equal(h.counts.aborted,1);await h.advance(7000);assert.equal(h.counts.commits,1);assert.equal(h.state.syncError,'');checks.push('manual synchronization supersedes in-flight request without stale error');
}
{
 const h=harness();void h.refresh();h.context.listRequestRef.current++;await h.advance(6000);assert.equal(h.counts.commits,0);void h.refresh(true,true);await h.advance(12000);assert.equal(h.counts.commits,1);checks.push('mutation revision guard still discards stale GET and next poll refreshes');
}
{
 const h=harness(100,{loaded:true,fail:true});void h.refresh(true,true);await h.advance(100);assert.equal(h.state.clips[0].id,'existing');assert.equal(h.state.syncError,'offline');assert.equal(h.state.loading,false);checks.push('quiet failure preserves prior clips and exposes sync error');
}
assert(file.includes("window.addEventListener('cutnote:sync',sync)")&&file.includes('const sync=()=>{if(document.visibilityState===\'visible\')void refresh(true);}'),'Native explicit sync keeps forced refresh');
console.log(JSON.stringify({passed:true,checkCount:checks.length,checks,networkCalls:0}));
