const trustedHosts=['youtube.com','youtu.be','ytimg.com','instagram.com','cdninstagram.com','fbcdn.net','googlevideo.com','github.io','githubusercontent.com','storage.googleapis.com'];
export function publicUrl(value:string){
 if(typeof value!=='string'||value.length>4096)throw new Error('영상 링크를 확인해주세요.');
 const url=new URL(value);const host=url.hostname.toLowerCase().replace(/\.$/,'');
 if(url.protocol!=='https:'||url.username||url.password||url.port&&url.port!=='443'||!host.includes('.')||!/[a-z]/.test(host)||!/^[a-z0-9.-]+$/.test(host)||/(^|\.)(localhost|local|internal|test|invalid|example)$/.test(host))throw new Error('공개된 https 영상 링크를 입력해주세요.');
 url.hostname=host;url.hash='';return url;
}
async function checkHost(url:URL){
 // Only provider-controlled DNS is eligible for server-side fetching. Resolving
 // arbitrary domains separately from fetch would leave a DNS rebinding gap.
 if(!trustedHosts.some(h=>url.hostname===h||url.hostname.endsWith('.'+h)))throw new Error('이 사이트의 자동분류는 아직 지원하지 않아요. 링크는 저장할 수 있어요.');
}
export async function fetchPublic(value:string,accept='text/html'){
 let url=publicUrl(value);
 for(let redirects=0;redirects<4;redirects++){
  await checkHost(url);
  const response=await fetch(url,{redirect:'manual',headers:{Accept:accept,'User-Agent':'Mozilla/5.0 (compatible; Cutnote/1.0; public video reference preview)'},signal:AbortSignal.timeout(20000)});
  if([301,302,303,307,308].includes(response.status)){const location=response.headers.get('location');await response.body?.cancel();if(!location)throw new Error('영상 링크를 열지 못했어요.');url=publicUrl(new URL(location,url).href);continue;}
  if(!response.ok){await response.body?.cancel();throw new Error('원본 사이트에서 공개 미디어를 제공하지 않아요.');}return{response,url:url.href};
 }
 throw new Error('링크 이동이 너무 많아요. 원본 영상 주소를 입력해주세요.');
}
export async function readLimited(response:Response,limit:number){
 if(Number(response.headers.get('content-length')||0)>limit){await response.body?.cancel();throw new Error('분석 가능한 미디어 크기를 초과했어요.');}
 const reader=response.body?.getReader();if(!reader)return new Uint8Array();const chunks:Uint8Array[]=[];let size=0;
 try{while(true){const{done,value}=await reader.read();if(done)break;size+=value.length;if(size>limit)throw new Error('분석 가능한 미디어 크기를 초과했어요.');chunks.push(value);}}catch(error){await reader.cancel().catch(()=>{});throw error;}
 const data=new Uint8Array(size);let offset=0;for(const c of chunks){data.set(c,offset);offset+=c.length;}return data;
}
