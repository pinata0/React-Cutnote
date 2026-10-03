import {crossOrigin,json} from '@/lib/server';
import {enabled,changeJob} from '@/lib/jobs/server';
export async function POST(req:Request,{params}:{params:Promise<{id:string;action:string}>}){if(!enabled()||crossOrigin(req))return json({error:'PC 연결을 확인해주세요.'},403);try{const{id,action}=await params;return await changeJob(id,action);}catch{return json({error:'작업 상태를 변경하지 못했어요.'},503);}}
