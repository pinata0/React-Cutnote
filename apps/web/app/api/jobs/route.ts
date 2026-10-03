import {crossOrigin,json} from '@/lib/server';
import {enabled,listJobs,submit} from '@/lib/jobs/server';
import {readLimited} from '@/lib/links/fetch';
export async function GET(req:Request){if(!enabled())return json({jobs:[],available:false});try{return json({jobs:await listJobs(new URL(req.url).searchParams.get('id')||undefined),available:true});}catch{return json({error:'PC 작업 DB를 초기화해주세요.'},503);}}
export async function POST(req:Request){if(crossOrigin(req))return json({error:'현재 페이지에서 제출해주세요.'},403);try{const data=JSON.parse(new TextDecoder().decode(await readLimited(new Response(req.body),16000)));return await submit(data);}catch(e){return json({error:e instanceof Error?e.message:'입력을 확인해주세요.'},400);}}
