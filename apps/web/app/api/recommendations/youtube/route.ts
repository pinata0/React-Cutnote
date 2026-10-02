import {database,json,crossOrigin,serialize,type ClipRow} from '@/lib/server';
import {apiKey} from '@/lib/ai/settings';
import {discoveryProfile,discoveryIdentity} from '@/features/discovery/discovery-profile';
import {discoverYouTube,type DiscoveryFormat,type DiscoveryResult} from '@/lib/ai/youtube-discovery';
import {readLimited} from '@/lib/links/fetch';
export async function POST(req:Request){
 if(crossOrigin(req))return json({error:'현재 보관함에서 다시 찾아주세요.'},403);
 let format:DiscoveryFormat,refresh:boolean;try{const v=JSON.parse(new TextDecoder().decode(await readLimited(new Response(req.body),3000)));if(!['all','shorts'].includes(v.format)||v.refresh!==undefined&&typeof v.refresh!=='boolean')throw new Error();format=v.format;refresh=!!v.refresh;}catch{return json({error:'추천 검색 조건을 확인해주세요.'},400);}
 let token='';try{
  const rows=await database().prepare('SELECT * FROM clips ORDER BY created_at DESC,id DESC').all<ClipRow>(),profile=discoveryProfile(rows.results.map(serialize));
  const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(discoveryIdentity(profile)+':'+format));const id=[...new Uint8Array(digest)].map(v=>v.toString(16).padStart(2,'0')).join('');
  const cached=await database().prepare('SELECT result,updated_at FROM youtube_discovery WHERE id=?').bind(id).first<{result:string;updated_at:number}>(),now=Date.now();
  if(cached&&now-cached.updated_at<2*60*60*1000&&(!refresh||now-cached.updated_at<60000))return json({...JSON.parse(cached.result),cached:true});
  const key=await apiKey('openai');
  await database().prepare("INSERT INTO youtube_discovery(id) VALUES('search-lock') ON CONFLICT(id) DO NOTHING").run();
  token=crypto.randomUUID();const lock=await database().prepare("UPDATE youtube_discovery SET locked_until=?,lock_token=? WHERE id='search-lock' AND locked_until<?").bind(now+180000,token,now).run();if(!lock.meta.changes){token='';return json({error:'다른 화면에서 추천을 찾고 있어요. 잠시 후 다시 열어주세요.',code:'search_busy'},429);}
  const latest=await database().prepare('SELECT result,updated_at FROM youtube_discovery WHERE id=?').bind(id).first<{result:string;updated_at:number}>();if(latest&&Date.now()-latest.updated_at<2*60*60*1000&&(!refresh||Date.now()-latest.updated_at<60000))return json({...JSON.parse(latest.result),cached:true});
  const result:DiscoveryResult=await discoverYouTube(key,profile,format,AbortSignal.any([req.signal,AbortSignal.timeout(150000)]));
  await database().prepare('INSERT INTO youtube_discovery(id,result,updated_at) VALUES(?,?,?) ON CONFLICT(id) DO UPDATE SET result=excluded.result,updated_at=excluded.updated_at').bind(id,JSON.stringify(result),Date.now()).run();
  await database().prepare("DELETE FROM youtube_discovery WHERE id!='search-lock' AND updated_at<?").bind(Date.now()-7*24*60*60*1000).run();return json(result);
 }catch(e){return json({error:e instanceof Error&&!/sql|database|D1|fetch|abort|network|encrypted/i.test(e.message)?e.message:'추천을 불러오지 못했어요. 연결 상태를 확인하고 다시 찾아주세요.'},502);}finally{if(token)await database().prepare("UPDATE youtube_discovery SET locked_until=0,lock_token='' WHERE id='search-lock' AND lock_token=?").bind(token).run().catch(()=>{});}
}
