import {aiStatus,apiKey} from '@/lib/ai/settings';
import {generateImageQuery,parseSearchImage,IMAGE_BODY_LIMIT} from '@/lib/ai/image-query';
import {readLimited} from '@/lib/links/fetch';
import {crossOrigin,json} from '@/lib/server';
export async function POST(req:Request){
 if(crossOrigin(req))return json({error:'이 페이지에서 사진을 다시 선택해주세요.'},403);
 if(Number(req.headers.get('content-length')||0)>IMAGE_BODY_LIMIT)return json({error:'사진이 너무 커요. 다시 선택해주세요.'},413);
 const signal=AbortSignal.any([req.signal,AbortSignal.timeout(90000)]);
 try{const bytes=await readLimited(new Response(req.body),IMAGE_BODY_LIMIT);let value:unknown;try{value=JSON.parse(new TextDecoder().decode(bytes));}catch{return json({error:'사진 요청 형식을 확인해주세요.'},400);}const image=parseSearchImage(value);const status=await aiStatus();const key=await apiKey(status.provider);if(!key)return json({error:'AI 연결에서 API 키를 먼저 연결해주세요.',code:'AI_NOT_CONNECTED'},409);return json(await generateImageQuery(status.provider,key,image,signal));}
 catch(error){return json({error:signal.aborted?'사진 분석을 취소했거나 처리 시간이 초과됐어요.':error instanceof Error?error.message:'사진을 분석하지 못했어요.'},422);}
}
