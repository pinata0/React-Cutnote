import http from 'node:http';
import {open} from 'node:fs/promises';
import {pipeline} from 'node:stream/promises';
import {assetFile} from './media.mjs';
import {diagnose} from './process.mjs';
export function rangeFor(header,size){if(!header)return{start:0,end:size-1,status:200};const m=/^bytes=(\d*)-(\d*)$/.exec(header);if(!m||(!m[1]&&!m[2]))throw Error('range');const start=m[1]?Number(m[1]):Math.max(0,size-Number(m[2])),end=m[1]&&m[2]?Math.min(size-1,Number(m[2])):size-1;if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start>end||start>=size)throw Error('range');return{start,end,status:206};}
export async function serveFile(req,res,file,mime,title){
 const handle=await open(file,'r');try{const stat=await handle.stat();if(!stat.isFile())throw Error();const etag='"'+stat.size+'-'+stat.mtimeMs+'"';let range;
  try{range=rangeFor(req.headers['if-range']&&req.headers['if-range']!==etag?null:req.headers.range,stat.size);}catch{res.writeHead(416,{'Content-Range':'bytes */'+stat.size});res.end();return;}
  const headers={'Content-Type':mime,'Content-Length':range.end-range.start+1,'Accept-Ranges':'bytes','Cache-Control':'private, no-cache','X-Content-Type-Options':'nosniff','ETag':etag};
  if(range.status===206)headers['Content-Range']=`bytes ${range.start}-${range.end}/${stat.size}`;
  if(new URL(req.url,'http://localhost').searchParams.get('download')==='1')headers['Content-Disposition']="attachment; filename=\"cutnote.mp4\"; filename*=UTF-8''"+encodeURIComponent(title.slice(0,80).replace(/[\\/:*?"<>|\u0000-\u001f]/g,'_')+'.'+(mime.includes('webm')?'webm':'mp4'));
  res.writeHead(range.status,headers);if(req.method==='HEAD'){res.end();return;}res.setTimeout(60000,()=>res.destroy());await pipeline(handle.createReadStream({start:range.start,end:range.end,autoClose:false}),res);
 }finally{await handle.close();}
}
const reply=(res,status,data)=>{if(res.headersSent){res.destroy();return;}res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(data));};
async function body(req){const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>16000)throw Error('입력 크기 초과');chunks.push(chunk);}return JSON.parse(Buffer.concat(chunks).toString());}
export function createGateway({upstream,settings,client,port=5173}){
 let streaming=0;
 const stream=async(...args)=>{if(streaming>=4)return reply(args[1],503,{error:'재생 요청이 많아요. 잠시 후 다시 시도해주세요.'});streaming++;try{await serveFile(...args);}finally{streaming--;}};
 const target=new URL(upstream);const server=http.createServer(async(req,res)=>{
  try{
   if(!['127.0.0.1:'+port,'localhost:'+port].includes(req.headers.host)||req.headers['sec-fetch-site']==='cross-site')return reply(res,403,{error:'이 PC에서 연결해주세요.'});
   const own='http://'+req.headers.host;if(req.headers.origin&&req.headers.origin!==own)return reply(res,403,{error:'다른 출처의 요청이에요.'});
   if(!['GET','HEAD'].includes(req.method)&&req.headers.origin!==own)return reply(res,403,{error:'현재 PC 페이지에서 다시 요청해주세요.'});
   const url=new URL(req.url,own);if(decodeURIComponent(url.pathname).replaceAll('\\','/').startsWith('/api/internal/'))return reply(res,403,{error:'내부 API'});
   if(url.pathname==='/api/pc/settings'){
    if(req.headers['x-cutnote-client']==='lan')return reply(res,403,{error:'설정은 PC에서 변경해주세요.'});
    if(req.method==='POST')await settings.update(await body(req));else if(req.method!=='GET')return reply(res,405,{error:'Method'});
    const config=settings.get();return reply(res,200,{folder:config.roots[config.rootId],tools:config.tools,diagnostics:await diagnose(config)});
   }
   const media=/^\/api\/media\/([\w-]{1,64})$/.exec(url.pathname);
   const segment=/^\/api\/segment-media\/([\w-]{1,64})\/([\w-]{1,64})$/.exec(url.pathname);
   if(segment&&['GET','HEAD'].includes(req.method)){
    const info=await client('segmentAsset',{clipId:segment[1],segmentId:segment[2],fingerprint:url.searchParams.get('v')});
    if(info.local){if(!info.asset)return reply(res,404,{error:'구간 파일이 없거나 구간이 변경됐어요.'});await stream(req,res,await assetFile(settings.get(),info.asset),'video/mp4',info.title||'구간');return;}
   }
   if(media&&['GET','HEAD'].includes(req.method)){
    const info=await client('asset',{clipId:media[1]});if(info.asset){try{const poster=url.searchParams.get('poster')==='1';await stream(req,res,await assetFile(settings.get(),info.asset,poster),poster?'image/jpeg':info.asset.mime,info.title||'cutnote');}catch{reply(res,404,{error:'PC 원본 파일을 찾지 못했어요. 저장 폴더를 확인해주세요.'});}return;}
   }
   const headers={...req.headers,host:target.host};delete headers.authorization;delete headers['x-cutnote-internal'];if(headers.origin)headers.origin=target.origin;
   const out=http.request({hostname:target.hostname,port:target.port,path:req.url,method:req.method,headers},response=>{const h={...response.headers};if(h.location?.startsWith(target.origin))h.location=h.location.slice(target.origin.length)||'/';res.writeHead(response.statusCode||502,h);response.pipe(res);response.on('error',()=>res.destroy());});
   out.on('error',()=>reply(res,502,{error:'PC 웹 서버를 확인해주세요.'}));res.on('close',()=>{if(!res.writableEnded)out.destroy();});req.pipe(out);
  }catch{reply(res,503,{error:'PC 설정·도구·저장소를 확인해주세요.'});}
 });
 server.headersTimeout=15000;server.requestTimeout=210000;return server;
}
