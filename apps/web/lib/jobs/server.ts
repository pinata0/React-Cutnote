import {env} from 'cloudflare:workers';
import {database,findClip,serialize,json,type ClipRow} from '../server';
import {shareIdPattern} from '../mobile-share';
import {parseSegmentTargets,mergeSegmentTagging,refreshSegmentTags} from '../../features/segments/segment-tagging';
import {parseAnalysis} from '../analysis/types';
import {mergeTagging,emptyTagging} from '../tagging';
import {validateFields} from '../clips';
import {parseSegments} from '../segments';
import {segmentFingerprint} from '../segment-media';
import type {LocalAsset,PcJob} from './types';

type JobRow={id:string;clip_id:string;kind:string;payload:string;state:string;phase:string;progress:number;attempt:number;lease_token:string|null;lease_until:number;cancel_requested:number;error_code:string|null;result:string|null;created_at:string;updated_at:string};
export const enabled=()=>Boolean((env as unknown as {CUTNOTE_PC_TOKEN?:string}).CUTNOTE_PC_TOKEN);
export function internal(req:Request){const token=(env as unknown as {CUTNOTE_PC_TOKEN?:string}).CUTNOTE_PC_TOKEN;return Boolean(token&&req.headers.get('authorization')==='Bearer '+token);}
export function publicJob(row:JobRow):PcJob{return{id:row.id,clipId:row.clip_id,kind:row.kind,state:row.state,phase:row.phase,progress:row.progress,attempt:row.attempt,cancelRequested:!!row.cancel_requested,errorCode:row.error_code,createdAt:row.created_at,updatedAt:row.updated_at};}
const job=(id:string)=>database().prepare('SELECT * FROM pc_jobs WHERE id=?').bind(id).first<JobRow>();
export function canonicalSource(value:unknown){
 if(typeof value!=='string'||value.length>2000)throw Error('공개 YouTube·Instagram 영상 링크를 입력해주세요.');
 const u=new URL(value);if(!['https:','http:'].includes(u.protocol)||u.username||u.password||u.port)throw Error('영상 주소를 확인해주세요.');
 const host=u.hostname.replace(/^(www|m)\./,'');let id='';
 if(host==='youtu.be'&&/^\/[\w-]{11}\/?$/.test(u.pathname))id=u.pathname.split('/')[1];
 if(host==='youtube.com'){if(u.pathname==='/watch'&&u.searchParams.getAll('v').length===1)id=u.searchParams.get('v')||'';else if(/^\/(shorts|live|embed)\/[\w-]{11}\/?$/.test(u.pathname))id=u.pathname.split('/')[2];}
 if(/^[\w-]{11}$/.test(id))return'https://www.youtube.com/watch?v='+id;
 const ig=host==='instagram.com'?/^\/(p|reel|reels|tv)\/([\w-]{1,80})\/?$/.exec(u.pathname):null;
 if(ig)return'https://www.instagram.com/'+(ig[1]==='p'?'p':'reel')+'/'+ig[2]+'/';
 throw Error('개별 YouTube·Instagram 영상 링크만 지원해요. 재생목록·프로필·공유 단축 주소는 원본 영상 주소로 바꿔주세요.');
}
export async function submit(value:Record<string,unknown>){
 if(!enabled())return json({error:'PC 실행기로 연결해주세요.'},409);
 const id=String(value.requestId||'').toLowerCase();if(!shareIdPattern.test(id))return json({error:'요청 ID를 확인해주세요.'},400);
 if(value.kind!==undefined&&!['ingest','retag','analyze','export'].includes(String(value.kind)))return json({error:'작업 종류를 확인해주세요.'},400);
 const kind=String(value.kind||'ingest');
 const clipId=kind==='ingest'?id:String(value.clipId||'');const clip=kind==='ingest'?null:await findClip(clipId);
 if(kind!=='ingest'&&!clip?.local_asset)return json({error:'PC에 저장된 원본이 필요해요.'},404);
 const targets=['retag','export'].includes(kind)?parseSegmentTargets(value.segmentTargets):undefined;
 if(['retag','export'].includes(kind)&&!targets)throw Error('구간을 선택해주세요.');
 if(clip&&targets){const current=serialize(clip);if(targets.some(t=>!current.segments?.some(s=>s.id===t.id&&s.startSeconds===t.startSeconds&&s.endSeconds===t.endSeconds)))return json({error:'구간이 바뀌었어요. 다시 선택해주세요.'},409);}
 if(kind==='export'&&(!targets||targets.length!==1||targets[0].endSeconds-targets[0].startSeconds>300))throw Error('한 번에 5분 이하의 한 구간을 선택해주세요.');
 const source=kind==='ingest'?canonicalSource(value.sourceUrl):clip!.source_url;
 const fields=kind==='ingest'&&value.fields?validateFields(value.fields):null;
 const segments=kind==='ingest'?parseSegments(value.segments):[];
 const payload=JSON.stringify({source,targets:targets??null,fields,segments,asset:clip?.local_asset||null});
 const existing=await job(id);if(existing){if(existing.payload!==payload||existing.kind!==kind||existing.clip_id!==clipId)return json({error:'같은 요청 ID에 다른 입력이 있어요.'},409);return json({job:publicJob(existing),reused:true});}
 if(kind==='ingest'){const prior=await findClip(id);if(prior){let same=false;try{same=canonicalSource(prior.source_url)===source;}catch{}if(!same||prior.video_key)return json({error:'이미 다른 영상에 사용한 요청이에요. 새로 공유해주세요.'},409);}}
 const now=new Date().toISOString();const db=database();
 const statements=[];
 if(kind==='ingest')statements.push(db.prepare("INSERT INTO clips(id,title,source_url,tags,notes,created_at,segments) SELECT ?,?,?,?,?,?,? WHERE NOT EXISTS(SELECT 1 FROM pc_jobs WHERE id=?) ON CONFLICT(id) DO NOTHING").bind(id,fields?.title||'PC 수집 영상',source,JSON.stringify(fields?.tags||{color:[],shot:[],effect:[]}),fields?.notes||'',now,JSON.stringify(segments),id));
 statements.push(db.prepare("INSERT INTO pc_jobs(id,clip_id,kind,payload,created_at,updated_at) VALUES(?,?,?,?,?,?) ON CONFLICT(id) DO NOTHING").bind(id,clipId,kind,payload,now,now));
 await db.batch(statements);const saved=(await job(id))!;
 if(saved.payload!==payload||saved.kind!==kind)return json({error:'같은 요청 ID에 다른 입력이 있어요.'},409);
 return json({job:publicJob(saved)},202);
}
export async function recover(){await database().prepare("UPDATE pc_jobs SET state=CASE WHEN cancel_requested=1 THEN 'cancelled' ELSE 'interrupted' END,error_code=CASE WHEN cancel_requested=1 THEN NULL ELSE 'interrupted' END,lease_token=NULL,updated_at=? WHERE state='running' AND lease_until<?").bind(new Date().toISOString(),Date.now()).run();}
export async function listJobs(id?:string){await recover();if(id){if(!shareIdPattern.test(id))return[];const found=await job(id);return found?[publicJob(found)]:[];}const rows=await database().prepare('SELECT * FROM pc_jobs ORDER BY created_at DESC LIMIT 100').all<JobRow>();return rows.results.map(publicJob);}
export async function changeJob(id:string,action:string){
 const row=await job(id);if(!row)return json({error:'작업을 찾지 못했어요.'},404);
 const db=database(),now=new Date().toISOString();
 if(action==='cancel'){await db.prepare("UPDATE pc_jobs SET cancel_requested=1,state=CASE WHEN state='queued' THEN 'cancelled' ELSE state END,updated_at=? WHERE id=? AND state IN ('queued','running')").bind(now,id).run();}
 else if(action==='retry'){
  if(!await findClip(row.clip_id))return json({error:'클립이 삭제되어 다시 시도할 수 없어요.'},404);
  await db.prepare("UPDATE pc_jobs SET state='queued',phase='queued',progress=0,error_code=NULL,cancel_requested=0,lease_token=NULL,updated_at=? WHERE id=? AND state IN ('failed','interrupted','cancelled')").bind(now,id).run();
 }else return json({error:'지원하지 않는 작업이에요.'},400);
 return json({job:publicJob((await job(id))!)});
}
function assetInput(v:unknown):LocalAsset{
 const a=v as LocalAsset;if(!a||!shareIdPattern.test(a.root)||!shareIdPattern.test(a.directory)||!['video.mp4','video.webm'].includes(a.video)||(a.poster!==null&&a.poster!=='poster.jpg')||!Number.isSafeInteger(a.size)||a.size<=0||a.size>2*1024**3||!Number.isFinite(a.duration)||a.duration<.1||a.duration>7200||!['video/mp4','video/webm'].includes(a.mime))throw Error('원본 파일 정보를 확인해주세요.');return a;
}
export async function workerAction(v:Record<string,unknown>){
 const db=database(),now=new Date().toISOString();
 if(v.action==='claim'){
  await recover();const token=crypto.randomUUID();
  const row=await db.prepare("UPDATE pc_jobs SET state='running',phase='download',attempt=attempt+1,lease_token=?,lease_until=?,updated_at=? WHERE id=(SELECT id FROM pc_jobs WHERE state='queued' ORDER BY created_at LIMIT 1) AND state='queued' RETURNING *").bind(token,Date.now()+60000,now).first<JobRow>();
  if(!row)return json({job:null});const clip=await findClip(row.clip_id);
  return json({job:{...row,payload:JSON.parse(row.payload),clip:clip?serialize(clip):null,asset:clip?.local_asset?JSON.parse(clip.local_asset):null,revision:clip?.revision||0}});
 }
 if(v.action==='segmentAsset'){const clip=await findClip(String(v.clipId));if(!clip?.local_asset)return json({local:false});const segments=await localSegments(clip);const item=segments.find(s=>s.segmentId===v.segmentId&&s.fingerprint===v.fingerprint);return json({local:true,asset:item?.asset,title:clip.title});}
 if(v.action==='asset') {const clip=await findClip(String(v.clipId));return json({asset:clip?.local_asset?JSON.parse(clip.local_asset):null,title:clip?.title});}
 const row=await job(String(v.id));if(!row||row.state!=='running'||row.lease_token!==v.token||row.lease_until<Date.now())return json({error:'작업 소유권이 만료됐어요.'},409);
 const clip=await findClip(row.clip_id);
 if(v.action==='heartbeat'){await db.prepare('UPDATE pc_jobs SET lease_until=?,updated_at=? WHERE id=? AND lease_token=?').bind(Date.now()+60000,now,row.id,row.lease_token).run();return json({cancel:!!row.cancel_requested||!clip});}
 if(v.action==='fail') {const codes=['download_failed','frames_failed','export_failed','analysis_failed','needs_auth','tool_missing','disk_full','unsupported','source_missing','conflict','interrupted','storage_failed'];const code=codes.includes(String(v.code))?String(v.code):'storage_failed';await db.prepare("UPDATE pc_jobs SET state=?,error_code=?,lease_token=NULL,updated_at=? WHERE id=? AND lease_token=?").bind(row.cancel_requested||v.code==='cancelled'?'cancelled':v.code==='interrupted'?'interrupted':'failed',row.cancel_requested||v.code==='cancelled'?null:code,now,row.id,row.lease_token).run();return json({ok:true});}
 if(row.cancel_requested||!clip)return json({error:'작업이 취소되었거나 클립이 삭제됐어요.'},409);
 if(v.action==='progress'){const phase=String(v.phase);if(!['download','frames','analyze','commit','export'].includes(phase))throw Error('작업 단계를 확인해주세요.');await db.prepare('UPDATE pc_jobs SET phase=?,progress=?,updated_at=? WHERE id=? AND lease_token=?').bind(phase,Math.max(0,Math.min(100,Number(v.progress)||0)),now,row.id,row.lease_token).run();return json({ok:true});}
 if(v.action==='attach'){
  const asset=assetInput(v.asset);if(clip.local_asset)return json({revision:clip.revision});
  const result=await db.prepare("UPDATE clips SET local_asset=?,revision=revision+1 WHERE id=? AND revision=? AND video_key IS NULL AND local_asset IS NULL AND EXISTS(SELECT 1 FROM pc_jobs WHERE id=? AND lease_token=? AND cancel_requested=0 AND state='running')").bind(JSON.stringify(asset),row.clip_id,v.revision,row.id,row.lease_token).run();
  if(!result.meta.changes)return json({error:'클립이 변경되었어요.'},409);return json({revision:Number(v.revision)+1});
 }
 if(v.action==='complete'&&row.kind==='export'){const payload=JSON.parse(row.payload),asset=v.result as Record<string,unknown>;const target=payload.targets?.[0];const segment=serialize(clip).segments?.find(s=>s.id===target?.id&&s.startSeconds===target.startSeconds&&s.endSeconds===target.endSeconds);const original=JSON.parse(clip.local_asset||'null');if(!segment||payload.asset!==clip.local_asset||!original)return json({error:'원본 또는 구간이 바뀌었어요.'},409);if(!asset||asset.root!==original.root||asset.directory!==original.directory||asset.video!=='export-'+row.id+'.mp4'||asset.mime!=='video/mp4'||!Number.isSafeInteger(asset.size)||Number(asset.size)<=0||Number(asset.size)>25*1024**2||!Number.isFinite(asset.duration)||Math.abs(Number(asset.duration)-(segment.endSeconds-segment.startSeconds))>.4||![asset.width,asset.height].every(n=>Number.isInteger(n)&&Number(n)>0&&Number(n)<=640))throw Error('구간 파일 정보를 확인해주세요.');const result=await db.prepare("UPDATE pc_jobs SET state='completed',phase='completed',progress=100,result=?,lease_token=NULL,updated_at=? WHERE id=? AND lease_token=? AND cancel_requested=0 AND EXISTS(SELECT 1 FROM clips WHERE id=? AND revision=?)").bind(JSON.stringify(asset),now,row.id,row.lease_token,row.clip_id,v.revision).run();return result.meta.changes?json({ok:true}):json({error:'클립이 변경되었어요.'},409);}
 if(v.action==='complete')return complete(row,clip,v);
 return json({error:'작업 명령을 확인해주세요.'},400);
}
async function complete(row:JobRow,clip:ClipRow,v:Record<string,unknown>){
 const result=v.result as {report:unknown;title:unknown;memo:unknown};const analysis=parseAnalysis(result?.report);
 if(!analysis||analysis.engine!=='openai-frames-v1')throw Error('OpenAI 분석 결과가 필요해요.');
 const prior=serialize(clip),fields=validateFields({title:result.title,notes:result.memo,tags:prior.tags});
 const payload=JSON.parse(row.payload),targets=payload.targets;
 let segments=prior.segments||[];
 if(row.kind==='retag'){
  const proposals=analysis.segments||[];
  if(!targets||targets.some((t:{id:string;startSeconds:number;endSeconds:number})=>!segments.some(s=>s.id===t.id&&s.startSeconds===t.startSeconds&&s.endSeconds===t.endSeconds)||!proposals.some(s=>s.id===t.id&&s.startSeconds===t.startSeconds&&s.endSeconds===t.endSeconds)))return json({error:'구간이 바뀌었어요.'},409);
  segments=segments.map(s=>{const next=proposals.find(n=>n.id===s.id);return next?mergeSegmentTagging(s,next.tagging||emptyTagging()):s;});
 }else segments=segments.length?refreshSegmentTags(segments,analysis.segments||[]):analysis.segments||[];
 const tagging=row.kind==='retag'?prior.tagging:mergeTagging(prior.tagging,analysis.tagging||emptyTagging());
 const report=row.kind==='retag'?prior.analysis:analysis;
 const history=[...(prior.analysisHistory||[]),analysis].slice(-10),db=database(),now=new Date().toISOString();
 const updated=await db.batch([
  db.prepare("UPDATE clips SET title=?,notes=?,analysis=?,analysis_history=?,segments=?,tagging=?,revision=revision+1,last_job_id=? WHERE id=? AND revision=? AND EXISTS(SELECT 1 FROM pc_jobs WHERE id=? AND lease_token=? AND state='running' AND cancel_requested=0)").bind(prior.title==='PC 수집 영상'?fields.title:prior.title,prior.notes||fields.notes,report?JSON.stringify(report):null,JSON.stringify(history),JSON.stringify(segments),JSON.stringify(tagging),row.id,row.clip_id,v.revision,row.id,row.lease_token),
  db.prepare("UPDATE pc_jobs SET state='completed',phase='completed',progress=100,result=?,lease_token=NULL,updated_at=? WHERE id=? AND lease_token=? AND cancel_requested=0 AND EXISTS(SELECT 1 FROM clips WHERE id=? AND last_job_id=? AND revision=?)").bind(JSON.stringify(result),now,row.id,row.lease_token,row.clip_id,row.id,Number(v.revision)+1)
 ]);
 if(!updated[0].meta.changes)return json({error:'클립이 변경되어 결과를 덮어쓰지 않았어요.'},409);
 return json({ok:true});
}

export async function localSegments(clip:ClipRow){
 const rows=(await database().prepare("SELECT * FROM pc_jobs WHERE clip_id=? AND kind='export' AND state='completed' ORDER BY updated_at DESC").bind(clip.id).all<JobRow>()).results;
 return Promise.all((serialize(clip).segments||[]).map(async segment=>{
  const fingerprint=await segmentFingerprint(clip,segment);
  const found=rows.find(row=>{const p=JSON.parse(row.payload),t=p.targets?.[0];return p.asset===clip.local_asset&&t?.id===segment.id&&t.startSeconds===segment.startSeconds&&t.endSeconds===segment.endSeconds;});
  const asset=found?JSON.parse(found.result!):null;
  return{segmentId:segment.id,fingerprint,asset,file:asset?{url:'/api/segment-media/'+clip.id+'/'+segment.id+'?v='+fingerprint,size:asset.size,mime:asset.mime,durationSeconds:asset.duration,width:asset.width,height:asset.height}:null};
 }));
}
