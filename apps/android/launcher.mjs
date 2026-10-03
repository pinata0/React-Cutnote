import http from 'node:http';
import path from 'node:path';
import {constants, existsSync} from 'node:fs';
import {open, mkdir, rename, unlink} from 'node:fs/promises';
import {randomBytes, randomUUID} from 'node:crypto';
import {spawn} from 'node:child_process';
import {networkInterfaces} from 'node:os';
import {fileURLToPath} from 'node:url';
import {createBridge, discoverAddress, privateIPv4, findProject} from './bridge/server.mjs';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PC_ORIGIN = 'http://127.0.0.1:5173';
const MAX_JSON = 16 * 1024;
const validCode = value => typeof value === 'string' && /^[A-Za-z0-9_-]{32,128}$/.test(value);
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));

// Never follow a replacement symlink to read credentials or overwrite another file.
export async function readPrivateJson(filename) {
  let handle;
  try {
    handle = await open(filename, constants.O_RDONLY | constants.O_NOFOLLOW);
    const stat = await handle.stat();
    if (!stat.isFile() || stat.size > MAX_JSON) throw new Error('연결 설정 파일 형식을 확인해주세요.');
    const buffer = Buffer.alloc(MAX_JSON + 1);
    const {bytesRead} = await handle.read(buffer, 0, buffer.length, 0);
    if (bytesRead > MAX_JSON) throw new Error('연결 설정 파일이 너무 커요.');
    return JSON.parse(buffer.toString('utf8', 0, bytesRead));
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    // JSON parsing errors can contain document text: never forward them to logs.
    throw new Error('연결 설정 파일을 읽지 못했어요. 파일 권한과 형식을 확인해주세요.');
  } finally { await handle?.close(); }
}

export async function writePrivateJson(filename, value) {
  await mkdir(path.dirname(filename), {recursive: true, mode: 0o700});
  const temporary = filename + '.' + randomUUID() + '.tmp';
  let handle;
  try {
    handle = await open(temporary, 'wx', 0o600);
    await handle.chmod(0o600);
    await handle.writeFile(JSON.stringify(value, null, 2) + '\n');
    await handle.sync();
    await handle.close(); handle = null;
    await rename(temporary, filename);
  } finally {
    await handle?.close();
    await unlink(temporary).catch(() => {});
  }
}

export function connectionCode(value) {
  return value?.service === 'cutnote-lan-bridge' && validCode(value.pairingCode) ? value.pairingCode : null;
}
export function persistentCode(value) {
  if (value === null) return null;
  if (value?.service !== 'cutnote-pairing' || value.version !== 1 || !validCode(value.pairingCode)) throw new Error('보존된 연결 코드 형식을 확인해주세요. 기존 코드를 자동으로 바꾸지 않았어요.');
  return value.pairingCode;
}
export function chooseAddress(interfaces = networkInterfaces(), override = process.env.CUTNOTE_LAN_HOST) {
  if (!override) return discoverAddress(interfaces);
  if (!privateIPv4(override) || !Object.values(interfaces).flat().some(v => v && !v.internal && v.family === 'IPv4' && v.address === override)) throw new Error('이 컴퓨터에 연결된 사설 IPv4 주소를 사용해주세요.');
  return override;
}

