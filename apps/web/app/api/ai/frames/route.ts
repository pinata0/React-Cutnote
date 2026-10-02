import {apiKey} from '@/lib/ai/settings';
import {parseFrameInput,generateFrames} from '@/lib/ai/openai';
import {readLimited} from '@/lib/links/fetch';
import {crossOrigin,json} from '@/lib/server';
export async function POST(req:Request){if(crossOrigin(req))return json({error:'이 페이지에서 다시 분석해주세요.'},403);const limit=20*1024*1024;if(Number(req.headers.get('content-length')||0)>limit)return json({error:'분석 프레임은 20MB까지 보낼 수 있어요.'},413);const signal=AbortSignal.any([req.signal,AbortSignal.timeout(180000)]);try{const key=await apiKey('openai');if(!key)return json({error:'AI 연결에서 OpenAI API 키를 먼저 등록해주세요.',code:'AI_NOT_CONNECTED'},409);const bytes=await readLimited(new Response(req.body),limit);const input=parseFrameInput(JSON.parse(new TextDecoder().decode(bytes)));return json(await generateFrames(key,input,signal));}catch(error){return json({error:signal.aborted?'분석을 취소했거나 처리 시간이 초과됐어요.':error instanceof Error?error.message:'전체 구간을 분석하지 못했어요.'},422);}}
