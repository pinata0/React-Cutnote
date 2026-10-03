import './sites-env.mjs';
import {startPc} from '../../pc/start.mjs';
const runtime=await startPc();
console.log('컷노트 PC: http://127.0.0.1:5173/ · PC 연결 창은 유지해주세요.');
for(const signal of ['SIGINT','SIGTERM','SIGHUP'])process.once(signal,()=>{void runtime.close();});
process.on('message',message=>{if(message==='cutnote-shutdown'){void runtime.close().finally(()=>{if(process.connected)process.disconnect();});}});
process.once('disconnect',()=>{void runtime.close();});
