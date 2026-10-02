import {withLegacyStatus} from './segments';
import {parseTagging} from './tagging';
import {env} from 'cloudflare:workers';
import type {Clip} from './clips';
export type ClipRow={id:string;title:string;source_url:string;video_key:string|null;poster_key:string|null;tags:string;notes:string;created_at:string;analysis?:string|null;segments?:string|null;tagging?:string|null;revision?:number;analysis_history?:string|null;favorite?:number;favorite_segments?:string|null};
export function database(){if(!env.DB)throw new Error('Database unavailable');return env.DB;}
export function bucket(){if(!env.BUCKET)throw new Error('File storage unavailable');return env.BUCKET;}
export function serialize(row:ClipRow):Clip{return{favorite:row.favorite===1,favoriteSegmentIds:JSON.parse(row.favorite_segments||'[]').filter((id:string)=>JSON.parse(row.segments||'[]').some((s:{id:string})=>s.id===id)),id:row.id,title:row.title,sourceUrl:row.source_url,videoUrl:row.video_key?'/api/media/'+row.id:null,posterUrl:row.poster_key?'/api/media/'+row.id+'?poster=1':null,tags:JSON.parse(row.tags),notes:row.notes,createdAt:row.created_at,revision:row.revision||0,tagging:parseTagging(row.tagging?JSON.parse(row.tagging):null),analysisHistory:row.analysis_history?JSON.parse(row.analysis_history):[],analysis:row.analysis?JSON.parse(row.analysis):null,segments:withLegacyStatus(row.segments?JSON.parse(row.segments):[],parseTagging(row.tagging?JSON.parse(row.tagging):null))};}
export function json(data:unknown,status=200){return Response.json(data,{status,headers:{'Cache-Control':'no-store'}});}
export function crossOrigin(req:Request){const origin=req.headers.get('origin');return Boolean(origin&&origin!==new URL(req.url).origin);}
export function unavailable(error:unknown){console.error('Cutnote storage operation failed',error instanceof Error?error.message:'unknown');return json({error:'저장소에 연결하지 못했어요. 잠시 후 다시 시도해주세요.'},503);}
export async function findClip(id:string){return database().prepare('SELECT * FROM clips WHERE id = ?').bind(id).first<ClipRow>();}
