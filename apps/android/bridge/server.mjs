import http from 'node:http';
import {randomBytes, createHash, timingSafeEqual} from 'node:crypto';
import {networkInterfaces} from 'node:os';
import path from 'node:path';
import {existsSync} from 'node:fs';
import {mkdir, open, unlink} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';

const execFileAsync = promisify(execFile);

// Windows ignores POSIX mode bits. Restrict a newly created, still empty file
// before writing the pairing code; never interpolate its path into shell code.
export async function protectConnectionFile(filename, file) {
  if (process.platform !== 'win32') return file.chmod(0o600);
  const script = `
$ErrorActionPreference = 'Stop'
$sid = [System.Security.Principal.WindowsIdentity]::GetCurrent().User
$acl = New-Object System.Security.AccessControl.FileSecurity
$acl.SetOwner($sid)
$acl.SetAccessRuleProtection($true, $false)
$rule = New-Object System.Security.AccessControl.FileSystemAccessRule($sid, 'FullControl', 'Allow')
$acl.AddAccessRule($rule)
[System.IO.File]::SetAccessControl($env:CUTNOTE_PRIVATE_FILE_PATH, $acl)
`;
  try {
    await execFileAsync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script], {
      env: {...process.env, CUTNOTE_PRIVATE_FILE_PATH: filename}, windowsHide: true, timeout: 15_000,
    });
  } catch {
    throw new Error('연결 파일의 개인 접근 권한을 설정하지 못했습니다. 연결 코드는 저장하지 않았습니다.');
  }
}

export const MAX_BYTES = 28 * 1024 * 1024;
const TIMEOUT = 210_000;
const COOKIE = 'cutnote_lan_session';
const SESSION_MS = 8 * 60 * 60 * 1000;
const PAIR_BYTES = 1024;
const PAIR_WINDOW_MS = 60_000;
const PAIR_ATTEMPTS = 8;
const MAX_PAIR_CLIENTS = 256;
const SAFE_METHODS = new Set(['GET', 'HEAD']);
const REQUEST_HEADERS = new Set(['accept', 'accept-encoding', 'accept-language', 'content-type', 'range', 'if-range', 'if-none-match', 'if-modified-since', 'user-agent', 'rsc', 'next-router-state-tree', 'next-router-prefetch', 'next-url', 'x-vinext-navigation']);
const HOP_HEADERS = new Set(['connection', 'keep-alive', 'proxy-authenticate', 'proxy-authorization', 'te', 'trailer', 'transfer-encoding', 'upgrade', 'set-cookie']);
const ASSET_EXT = /\.(?:[cm]?js|jsx|ts|tsx|css|map|woff2?|ttf|otf|ico|png|jpe?g|webp|svg|gif|avif|wasm)$/i;

export function privateIPv4(address) {
  const octets = address.split('.');
  if (octets.length !== 4 || octets.some(v => !/^(?:0|[1-9]\d{0,2})$/.test(v) || Number(v) > 255)) return false;
  const [a, b] = octets.map(Number);
  return a === 10 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168);
}

export function discoverAddress(interfaces = networkInterfaces()) {
  const candidates = Object.entries(interfaces).flatMap(([name, values]) => (values || [])
    .filter(v => !v.internal && v.family === 'IPv4' && privateIPv4(v.address))
    .map(v => ({name, address: v.address})));
  candidates.sort((a, b) => Number(!/^(en\d|eth\d|wlan\d|wi-?fi)/i.test(a.name)) - Number(!/^(en\d|eth\d|wlan\d|wi-?fi)/i.test(b.name)) || a.name.localeCompare(b.name));
  if (!candidates.length) throw new Error('사설 IPv4 주소를 찾지 못했어요. 컴퓨터를 휴대폰과 같은 Wi-Fi/LAN에 연결해주세요.');
  return candidates[0].address;
}

function digest(value) { return createHash('sha256').update(value).digest(); }
function sameSecret(a, b) { return typeof a === 'string' && a.length <= 256 && timingSafeEqual(digest(a), digest(b)); }
function reply(res, status, error) {
  if (res.destroyed || res.writableEnded) return;
  if (res.headersSent) { res.destroy(); return; }
  res.writeHead(status, {'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff'});
  res.end(JSON.stringify(error ? {error} : {ok: true}));
}