// Only the two known service ports are probed. A refused connection is distinct
// from an occupied/unhealthy service; the latter must never spawn a replacement.
export function probeJson(url, headers = {}, timeout = 2500) {
  return new Promise(resolve => {
    let settled = false;
    const done = value => { if (!settled) { settled = true; resolve(value); } };
    const req = http.get(url, {headers, timeout}, res => {
      let bytes = 0; const chunks = [];
      res.on('data', chunk => {
        bytes += chunk.length;
        if (bytes > MAX_JSON) { done({kind: 'occupied'}); res.destroy(); req.destroy(); }
        else chunks.push(chunk);
      });
      res.on('error', () => done({kind: 'occupied'}));
      res.on('end', () => {
        let data;
        try { data = JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch {}
        done({kind: 'response', status: res.statusCode, headers: res.headers, data});
      });
    });
    req.on('timeout', () => { done({kind: 'occupied'}); req.destroy(); });
    req.on('error', error => done({kind: error.code === 'ECONNREFUSED' ? 'offline' : 'occupied'}));
  });
}
export const pcReady = result => result.kind === 'response' && result.status === 200
  && result.headers?.['content-type']?.includes('application/json')
  && result.data?.workspace?.kind === 'pc' && typeof result.data.configured === 'boolean';
const bridgeChallenge = result => result.kind === 'response' && result.status === 401 && result.headers?.['x-cutnote-connection'] === 'required';

// Signal 0 checks whether a lock holder exists; it never terminates a process.
function processExists(pid) {
  if (!Number.isSafeInteger(pid) || pid <= 0) return true;
  try { process.kill(pid, 0); return true; } catch (error) { return error.code !== 'ESRCH'; }
}
export async function acquireLock(filename, alive = processExists) {
  const token = randomUUID();
  for (let attempt = 0; attempt < 2; attempt++) {
    let handle;
    try {
      handle = await open(filename, 'wx', 0o600);
      await handle.writeFile(JSON.stringify({pid: process.pid, token}));
      await handle.close();
      return async () => {
        const current = await readPrivateJson(filename).catch(() => null);
        if (current?.token === token) await unlink(filename).catch(() => {});
      };
    } catch (error) {
      await handle?.close().catch(() => {});
      if (error.code !== 'EEXIST') throw new Error('실행 상태 파일을 만들지 못했어요. 폴더 권한을 확인해주세요.');
      // A second click during lock creation simply reports that startup is busy.
      const current = await readPrivateJson(filename).catch(() => null);
      if (!current || !Number.isSafeInteger(current.pid) || alive(current.pid)) return null;
      const checked = await readPrivateJson(filename).catch(() => null);
      if (checked?.token !== current.token) return null;
      await unlink(filename).catch(() => {});
    }
  }
  return null;
}

export function showConnection(origin, code, {write = text => process.stdout.write(text), personalTTY = Boolean(process.stdin.isTTY && process.stdout.isTTY)} = {}) {
  write('\n컷노트 PC 보관함: ' + PC_ORIGIN + '/\n휴대폰 연결 주소: ' + origin + '\n');
  if (personalTTY) write('연결 코드: ' + code + '\n');
  else write('연결 코드는 권한 600 설정 파일에 보존했어요. 개인 터미널에서 실행하면 표시돼요.\n');
  write('휴대폰의 컷노트 앱에서 주소와 코드를 입력하세요. PC 웹과 같은 보관함을 사용해요.\n');
}

export async function launch(options = {}) {
  const root = options.root || ROOT;
  const projectRoot = options.projectRoot || findProject(root);
  const address = options.address || chooseAddress();
  if (!privateIPv4(address)) throw new Error('휴대폰 연결 주소는 사설 IPv4여야 해요.');
  const origin = 'http://' + address + ':5174';
  const connectionFile = path.join(root, 'connection.txt');
  const pairingFile = path.join(root, '.cutnote-pairing.json');
  const probe = options.probe || probeJson;
  const wait = options.wait || pause;
  const report = options.report || (message => process.stdout.write(message + '\n'));
  const release = await acquireLock(path.join(root, '.cutnote-launcher.lock'), options.alive);
  let child = null, server = null, closed = false, failed = false;
  const close = async () => {
    if (closed) return; closed = true;
    if (server) { server.close(); server.closeAllConnections(); }
    // Only the ChildProcess created by this invocation is terminated.
    if (child && child.exitCode === null && child.signalCode === null) {
      await new Promise(resolve => {
        const timer = setTimeout(resolve, 5000);
        child.once('exit', () => { clearTimeout(timer); resolve(); });
        if(child.connected&&child.send)child.send('cutnote-shutdown');else child.kill('SIGTERM');
      });
    }
    await release?.();
  };
  try {
    const connection = await readPrivateJson(connectionFile);
    const savedCode = persistentCode(await readPrivateJson(pairingFile));
    const legacyCode = connectionCode(connection);
    let status = await probe(PC_ORIGIN + '/api/ai/status');
    if (!pcReady(status)) {
      if (!release) return {busy: true, close, origin};
      if (status.kind !== 'offline') throw new Error('5173에서 응답하는 서버가 컷노트 PC 보관함인지 확인하지 못했어요. 기존 서버를 변경하지 않았어요.');
      const entry = path.join(projectRoot, 'scripts/start-pc.mjs');
      if (!existsSync(entry) || !existsSync(path.join(projectRoot, 'dist/server/wrangler.json'))) throw new Error('PC 실행 파일이나 빌드가 없어요. 컷노트 프로젝트의 빌드를 먼저 준비해주세요.');
      report('PC 컷노트를 시작하고 있어요…');
      child = (options.spawnPc || (() => spawn(process.execPath, [entry], {cwd: projectRoot, stdio: ['ignore','ignore','ignore','ipc'], env: process.env, windowsHide: true})))();
      child.once('error', () => { failed = true; });
      child.once('exit', () => { failed = true; });
      const deadline = Date.now() + 60000;
      for (let i = 0; i < 80 && Date.now() < deadline; i++) {
        if (failed) throw new Error('PC 컷노트를 시작하지 못했어요. 빌드와 PC 실행 설정을 확인해주세요.');
        await wait(750);
        status = await probe(PC_ORIGIN + '/api/ai/status');
        if (pcReady(status)) break;
      }
      if (!pcReady(status)) throw new Error('PC 컷노트 시작을 확인하지 못했어요. 다시 실행해주세요.');
    }
    if (!status.data?.localIngestAvailable) report('현재 PC 서버는 로컬 다운로드 작업자를 지원하지 않아요. 개발 서버를 종료하고 최신 빌드로 다시 실행해주세요.');
    let bridgeStatus = await probe(origin + '/api/ai/status');
    let code;
    if (bridgeStatus.kind === 'offline') {
      if (!release) return {busy: true, close, origin};
      code = legacyCode || savedCode || randomBytes(32).toString('base64url');
      // Preserve the chosen code before the transient connection file can vanish.
      await writePrivateJson(pairingFile, {service: 'cutnote-pairing', version: 1, pairingCode: code});
      const created = (options.bridgeFactory || createBridge)({publicOrigin: origin, projectRoot, upstream: PC_ORIGIN, pairingSecret: code});
      server = created.server;
      try {
        await new Promise((resolve, reject) => { server.once('error', reject); server.listen(5174, '0.0.0.0', resolve); });
      } catch (error) {
        if (error.code !== 'EADDRINUSE') throw new Error('휴대폰 연결 서버를 시작하지 못했어요. 네트워크 연결을 확인해주세요.');
        server.close(); server = null;
        bridgeStatus = await probe(origin + '/api/ai/status');
        code = undefined;
      }
    }
    if (!server) {
      if (!bridgeChallenge(bridgeStatus)) throw new Error('5174의 기존 연결 서버를 확인하지 못했어요. 해당 서버를 자동으로 종료하거나 교체하지 않았어요.');
      for (const candidate of [...new Set([legacyCode, savedCode].filter(Boolean))]) {
        if (pcReady(await probe(origin + '/api/ai/status', {'X-Cutnote-Pairing': candidate}))) { code = candidate; break; }
      }
      if (!code) throw new Error('실행 중인 연결 서버와 저장된 연결 코드가 맞지 않아요. 기존 connection.txt를 확인해주세요. 코드를 자동으로 바꾸지 않았어요.');
    } else if (!pcReady(await probe(origin + '/api/ai/status', {'X-Cutnote-Pairing': code}))) {
      throw new Error('휴대폰 연결 서버에서 PC 보관함을 확인하지 못했어요.');
    }
    if (release) {
      await writePrivateJson(pairingFile, {service: 'cutnote-pairing', version: 1, pairingCode: code});
      await writePrivateJson(connectionFile, {service: 'cutnote-lan-bridge', address: origin, mobileUrl: origin + '/mobile', libraryUrl: origin + '/', pairingCode: code, createdAt: new Date().toISOString(), ...(server ? {pid: process.pid} : Number.isSafeInteger(connection?.pid) ? {pid: connection.pid} : {})});
    }
    const ownsServices = Boolean(child || server);
    if (!ownsServices) await release?.();
    return {busy: false, origin, code, ownsServices, ownsPc: Boolean(child), ownsBridge: Boolean(server), close, child, server};
  } catch (error) { await close(); throw error; }
}

async function main() {
  const runtime = await launch();
  if (runtime.busy) { process.stdout.write('컷노트가 다른 실행 창에서 시작 중이에요. 그 창을 확인해주세요. 중복 실행하지 않았어요.\n'); return; }
  showConnection(runtime.origin, runtime.code);
  if (runtime.ownsServices) process.stdout.write('이 창을 켜둔 채 사용하세요. 종료하려면 Control-C를 누르세요.\n');
  else process.stdout.write('이미 실행 중인 컷노트를 확인했어요. 이 창을 닫아도 기존 서버는 유지돼요.\n');
  if (process.platform === 'darwin' && process.stdin.isTTY && process.stdout.isTTY) {
    const browser = spawn('/usr/bin/open', [PC_ORIGIN + '/'], {stdio: 'ignore'});
    browser.on('error', () => {}); browser.unref();
  }
  if (runtime.ownsServices) {
    const stop = () => { void runtime.close(); };
    process.once('SIGINT', stop); process.once('SIGTERM', stop); process.once('SIGHUP', stop);
    runtime.child?.once('exit', () => { process.stdout.write('PC 컷노트 서버가 종료됐어요. 실행 파일을 다시 열어주세요.\n'); void runtime.close(); });
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch(error => { process.stderr.write((error instanceof Error ? error.message : '컷노트를 시작하지 못했어요.') + '\n'); process.exitCode = 1; });
