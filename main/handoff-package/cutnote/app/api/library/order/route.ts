import {database,crossOrigin,json,unavailable,type ClipRow} from '@/lib/server';
import {readLimited} from '@/lib/links/fetch';
import {parseOrderChange} from '@/lib/library-order';
import {readLibraryOrder} from '@/lib/library-order-server';
export async function PATCH(req:Request){
 if(crossOrigin(req))return json({error:'현재 보관함에서 다시 이동해주세요.'},403);
 let input;try{input=parseOrderChange(JSON.parse(new TextDecoder().decode(await readLimited(new Response(req.body),1500000))));}catch{return json({error:'카드 순서 정보를 확인해주세요.'},400);}
 try{
  const rows=await database().prepare('SELECT id,segments FROM clips').all<Pick<ClipRow,'id'|'segments'>>();
  const valid=new Set(rows.results.flatMap(c=>input.scope==='videos'?[c.id]:JSON.parse(c.segments||'[]').map((s:{id:string})=>c.id+'/'+s.id)));
  // Deleted cards are discarded. Concurrent additions are not overwritten and appear first.
  const keys=input.keys.filter(key=>valid.has(key));
  await database().prepare("INSERT INTO library_order(scope,ordered_keys,revision) VALUES(?,'[]',0) ON CONFLICT(scope) DO NOTHING").bind(input.scope).run();
  const result=await database().prepare('UPDATE library_order SET ordered_keys=?,revision=revision+1 WHERE scope=? AND revision=?').bind(JSON.stringify(keys),input.scope,input.revision).run();
  if(!result.meta.changes)return json({error:'다른 기기에서 순서가 바뀌었어요. 최신 순서를 불러온 후 다시 이동해주세요.',order:await readLibraryOrder()},409);
  return json({order:await readLibraryOrder()});
 }catch(e){return unavailable(e);}
}
