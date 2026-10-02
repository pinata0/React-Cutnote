import {object} from '@/lib/json';
import {aiStatus,apiKey} from '@/lib/ai/settings';
import {generateEffectIntent} from '@/lib/ai/effect-query';
import {localEffectIntent} from '@/features/discovery/recommendations';
import {crossOrigin,json} from '@/lib/server';
import {readLimited} from '@/lib/links/fetch';
export async function POST(req:Request){
 if(crossOrigin(req))return json({error:'현재 페이지에서 다시 검색해주세요.'},403);
 const signal=AbortSignal.any([req.signal,AbortSignal.timeout(60000)]);
 try{let value:Record<string,unknown>;try{const bytes=await readLimited(new Response(req.body),6000);value=object(JSON.parse(new TextDecoder().decode(bytes)));}catch{return json({error:'효과 설명은 300자까지 입력해주세요.'},400);}
 if(typeof value?.query!=='string'||!value.query.trim()||value.query.length>300)return json({error:'원하는 효과를 300자 이내로 입력해주세요.'},400);
 const status=await aiStatus(),key=await apiKey(status.provider);if(!key)return json({intent:localEffectIntent(value.query),mode:'dictionary'});
 return json({intent:await generateEffectIntent(status.provider,key,value.query,signal),mode:'ai'});
 }catch(e){return json({error:signal.aborted?'검색을 취소했거나 시간이 초과됐어요.':e instanceof Error?e.message:'검색 의도를 해석하지 못했어요.'},422);}
}
