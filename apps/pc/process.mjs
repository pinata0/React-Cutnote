import {spawn} from 'node:child_process';
import path from 'node:path';
import {access} from 'node:fs/promises';
export function safeEnv(){const env={};for(const key of ['PATH','SystemRoot','WINDIR','TEMP','TMP','TMPDIR','LANG','HOME','USERPROFILE','APPDATA','LOCALAPPDATA'])if(process.env[key])env[key]=process.env[key];return env;}
export async function executable(configured,name){
 const candidates=configured?[configured]:(process.env.PATH||'').split(path.delimiter).map(dir=>path.join(dir,name+(process.platform==='win32'?'.exe':'')));
 for(const file of candidates){if(process.platform==='win32'&&!file.toLowerCase().endsWith('.exe'))continue;try{await access(file);return path.resolve(file);}catch{}}
 throw Object.assign(Error('tool_missing'),{code:'tool_missing'});
}
export function run(file,args,{signal,timeout=120000,onLine,maxOutput=2*1024*1024,cwd,successCodes=[0]}={}){
 return new Promise((resolve,reject)=>{
  if(signal?.aborted){reject(signal.reason);return;}
  const child=spawn(file,args,{shell:false,windowsHide:true,env:safeEnv(),cwd,stdio:['ignore','pipe','pipe'],detached:process.platform!=='win32'});
  let output='',error='',size=0,reason=null,done=false,line='';
  const kill=()=>{if(done)return;if(process.platform==='win32'){const killer=spawn(path.join(process.env.SystemRoot||'C:\\Windows','System32','taskkill.exe'),['/PID',String(child.pid),'/T','/F'],{windowsHide:true,stdio:'ignore'});killer.on('error',()=>child.kill());killer.on('exit',code=>{if(code!==0)child.kill();});}else{try{process.kill(-child.pid,'SIGKILL');}catch{child.kill('SIGKILL');}}};
  const abort=()=>{reason=signal.reason||Object.assign(Error('cancelled'),{code:'cancelled'});kill();};
  const timer=setTimeout(()=>{reason=Object.assign(Error('timeout'),{code:'download_failed'});kill();},timeout);
  signal?.addEventListener('abort',abort,{once:true});
  child.stdout.on('data',chunk=>{size+=chunk.length;if(size>maxOutput){reason=Error('도구 출력 한도 초과');kill();return;}const text=chunk.toString();output+=text;line+=text;const lines=line.split(/[\r\n]+/);line=lines.pop();for(const item of lines)onLine?.(item);});
  child.stderr.on('data',chunk=>{error=(error+chunk.toString()).slice(-8192);});
  const finish=(failure)=>{if(done)return;done=true;clearTimeout(timer);signal?.removeEventListener('abort',abort);if(failure)reject(failure);else resolve(output);};
  child.on('error',()=>finish(Object.assign(Error('tool_missing'),{code:'tool_missing'})));
  child.on('close',code=>finish(reason||(successCodes.includes(code)?null:Object.assign(Error('외부 도구 실행 실패'),{code:/sign in|login|cookies|authentication/i.test(error)?'needs_auth':'download_failed',diagnostic:error.replace(/https?:\/\/\S+/gi,'[url]').slice(-1500)}))));
 });
}
export async function toolchain(settings){const tools={};for(const[key,name]of Object.entries({ytDlp:'yt-dlp',ffmpeg:'ffmpeg',ffprobe:'ffprobe'}))tools[key]=await executable(settings.tools[key],name);return tools;}
export async function diagnose(settings){const result={};for(const[key,name]of Object.entries({ytDlp:'yt-dlp',ffmpeg:'ffmpeg',ffprobe:'ffprobe'})){try{const file=await executable(settings.tools[key],name);const output=await run(file,[key==='ytDlp'?'--version':'-version'],{timeout:10000});result[key]={ready:true,version:output.split('\n')[0].slice(0,200)};}catch{result[key]={ready:false};}}return result;}
