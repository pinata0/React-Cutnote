import {existsSync} from 'node:fs';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {projectRoot} from './sites-env.mjs';

// Use the same local D1/R2 data and encryption secret as the development server.
// The built worker avoids sending development tooling to the Android WebView.
const config = path.join(projectRoot, 'dist/server/wrangler.json');
if (!existsSync(config)) {
  console.error('PC용 컷노트 빌드가 없어요. 먼저 npm run build를 실행해주세요.');
  process.exit(1);
}
const vars = path.join(projectRoot, '.dev.vars');
const child = spawn(process.execPath, [
  path.join(projectRoot, 'node_modules/wrangler/bin/wrangler.js'),
  'dev', '--config', config, '--local', '--persist-to', path.join(projectRoot, '.wrangler/state'),
  '--ip', '127.0.0.1', '--port', '5173', '--inspector-port', '0',
  ...(existsSync(vars) ? ['--env-file', vars] : []),
], {cwd:projectRoot,env:process.env,stdio:'inherit'});
for (const signal of ['SIGINT','SIGTERM']) process.once(signal, () => child.kill(signal));
child.once('error', () => { console.error('PC 컷노트 서버를 시작하지 못했어요.'); process.exitCode=1; });
child.once('exit', (code, signal) => { process.exitCode=code ?? (signal ? 1 : 0); });
