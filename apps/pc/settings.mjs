import path from 'node:path';
import os from 'node:os';
import {randomUUID} from 'node:crypto';
import {mkdir,readFile,writeFile,rename,lstat,realpath,statfs,unlink,open} from 'node:fs/promises';
export const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
export async function safeRoot(value){
 if(typeof value!=='string'||!path.isAbsolute(value)||value.startsWith('\\\\')||value.includes('\0'))throw Error('절대 경로의 로컬 폴더를 입력해주세요.');
 const target=path.resolve(value);let current=path.parse(target).root;
 for(const part of target.slice(current.length).split(path.sep).filter(Boolean)){if(/[<>:"|?*]/.test(part)||/[. ]$/.test(part))throw Error('폴더 이름을 확인해주세요.');current=path.join(current,part);try{if((await lstat(current)).isSymbolicLink())throw Error('링크 폴더는 지원하지 않아요.');}catch(e){if(e.code!=='ENOENT')throw e;}}
 await mkdir(target,{recursive:true,mode:0o700});return realpath(target);
}
export async function inside(root,...parts){
 let ancestor=path.resolve(root);while(true){if((await lstat(ancestor)).isSymbolicLink())throw Error('링크 저장 폴더는 지원하지 않아요.');const parent=path.dirname(ancestor);if(parent===ancestor)break;ancestor=parent;}
 const base=await realpath(root),file=path.resolve(base,...parts),relative=path.relative(base,file);
 if(!relative||relative.startsWith('..')||path.isAbsolute(relative)||parts.some(p=>typeof p!=='string'||p.includes(':')))throw Error('허용되지 않은 파일 경로예요.');
 let current=base;for(const part of relative.split(path.sep)){current=path.join(current,part);try{if((await lstat(current)).isSymbolicLink())throw Error('링크 파일은 지원하지 않아요.');}catch(e){if(e.code!=='ENOENT')throw e;}}
 return file;
}
export async function atomicJson(file,value){const tmp=file+'.'+randomUUID()+'.tmp';const handle=await open(tmp,'wx',0o600);try{await handle.writeFile(JSON.stringify(value));await handle.sync();}finally{await handle.close();}try{await rename(tmp,file);}finally{await unlink(tmp).catch(()=>{});}}
export async function loadSettings(stateDir){
 await mkdir(stateDir,{recursive:true,mode:0o700});const file=path.join(stateDir,'settings.json');let settings;
 try{settings=JSON.parse(await readFile(file,'utf8'));}catch(e){if(e.code!=='ENOENT')throw Error('PC 설정 파일을 확인해주세요.');settings={rootId:randomUUID(),roots:{},tools:{}};}
 if(!uuid.test(settings.rootId)||!settings.roots||!settings.tools)throw Error('PC 설정 형식을 확인해주세요.');
 async function update(value){
  const next=structuredClone(settings);
  if(value.folder!==undefined){const folder=await safeRoot(value.folder);const probe=await inside(folder,'.cutnote-write-'+randomUUID());await writeFile(probe,'',{flag:'wx'});await unlink(probe);const known=Object.entries(next.roots).find(([,v])=>v===folder);next.rootId=known?.[0]||randomUUID();next.roots[next.rootId]=folder;}
  for(const name of ['ytDlp','ffmpeg','ffprobe'])if(value[name]!==undefined){const tool=value[name];if(typeof tool!=='string'||tool.length>1000||(tool&&!path.isAbsolute(tool)))throw Error('도구는 절대 경로로 지정해주세요.');next.tools[name]=tool;}
  await atomicJson(file,next);settings=next;return settings;
 }
 if(!settings.roots[settings.rootId])await update({folder:process.env.CUTNOTE_DOWNLOAD_DIR||path.join(os.homedir(),'Videos','Cutnote')});
 return{get:()=>settings,update};
}
export async function requireSpace(root,min=5*1024**3){const s=await statfs(root);if(Number(s.bavail)*Number(s.bsize)<min)throw Object.assign(Error('disk_full'),{code:'disk_full'});}
