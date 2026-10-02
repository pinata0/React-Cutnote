import type {Clip} from './clips';
import type {LibraryOrder} from '@/features/library/library-order';
export async function request<T={clip:Clip;clips:Clip[];order:LibraryOrder}>(url:string,options?:RequestInit):Promise<T>{const res=await fetch(url,options);const data=await res.json().catch(()=>({error:'요청을 처리하지 못했어요. 다시 시도해주세요.'})) as T & {error?:string};if(!res.ok)throw new Error(data.error||'요청을 처리하지 못했어요.');return data;}
