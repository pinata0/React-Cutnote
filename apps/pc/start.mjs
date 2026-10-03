import {readFile,mkdir,open,unlink} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import path from 'node:path';
import {randomBytes} from 'node:crypto';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {loadSettings} from './settings.mjs';
import {workerClient,startRunner} from './runner.mjs';
import {createGateway} from './server.mjs';
import {protectConnectionFile} from '../android/bridge/server.mjs';
import {run} from './process.mjs';
import {cleanTemporary} from './media.mjs';
export async function startPc({webRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../web'),port=5173,workerPort=5175,statePath,runtimePath}={}){
 const config=path.join(webRoot,'dist/server/wrangler.json');if(!existsSync(config))throw Error('먼저 웹 빌드를 실행해주세요.');
 const runtime=runtimePath||path.join(webRoot,'.cutnote-pc');await mkdir(runtime,{recursive:true,mode:0o700});
 const settings=await loadSettings(runtime),token=randomBytes(32).toString('hex');
 const vars=path.join(runtime,'runtime-'+randomBytes(8).toString('hex')+'.vars');
 let existing=existsSync(path.join(webRoot,'.dev.vars'))?await readFile(path.join(webRoot,'.dev.vars'),'utf8'):'';
 for(const name of ['CUTNOTE_SECRET_KEY','OPENAI_API_KEY','GEMINI_API_KEY'])if(process.env[name]&&!new RegExp('^\\s*'+name+'\\s*=','m').test(existing))existing+='\n'+name+'='+JSON.stringify(process.env[name])+'\n';
 if(!/^\s*CUTNOTE_SECRET_KEY\s*=/m.test(existing)&&!process.env.CUTNOTE_SECRET_KEY){
  const keyFile=path.join(runtime,'master.key');let key;
  try{key=await readFile(keyFile,'utf8');}catch(error){if(error.code!=='ENOENT')throw error;key=randomBytes(32).toString('base64');const handle=await open(keyFile,'wx',0o600);try{await protectConnectionFile(keyFile,handle);await handle.writeFile(key);await handle.sync();}finally{await handle.close();}}
  if(/^[a-f0-9]{64}$/.test(key))key=Buffer.from(key,'hex').toString('base64');
  if(!/^[A-Za-z0-9+/]{43}=$/.test(key)||Buffer.from(key,'base64').length!==32)throw Error('PC 암호화 키 파일을 확인해주세요.');existing+='\nCUTNOTE_SECRET_KEY='+key+'\n';
 }
 const privateFile=await open(vars,'wx',0o600);
 try{await protectConnectionFile(vars,privateFile);await privateFile.writeFile(existing+'\nCUTNOTE_PC_TOKEN='+token+'\n');}finally{await privateFile.close();}
 const origin='http://127.0.0.1:'+workerPort;
 const client=workerClient(origin,token);const gateway=createGateway({upstream:origin,settings,client,port});
 await new Promise((resolve,reject)=>{gateway.once('error',reject);gateway.listen(port,'127.0.0.1',resolve);});
 const child=spawn(process.execPath,[path.join(webRoot,'node_modules/wrangler/bin/wrangler.js'),'dev','--config',config,'--local','--persist-to',statePath||path.join(webRoot,'.wrangler/state'),'--ip','127.0.0.1','--port',String(workerPort),'--inspector-port','0','--env-file',vars],{cwd:webRoot,env:process.env,stdio:'ignore',windowsHide:true});
 let runner,closed=false;
 const close=async()=>{if(closed)return;closed=true;await runner?.close();gateway.close();gateway.closeAllConnections();if(child.exitCode===null&&child.pid){if(process.platform==='win32')await run(path.join(process.env.SystemRoot,'System32/taskkill.exe'),['/PID',String(child.pid),'/T','/F'],{timeout:10000}).catch(()=>child.kill());else child.kill();}await unlink(vars).catch(()=>{});};
 child.on('error',()=>void close());child.on('exit',()=>void close());
 try{
  let ready=false;for(let i=0;i<80&&!closed;i++){try{await client('asset',{clipId:'startup-readiness'},AbortSignal.timeout(1000));ready=true;break;}catch{}await new Promise(r=>setTimeout(r,500));}
  if(!ready)throw Error('PC 내부 서버를 시작하지 못했어요. 포트·빌드·DB 초기화를 확인해주세요.');
  await cleanTemporary(settings.get());runner=startRunner({client,origin,settings:settings.get});return{close,gateway,runner};
 }catch(e){await close();throw e;}
}
