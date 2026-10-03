import {internal,workerAction} from '@/lib/jobs/server';
import {json} from '@/lib/server';
import {readLimited} from '@/lib/links/fetch';
export async function POST(req:Request){if(!internal(req))return json({error:'Unauthorized'},401);try{return await workerAction(JSON.parse(new TextDecoder().decode(await readLimited(new Response(req.body),2*1024*1024))));}catch{return json({error:'작업 상태 또는 입력을 확인해주세요.'},422);}}