function escapeHtml(value) { return String(value).replace(/[&<>"']/g, character => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[character])); }
function browserNavigation(req) {
  return /(?:^|,)\s*text\/html\s*(?:;[^,]*)?(?:,|$)/i.test(req.headers.accept || '')
    && (!req.headers['sec-fetch-mode'] || req.headers['sec-fetch-mode'] === 'navigate')
    && (!req.headers['sec-fetch-dest'] || req.headers['sec-fetch-dest'] === 'document');
}
function pairingPage(res, status = 200, next = '/', error = '') {
  if (res.destroyed || res.writableEnded) return;
  const nonce = randomBytes(18).toString('base64');
  res.writeHead(status, {
    'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store',
    'Content-Security-Policy': `default-src 'none'; style-src 'nonce-${nonce}'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'`,
    'X-Content-Type-Options': 'nosniff', 'X-Frame-Options': 'DENY', 'Referrer-Policy': 'same-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()', 'X-Robots-Tag': 'noindex, nofollow',
  });
  res.end(`<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>PC 보관함에 연결 · 컷노트</title><style nonce="${nonce}">
*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;padding:28px 20px;background:#F7F7F8;color:#191919;font-family:system-ui,-apple-system,sans-serif;line-height:1.6}.card{width:100%;max-width:440px;border:1px solid #E5E5E8;border-radius:24px;background:#fff;padding:32px}.brand{display:inline-block;padding:5px 12px;border-radius:10px;background:#FEE500;font-weight:800;font-size:15px}h1{font-size:27px;line-height:1.3;margin:24px 0 12px;letter-spacing:-.04em}p{font-size:14px;color:#666;margin:0 0 24px}label{display:block;font-size:14px;font-weight:700;margin-bottom:8px}input{width:100%;min-height:50px;border:1px solid #D7D7DC;border-radius:12px;padding:12px 14px;font:inherit}input:focus-visible,button:focus-visible{outline:2px solid #191919;outline-offset:3px}button{width:100%;min-height:52px;margin-top:18px;border:0;border-radius:14px;background:#FEE500;color:#191919;font:inherit;font-weight:800;cursor:pointer}.error{margin:14px 0 0;color:#B42318;font-size:14px}.help{margin:22px 0 0;font-size:12px;color:#737373}
</style></head><body><main class="card"><span class="brand">컷노트</span><h1>PC 보관함에 연결</h1><p>같은 Wi-Fi에 연결한 뒤, 보관함이 실행 중인 컴퓨터의 연결 코드를 입력해주세요.</p><form method="post" action="/pair"><input type="hidden" name="next" value="${escapeHtml(next === '/mobile' ? '/mobile' : '/')}"><label for="code">연결 코드</label><input id="code" name="code" type="password" autocomplete="off" autocapitalize="none" spellcheck="false" minlength="12" maxlength="256" required autofocus>${error ? `<p class="error" role="alert">${escapeHtml(error)}</p>` : ''}<button type="submit">보관함 열기</button></form><p class="help">연결 후에는 같은 PC 보관함을 함께 사용할 수 있어요.<br>연결 코드는 주소창에 넣지 않아도 돼요.</p></main></body></html>`);
}

function allowPairAttempt(attempts, address, now) {
  for (const [key, value] of attempts) if (value.expires <= now) attempts.delete(key);
  let entry = attempts.get(address);
  if (!entry) {
    if (attempts.size >= MAX_PAIR_CLIENTS) return false;
    entry = {count: 0, expires: now + PAIR_WINDOW_MS};
    attempts.set(address, entry);
  }
  if (entry.count >= PAIR_ATTEMPTS) return false;
  entry.count++;
  return true;
}

function requestPath(raw) {
  if (typeof raw !== 'string' || !raw.startsWith('/') || raw.startsWith('//')) return null;
  try {
    const pathname = decodeURIComponent(raw.split('?')[0]);
    if (/[\\\x00-\x1f%]/.test(pathname) || pathname.split('/').some(v => v === '.' || v === '..')) return null;
    return {pathname, target: new URL(raw, 'http://127.0.0.1').pathname + new URL(raw, 'http://127.0.0.1').search};
  } catch { return null; }
}

export function allowedPath(pathname, method, projectRoot) {
  if (pathname.split('/').some(v => v.startsWith('.') && !['.vite', '.pnpm'].includes(v))) return false;
  if (pathname.startsWith('/api/')) {
    if (pathname === '/api/jobs') return ['GET', 'POST'].includes(method);
    if (/^\/api\/jobs\/[a-f0-9-]{36}\/(cancel|retry)$/.test(pathname)) return method === 'POST';
    if (pathname === '/api/clips') return ['GET', 'HEAD', 'POST'].includes(method);
    if (pathname === '/api/library/order') return method === 'PATCH';
    if (pathname === '/api/recommendations/feedback') return method === 'GET' || method === 'POST';
    if (pathname === '/api/recommendations/youtube') return method === 'POST';
    if (/^\/api\/clips\/[\w-]{1,80}$/.test(pathname)) return ['GET', 'HEAD', 'PATCH', 'DELETE'].includes(method);
    if (/^\/api\/media\/[\w-]{1,64}$/.test(pathname)) return ['GET', 'HEAD', 'POST'].includes(method);
    if (/^\/api\/segment-media\/[\w-]{1,64}$/.test(pathname)) return SAFE_METHODS.has(method);
    if (/^\/api\/segment-media\/[\w-]{1,64}\/[\w-]{1,64}$/.test(pathname)) return ['GET', 'HEAD', 'POST'].includes(method);
    if (['/api/links/media', '/api/ai/status'].includes(pathname)) return SAFE_METHODS.has(method);
    if (['/api/links/resolve', '/api/ai/analyze', '/api/ai/frames', '/api/ai/image-query', '/api/ai/effect-query'].includes(pathname)) return method === 'POST';
    return false;
  }
  if (!SAFE_METHODS.has(method)) return false;
  if (['/', '/mobile', '/mobile/', '/manifest.webmanifest', '/manifest.json', '/favicon.ico', '/icon', '/apple-icon', '/@vite/client', '/@react-refresh'].includes(pathname)) return true;
  if (pathname.startsWith('/@id/')) return /^\/@id\/[\w@/:.+-]+$/.test(pathname);
  if (!ASSET_EXT.test(pathname)) return false;
  if (pathname.startsWith('/@fs/')) {
    const resolved = path.resolve(pathname.slice('/@fs'.length));
    return ['node_modules', 'app', 'components', 'hooks', 'lib', 'src'].some(dir => resolved.startsWith(path.join(projectRoot, dir) + path.sep));
  }
  return /^\/(?:_next|assets|icons|images|node_modules|app|components|hooks|lib|src)\//.test(pathname)
    || /^\/[\w-]+\.(?:ico|png|svg|webp)$/.test(pathname);
}

function readBody(req, limit) {
  return new Promise((resolve, reject) => {
    let size = 0, failed = false;
    const chunks = [];
    req.on('data', chunk => {
      if (failed) return;
      size += chunk.length;
      if (size > limit) { failed = true; chunks.length = 0; reject(Object.assign(new Error('요청은 28MB까지 보낼 수 있어요.'), {status: 413})); return; }
      chunks.push(chunk);
    });
    req.on('end', () => { if (!failed) resolve(Buffer.concat(chunks, size)); });
    req.on('error', reject);
    req.on('aborted', () => reject(new Error('요청이 취소되었어요.')));
  });
}

// Exported for isolated tests. The CLI always binds one private LAN IPv4 address.
export function createBridge({publicOrigin, projectRoot, upstream = 'http://127.0.0.1:5173', pairingSecret = randomBytes(32).toString('base64url'), maxBytes = MAX_BYTES, timeout = TIMEOUT}) {
  const origin = new URL(publicOrigin), target = new URL(upstream);
  if (origin.protocol !== 'http:' || target.protocol !== 'http:' || target.hostname !== '127.0.0.1') throw new Error('Only the loopback Cutnote upstream is supported.');
  const sessions = new Map();
  const pairAttempts = new Map();
  function issueSession(res, now) {
    for (const [id, expires] of sessions) if (expires <= now) sessions.delete(id);
    if (sessions.size >= 32) sessions.delete(sessions.keys().next().value);
    const id = randomBytes(32).toString('base64url');
    sessions.set(id, now + SESSION_MS);
    res.setHeader('Set-Cookie', `${COOKIE}=${id}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${SESSION_MS / 1000}`);
  }
  async function pairBrowser(req, res) {
    if (req.headers.origin !== origin.origin) return reply(res, 403, '현재 연결 화면에서 다시 입력해주세요.');
    if (!allowPairAttempt(pairAttempts, req.socket.remoteAddress || 'unknown', Date.now())) {
      res.setHeader('Retry-After', String(PAIR_WINDOW_MS / 1000));
      return pairingPage(res, 429, '/', '연결 시도가 많아요. 잠시 후 다시 입력해주세요.');
    }
    if ((req.headers['content-type'] || '').split(';', 1)[0].trim().toLowerCase() !== 'application/x-www-form-urlencoded') return reply(res, 415, '연결 화면의 입력란을 사용해주세요.');
    const closePage = (status, message) => {
      if (res.writableEnded || res.destroyed) return;
      res.setHeader('Connection', 'close');
      res.once('finish', () => req.destroy());
      pairingPage(res, status, '/', message);
      req.resume();
    };
    const length = req.headers['content-length'];
    if (length && (!/^\d+$/.test(length) || Number(length) > PAIR_BYTES)) return closePage(413, '연결 요청이 너무 커요. 코드만 입력해주세요.');
    const deadline = setTimeout(() => closePage(408, '입력 전송 시간이 지났어요. 다시 연결해주세요.'), Math.min(timeout, 10_000));
    try {
      const body = await readBody(req, PAIR_BYTES);
      if (res.writableEnded || res.destroyed) return;
      const fields = new URLSearchParams(body.toString('utf8'));
      const next = fields.get('next') === '/mobile' ? '/mobile' : '/';
      const code = (fields.get('code') || '').trim();
      if (fields.getAll('code').length !== 1 || fields.getAll('next').length > 1 || [...fields.keys()].some(key => !['code', 'next'].includes(key))) return pairingPage(res, 400, next, '연결 화면에서 코드를 다시 입력해주세요.');
      if (!/^[A-Za-z0-9_-]{12,256}$/.test(code) || !sameSecret(code, pairingSecret)) return pairingPage(res, 401, next, '연결 코드가 맞지 않아요. 컴퓨터의 현재 코드를 확인해주세요.');
      issueSession(res, Date.now());
      res.writeHead(303, {'Location': next, 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer', 'X-Content-Type-Options': 'nosniff'});
      res.end();
    } catch (error) {
      if (res.writableEnded || res.destroyed) return;
      if (error.status === 413) closePage(413, '연결 요청이 너무 커요. 코드만 입력해주세요.');
      else closePage(400, '연결 요청을 받지 못했어요. 다시 입력해주세요.');
    } finally { clearTimeout(deadline); }
  }
  let active = 0;
  const server = http.createServer(async (req, res) => {
    const method = req.method || 'GET', parsed = requestPath(req.url);
    if (req.headers.host !== origin.host) return reply(res, 403, '잘못된 연결 주소예요.');
    if (!parsed) return reply(res, 400, '올바른 경로를 사용해주세요.');
    if (req.headers.origin && req.headers.origin !== origin.origin) return reply(res, 403, '다른 사이트에서는 요청할 수 없어요.');
    if (req.headers['sec-fetch-site'] === 'cross-site') return reply(res, 403, '다른 사이트에서는 요청할 수 없어요.');
    if (req.headers.referer) {
      try { if (new URL(req.headers.referer).origin !== origin.origin) return reply(res, 403, '다른 사이트에서는 요청할 수 없어요.'); }
      catch { return reply(res, 403, '올바른 요청을 사용해주세요.'); }
    }
    if (method === 'OPTIONS' || !['GET', 'HEAD', 'POST', 'PATCH', 'DELETE'].includes(method)) return reply(res, 405, '지원하지 않는 요청이에요.');
    if (parsed.pathname === '/health' && SAFE_METHODS.has(method)) return reply(res, 200);
    if (parsed.pathname === '/pair') {
      if (method !== 'POST') return reply(res, 405, '연결 화면에서 코드를 입력해주세요.');
      if (parsed.target !== '/pair') return reply(res, 400, '연결 코드는 입력란에 넣어주세요.');
      return pairBrowser(req, res);
    }
    const now = Date.now();
    for (const [id, expires] of sessions) if (expires <= now) sessions.delete(id);
    const values = (req.headers.cookie || '').split(';').map(v => v.trim()).filter(v => v.startsWith(COOKIE + '='));
    const session = values.length === 1 ? values[0].slice(COOKIE.length + 1) : '';
    const paired = sameSecret(req.headers['x-cutnote-pairing'], pairingSecret);
    if (!paired && !sessions.has(session)) {
      if (method === 'GET' && ['/', '/mobile'].includes(parsed.pathname) && req.headers['x-cutnote-pairing'] === undefined && browserNavigation(req)) return pairingPage(res, 200, parsed.pathname);
      res.setHeader('X-Cutnote-Connection', 'required');
      return reply(res, 401, '컷노트 앱에서 컴퓨터 주소와 페어링 코드를 연결해주세요.');
    }
    if (!allowedPath(parsed.pathname, method, projectRoot)) return reply(res, 403, '이 기능은 컴퓨터의 컷노트에서 사용해주세요.');
    if (paired) issueSession(res, now);
    const counted = !SAFE_METHODS.has(method);
    if (counted && active >= 4) return reply(res, 503, '요청을 처리 중이에요. 잠시 후 다시 시도해주세요.');
    if (req.headers['content-length'] && (!/^\d+$/.test(req.headers['content-length']) || Number(req.headers['content-length']) > maxBytes)) return reply(res, 413, '요청은 28MB까지 보낼 수 있어요.');
    if (counted) active++;
    const mediaStream = SAFE_METHODS.has(method) && /^\/api\/(media|segment-media)\/[\w/-]+$/.test(parsed.pathname);
    const responseLimit = mediaStream ? 2 * 1024 ** 3 : maxBytes;
    let outgoing;
    const deadline = setTimeout(() => { reply(res, 504, '처리 시간이 초과됐어요.'); outgoing?.destroy(); req.destroy(); }, mediaStream ? 24 * 60 * 60 * 1000 : timeout);
    if (mediaStream) res.setTimeout(60000, () => res.destroy());
    res.on('close', () => { if (!res.writableEnded) outgoing?.destroy(); });
    try {
      const body = await readBody(req, maxBytes);
      if (res.writableEnded || res.destroyed) return;
      const headers = {};
      for (const [name, value] of Object.entries(req.headers)) if (REQUEST_HEADERS.has(name) && value !== undefined) headers[name] = value;
      headers.host = target.host;
      headers.origin = target.origin;
      headers.referer = target.origin + '/mobile';
      headers['x-cutnote-client'] = 'lan';
      if (body.length || !SAFE_METHODS.has(method)) headers['content-length'] = String(body.length);
      await new Promise((resolve, reject) => {
        outgoing = http.request({hostname: target.hostname, port: target.port, method, path: parsed.target, headers, timeout}, upstreamRes => {
          const size = Number(upstreamRes.headers['content-length'] || 0);
          if (size > responseLimit) { upstreamRes.destroy(); reject(Object.assign(new Error('응답 크기가 너무 커요.'), {status: 502})); return; }
          if (upstreamRes.headers.location) {
            try {
              const location = new URL(upstreamRes.headers.location, target);
              if (location.origin !== target.origin || !allowedPath(decodeURIComponent(location.pathname), 'GET', projectRoot)) throw new Error('Redirect blocked');
              upstreamRes.headers.location = location.pathname + location.search + location.hash;
            } catch { upstreamRes.destroy(); reject(Object.assign(new Error('허용되지 않은 이동이에요.'), {status: 502})); return; }
          }
          for (const [name, value] of Object.entries(upstreamRes.headers)) if (!HOP_HEADERS.has(name) && value !== undefined) res.setHeader(name, value);
          res.setHeader('Cache-Control', 'no-store');
          res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
          res.setHeader('X-Content-Type-Options', 'nosniff');
          res.statusCode = upstreamRes.statusCode || 502;
          let received = 0;
          upstreamRes.on('data', chunk => { received += chunk.length; if (received > responseLimit) { upstreamRes.destroy(); res.destroy(); reject(new Error('Response too large')); } });
          upstreamRes.on('error', reject);
          upstreamRes.on('end', resolve);
          upstreamRes.pipe(res);
        });
        outgoing.on('error', reject);
        outgoing.on('timeout', () => outgoing.destroy(new Error('Upstream timed out')));
        outgoing.end(body);
      });
    } catch (error) {
      outgoing?.destroy();
      if (error.status === 413 && !res.headersSent) res.setHeader('Connection', 'close');
      reply(res, error.status || 502, error.status === 413 ? error.message : '컴퓨터의 컷노트 서버에 연결하지 못했어요. 실행 상태를 확인해주세요.');
      if (error.status === 413) req.resume();
    } finally { clearTimeout(deadline); if (counted) active--; }
  });
  server.requestTimeout = timeout;
  server.headersTimeout = 15_000;
  server.on('upgrade', (_req, socket) => { socket.end('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n'); });
  server.on('clientError', (_error, socket) => { socket.end('HTTP/1.1 400 Bad Request\r\nConnection: close\r\n\r\n'); });
  server.on('close', () => { sessions.clear(); pairAttempts.clear(); });
  return {server, pairingSecret};
}

export function findProject(start = path.dirname(fileURLToPath(import.meta.url))) {
  for (let current = start; ; current = path.dirname(current)) {
    for (const candidate of [path.join(current, 'web'), path.join(current, 'apps', 'web')]) {
      if (existsSync(path.join(candidate, 'package.json'))) return candidate;
    }
    if (current === path.dirname(current)) break;
  }
  throw new Error('apps/web 프로젝트를 찾지 못했어요. bridge 폴더는 apps/android 안에 두세요.');
}

export async function writeConnectionFile(filename, details) {
  if (!path.isAbsolute(filename)) throw new Error('--connection-file에는 절대 경로를 지정해주세요.');
  await mkdir(path.dirname(filename), {recursive: true, mode: 0o700});
  const file = await open(filename, 'wx', 0o600).catch(error => {
    if (error.code === 'EEXIST') throw new Error('연결 안내 파일이 이미 있어요. 기존 브릿지가 종료되었는지 확인하고 이전 안내 파일을 지운 뒤 다시 실행해주세요.');
    throw error;
  });
  try { await protectConnectionFile(filename, file); await file.writeFile(JSON.stringify({service: 'cutnote-lan-bridge', ...details}, null, 2) + '\n'); }
  finally { await file.close(); }
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length && (args.length !== 2 || args[0] !== '--connection-file' || !path.isAbsolute(args[1]))) throw new Error('사용법: node server.mjs [--connection-file /절대/경로/connection.txt]');
  const connectionFile = args[0] === '--connection-file' ? args[1] : null;
  if (!connectionFile && !process.stdout.isTTY) throw new Error('페어링 코드는 개인 터미널에서만 표시합니다. Finder에서 start.command를 열거나 --connection-file을 지정해주세요.');
  const projectRoot = findProject();
  const address = process.env.CUTNOTE_LAN_HOST || discoverAddress();
  if (!privateIPv4(address)) throw new Error('CUTNOTE_LAN_HOST에는 사설 IPv4 주소만 사용할 수 있어요.');
  const health = await fetch('http://127.0.0.1:5173/api/ai/status', {signal: AbortSignal.timeout(5000)}).catch(() => null);
  if (!health?.ok || !health.headers.get('content-type')?.includes('application/json')) throw new Error('먼저 컴퓨터에서 컷노트 개발 서버를 127.0.0.1:5173으로 실행해주세요. 프로젝트: ' + projectRoot);
  await health.body?.cancel();
  const publicOrigin = `http://${address}:5174`;
  const {server, pairingSecret} = createBridge({publicOrigin, projectRoot});
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(5174, address, resolve); });
  if (connectionFile) {
    try { await writeConnectionFile(connectionFile, {address: publicOrigin, mobileUrl: publicOrigin + '/mobile', pairingCode: pairingSecret, createdAt: new Date().toISOString(), pid: process.pid}); }
    catch (error) { server.close(); server.closeAllConnections(); throw error; }
    process.stdout.write('컷노트 LAN 브릿지 실행 중. 연결 안내를 권한 600 파일에 저장했습니다.\n');
  } else {
    process.stdout.write(`\n컷노트 Android · 같은 Wi-Fi/LAN 연결\n컴퓨터 주소: ${publicOrigin}\n페어링 코드: ${pairingSecret}\n\n앱 설정에 주소와 코드를 입력한 뒤 공유에서 컷노트를 선택하세요.\n코드는 이 실행 동안만 유효하며 재시작하면 바뀝니다.\n신뢰하는 LAN에서만 사용하세요. HTTP 데모 연결이며 인터넷 공개용이 아닙니다.\nAI 키 설정은 컴퓨터에서만 가능합니다. 종료: Control-C\n\n`);
  }
  const stop = () => { server.close(); server.closeAllConnections(); if (connectionFile) void unlink(connectionFile).catch(() => {}); };
  process.once('SIGINT', stop);
  process.once('SIGTERM', stop);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch(error => { console.error(error.code === 'EADDRINUSE' ? '5174 포트를 이미 사용 중이에요. 기존 브릿지를 종료한 뒤 다시 실행해주세요.' : error.message); process.exitCode = 1; });
