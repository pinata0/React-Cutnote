import {resolveLink} from '@/lib/links/resolve';
import {crossOrigin,json} from '@/lib/server';
export async function POST(req:Request){
 if(crossOrigin(req))return json({error:'이 페이지에서 다시 시도해주세요.'},403);
 try{const body=await req.json() as {url?:unknown};if(typeof body.url!=='string')return json({error:'영상 링크를 입력해주세요.'},400);return json({link:await resolveLink(body.url)});}catch(error){return json({error:error instanceof Error?error.message:'영상 링크를 읽지 못했어요. 링크만 저장할 수 있어요.'},422);}
}
