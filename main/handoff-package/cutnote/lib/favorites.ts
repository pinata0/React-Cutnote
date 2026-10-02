import {database,findClip,json,serialize} from './server';
export type FavoriteChange={favorite:boolean;segmentId?:string};
export function parseFavoriteChange(body:Record<string,unknown>):FavoriteChange{
 if(Object.keys(body).length!==1||!Object.prototype.hasOwnProperty.call(body,'favoriteChange'))throw new Error('즐겨찾기는 다른 수정과 별도로 저장해주세요.');
 const value=body.favoriteChange as Record<string,unknown>;
 if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(key=>!['favorite','segmentId'].includes(key))||typeof value.favorite!=='boolean'||value.segmentId!==undefined&&(typeof value.segmentId!=='string'||! /^[\w-]{1,64}$/.test(value.segmentId)))throw new Error('즐겨찾기 정보를 확인해주세요.');
 return{favorite:value.favorite,...(value.segmentId===undefined?{}:{segmentId:value.segmentId as string})};
}
export async function updateFavorite(id:string,change:FavoriteChange){
 let result;
 if(change.segmentId===undefined)result=await database().prepare('UPDATE clips SET favorite=? WHERE id=?').bind(change.favorite?1:0,id).run();
 else{
  // Filter against the current segments in the same statement; do not write a stale read-modify-write array.
  const valid="COALESCE((SELECT json_group_array(f.value) FROM json_each(favorite_segments) f WHERE EXISTS (SELECT 1 FROM json_each(segments) s WHERE json_extract(s.value,'$.id')=f.value)), '[]')";
  if(change.favorite)result=await database().prepare(`UPDATE clips SET favorite_segments=CASE WHEN EXISTS (SELECT 1 FROM json_each(favorite_segments) WHERE value=?) THEN ${valid} ELSE json_insert(${valid},'$[#]',?) END WHERE id=? AND EXISTS (SELECT 1 FROM json_each(segments) WHERE json_extract(value,'$.id')=?)`).bind(change.segmentId,change.segmentId,id,change.segmentId).run();
  else result=await database().prepare("UPDATE clips SET favorite_segments=COALESCE((SELECT json_group_array(value) FROM json_each(favorite_segments) WHERE value<>?), '[]') WHERE id=? AND EXISTS (SELECT 1 FROM json_each(segments) WHERE json_extract(value,'$.id')=?)").bind(change.segmentId,id,change.segmentId).run();
 }
 if(!result.meta.changes)return json({error:change.segmentId?'구간이 삭제되거나 바뀌었어요. 최신 목록을 다시 확인해주세요.':'영상을 찾지 못했어요.'},404);
 const row=await findClip(id);if(!row)return json({error:'영상을 찾지 못했어요.'},404);const {favorite,favoriteSegmentIds}=serialize(row);return json({favorite,favoriteSegmentIds});
}
