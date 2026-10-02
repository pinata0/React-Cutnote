import {fetchPublic,readLimited} from '@/lib/links/fetch';
import {json} from '@/lib/server';
export async function GET(req:Request){
 try{const url=new URL(req.url).searchParams.get('url');if(!url)return json({error:'미디어 주소가 없어요.'},400);const{response}=await fetchPublic(url,'image/*,video/*');const type=(response.headers.get('content-type')||'').split(';')[0].toLowerCase();if(!/^(image\/(jpeg|png|webp|avif)|video\/(mp4|webm|quicktime|ogg))$/.test(type)){await response.body?.cancel();return json({error:'분석할 수 있는 이미지나 영상이 아니에요.'},422);}const data=await readLimited(response,type.startsWith('image/')?8*1024*1024:25*1024*1024);return new Response(data,{headers:{'Content-Type':type,'Content-Length':String(data.length),'Cache-Control':'private, max-age=900','X-Content-Type-Options':'nosniff'}});}catch(error){return json({error:error instanceof Error?error.message:'장면을 가져오지 못했어요.'},422);}
}
