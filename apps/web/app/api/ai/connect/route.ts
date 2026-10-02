import {saveKey,models,aiStatus} from '@/lib/ai/settings';
import {normalizeKeyInput} from '@/lib/ai/key-input';
import {GOOGLE_API} from '@/lib/ai/gemini';
import {crossOrigin,json} from '@/lib/server';
export async function POST(req:Request){
 if(crossOrigin(req))return json({error:'이 페이지에서 다시 연결해주세요.'},403);
 if(Number(req.headers.get('content-length')||0)>2048)return json({error:'연결 정보를 확인해주세요.'},413);
 try{const value=await req.json() as {apiKey?:unknown;provider?:unknown};const provider=value.provider;if(provider!=='openai'&&provider!=='gemini')return json({error:'AI 서비스를 선택해주세요.'},400);const key=normalizeKeyInput(value.apiKey,provider);if(!key)return json({error:provider==='gemini'?'Gemini API 키 형식을 확인해주세요. Google AI Studio의 API 키를 복사해 입력하세요.':'OpenAI API 키 형식을 확인해주세요. API 키를 복사해 입력하세요.'},400);
 const endpoint=provider==='openai'?'https://api.openai.com/v1/models/'+models.openai:GOOGLE_API+'/v1beta/models/'+models.gemini;
 const headers:Record<string,string>=provider==='openai'?{Authorization:'Bearer '+key}:{'x-goog-api-key':key};
 const check=await fetch(endpoint,{headers,signal:AbortSignal.timeout(15000)});if(!check.ok){await check.body?.cancel();return json({error:'API 키 또는 모델 접근 권한을 확인해주세요. 기존 연결은 유지돼요.'},400);}const model=await check.json() as {id?:string;name?:string;supportedGenerationMethods?:string[]};
 if(provider==='openai'?model.id!==models.openai:model.name!=='models/'+models.gemini||!model.supportedGenerationMethods?.includes('generateContent'))return json({error:'이 계정에서 분석 모델을 사용할 수 없어요.'},400);
 await saveKey(provider,key);return json(await aiStatus());
 }catch{return json({error:'AI 연결을 완료하지 못했어요. 잠시 후 다시 시도해주세요.'},503);}
}
