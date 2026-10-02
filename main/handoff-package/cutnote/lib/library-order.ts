export type OrderScope='videos'|'segments';
export type SavedOrder={keys:string[];revision:number};
export type LibraryOrder=Record<OrderScope,SavedOrder>;
export const emptyLibraryOrder=():LibraryOrder=>({videos:{keys:[],revision:0},segments:{keys:[],revision:0}});
export function applyOrder<T>(items:T[],keys:string[],key:(item:T)=>string):T[]{
 const rank=new Map(keys.map((id,index)=>[id,index]));
 // Newly saved cards stay at the front; existing cards retain their custom order.
 return [...items].sort((a,b)=>(rank.get(key(a))??-1)-(rank.get(key(b))??-1));
}
export function replaceVisibleOrder(all:string[],visible:string[]):string[]{
 const subset=new Set(visible);let index=0;
 return all.map(key=>subset.has(key)?visible[index++]:key);
}
export function moveKey(keys:string[],from:string,to:string):string[]{
 const a=keys.indexOf(from),b=keys.indexOf(to);if(a<0||b<0||a===b)return keys;
 const next=[...keys];next.splice(a,1);next.splice(b,0,from);return next;
}
export function parseOrderChange(value:unknown):{scope:OrderScope;revision:number;keys:string[]}{
 const v=value as {scope:OrderScope;revision:number;keys:string[]};
 if(!v||!['videos','segments'].includes(v.scope)||!Number.isSafeInteger(v.revision)||v.revision<0||!Array.isArray(v.keys)||v.keys.length>10000||v.keys.some(k=>typeof k!=='string'||!(v.scope==='videos'?/^[\w-]{1,64}$/:/^[\w-]{1,64}\/[\w-]{1,64}$/).test(k))||new Set(v.keys).size!==v.keys.length)throw new Error('카드 순서 정보를 확인해주세요.');
 return v;
}
