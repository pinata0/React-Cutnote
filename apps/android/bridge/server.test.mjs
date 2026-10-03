import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {once} from 'node:events';
import {mkdtemp, readFile, stat, rm, mkdir, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {findProject, createBridge, privateIPv4, discoverAddress, allowedPath, writeConnectionFile, MAX_BYTES} from './server.mjs';

const publicOrigin = 'http://192.168.22.3:5174';
const projectRoot = '/test/cutnote';
const fixtureSecret = 'test-fixture-not-a-real-pairing-code';

async function fixture(options = {}) {
  const seen = [];
  const upstream = http.createServer(async (req, res) => {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const item = {method: req.method, url: req.url, headers: req.headers, body: Buffer.concat(chunks).toString('base64')};
    seen.push(item);
    if (req.url === '/mobile?redirect=1') { res.writeHead(302, {Location: `http://127.0.0.1:${upstream.address().port}/mobile?url=next`, 'Set-Cookie': 'upstream-secret=no'}); res.end(); return; }
    if (req.url === '/mobile?external=1') { res.writeHead(302, {Location: 'https://example.com/'}); res.end(); return; }
    if (req.url === '/mobile?slow=1') return;
    if (req.url === '/api/media/large') {res.writeHead(200,{'Content-Type':'video/mp4','Content-Length':String(29*1024**2)});res.end(Buffer.alloc(29*1024**2,7));return;}
    if (req.url === '/api/ai/analyze?provider-error=1') { res.writeHead(401, {'Content-Type': 'application/json'}); res.end('{"error":"fixture provider authentication"}'); return; }
    if (req.url.startsWith('/api/media/') && req.url.includes('download=1') || req.url.startsWith('/api/segment-media/') && req.url.includes('download=1')) {
      const segment = req.url.startsWith('/api/segment-media/');
      const bytes = Buffer.from([0, 255, 128, 13, 10, 65]);
      const ext = segment ? 'webm' : 'mp4';
      res.writeHead(200, {'Content-Type': `video/${ext}`, 'Content-Length': String(bytes.length), 'Content-Disposition': `attachment; filename="cutnote.${ext}"; filename*=UTF-8''%EA%B5%AC%EA%B0%84.${ext}`});
      res.end(req.method === 'HEAD' ? undefined : bytes); return;
    }
    if (req.headers.range) { res.writeHead(206, {'Content-Type': 'video/mp4', 'Content-Range': 'bytes 2-4/6', 'Accept-Ranges': 'bytes'}); res.end('cde'); return; }
    res.writeHead(200, {'Content-Type': 'application/json', 'Set-Cookie': 'upstream-secret=no'});
    res.end(JSON.stringify(item));
  });
  upstream.listen(0, '127.0.0.1'); await once(upstream, 'listening');
  const {server} = createBridge({publicOrigin, projectRoot, upstream: `http://127.0.0.1:${upstream.address().port}`, pairingSecret: fixtureSecret, ...options});
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  function request(path, {method = 'GET', headers = {}, body, chunks, holdOpen = false} = {}) {
    return new Promise((resolve, reject) => {
      const req = http.request({host: '127.0.0.1', port: server.address().port, path, method, headers: {Host: new URL(publicOrigin).host, ...headers}}, res => {
        const pieces = [];
        res.on('data', chunk => pieces.push(chunk));
        res.on('end', () => {
          resolve({status: res.statusCode, headers: res.headers, body: Buffer.concat(pieces).toString(), bodyBytes: Buffer.concat(pieces)});
          if (holdOpen) req.destroy();
        });
        res.on('error', reject);
      });
      req.on('error', reject);
      if (holdOpen) req.setTimeout(3000, () => req.destroy(new Error('Fixture incomplete request did not time out')));
      if (chunks) for (const chunk of chunks) req.write(chunk);
      if (holdOpen) { if (body) req.write(body); req.flushHeaders(); }
      else req.end(body);
    });
  }
  async function pair() {
    const result = await request('/mobile', {headers: {'X-Cutnote-Pairing': fixtureSecret}});
    assert.equal(result.status, 200);
    const cookie = result.headers['set-cookie'][0];
    assert.match(cookie, /HttpOnly; SameSite=Strict; Path=\//);
    assert.ok(!cookie.includes(fixtureSecret));
    return cookie.split(';')[0];
  }
  async function close() { server.closeAllConnections(); upstream.closeAllConnections(); await Promise.all([new Promise(r => server.close(r)), new Promise(r => upstream.close(r))]); }
  return {request, pair, close, seen};
}

test('private address discovery never chooses a public or loopback address', () => {
  assert.equal(privateIPv4('127.0.0.1'), false);
  assert.equal(privateIPv4('8.8.8.8'), false);
  assert.equal(privateIPv4('172.32.0.1'), false);
  assert.equal(privateIPv4('192.168.1.9'), true);
  assert.equal(discoverAddress({utun0: [{family: 'IPv4', internal: false, address: '10.2.2.2'}], en0: [{family: 'IPv4', internal: false, address: '192.168.3.4'}]}), '192.168.3.4');
});

test('durable jobs require pairing and exact methods; large local media streams',async()=>{
 const f=await fixture();try{
  assert.equal((await f.request('/api/jobs',{method:'POST',body:'{}'})).status,401);
  const cookie=await f.pair(),headers={Cookie:cookie,Origin:publicOrigin,'Content-Type':'application/json'};
  const id='12345678-1234-4123-8123-123456789012';
  for(const endpoint of ['/api/jobs','/api/jobs/'+id+'/retry','/api/jobs/'+id+'/cancel'])assert.equal((await f.request(endpoint,{method:'POST',headers,body:'{}'})).status,200);
  for(const endpoint of ['/api/internal/jobs','/api/pc/settings','/api/jobs/'+id+'/unknown'])assert.equal((await f.request(endpoint,{method:'POST',headers,body:'{}'})).status,403);
  assert.equal((await f.request('/api/jobs/'+id+'/cancel',{headers})).status,403);
  const media=await f.request('/api/media/large',{headers});assert.equal(media.status,200);assert.equal(media.bodyBytes.length,29*1024**2);
 }finally{await f.close();}
});

test('connection details are written privately and existing files are not overwritten', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'cutnote-bridge-test-'));
  try {
    const filename = path.join(dir, 'connection.txt');
    await writeConnectionFile(filename, {address: publicOrigin, pairingCode: fixtureSecret});
    if (process.platform === 'win32') {
      const inspection = execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', `
$ErrorActionPreference = 'Stop'
$acl = [System.IO.File]::GetAccessControl($env:CUTNOTE_TEST_PRIVATE_FILE)
$sid = [System.Security.Principal.WindowsIdentity]::GetCurrent().User.Value
$rules = @($acl.GetAccessRules($true, $true, [System.Security.Principal.SecurityIdentifier]))
@{ protected = $acl.AreAccessRulesProtected; ownerOnly = ($rules.Count -eq 1 -and $rules[0].IdentityReference.Value -eq $sid -and $rules[0].AccessControlType -eq 'Allow' -and $rules[0].FileSystemRights -eq 'FullControl') } | ConvertTo-Json -Compress
`], {encoding: 'utf8', windowsHide: true, env: {...process.env, CUTNOTE_TEST_PRIVATE_FILE: filename}});
      assert.deepEqual(JSON.parse(inspection), {protected: true, ownerOnly: true});
    } else {
      assert.equal((await stat(filename)).mode & 0o777, 0o600);
    }
    assert.equal(JSON.parse(await readFile(filename, 'utf8')).pairingCode, fixtureSecret);
    await assert.rejects(writeConnectionFile(filename, {pairingCode: 'replacement'}));
    assert.equal(JSON.parse(await readFile(filename, 'utf8')).pairingCode, fixtureSecret);
  } finally { await rm(dir, {recursive: true, force: true}); }
});

test('unauthorized cannot read UI, assets, or API; health contains no user data', async () => {
  const f = await fixture();
  try {
    for (const route of ['/', '/mobile?url=https%3A%2F%2Fyoutu.be%2Fx', '/api/clips', '/api/ai/status', '/api/media/clip1', '/api/segment-media/clip1', '/api/segment-media/clip1/segment1?download=1&v=abc', '/@vite/client']) assert.equal((await f.request(route)).status, 401);
    assert.deepEqual(JSON.parse((await f.request('/health')).body), {ok: true});
    const rejected = await f.request('/mobile', {headers: {'X-Cutnote-Pairing': 'wrong'}});
    assert.equal(rejected.status, 401);
    assert.equal(rejected.headers['x-cutnote-connection'], 'required');
    assert.equal((await f.request('/api/ai/status')).headers['x-cutnote-connection'], 'required');
    assert.equal(f.seen.length, 0);
  } finally { await f.close(); }
});

test('pairing cookie authenticates, forbidden routes and cross-origin requests stay blocked', async () => {
  const f = await fixture();
  try {
    const Cookie = await f.pair();
    assert.equal((await f.request('/api/clips', {headers: {Cookie}})).status, 200);
    const providerError = await f.request('/api/ai/analyze?provider-error=1', {method: 'POST', headers: {Cookie}, body: '{}'});
    assert.equal(providerError.status, 401);
    assert.equal(providerError.headers['x-cutnote-connection'], undefined);
    for (const route of ['/api/ai/connect', '/api/settings', '/.dev.vars', '/@fs/test/cutnote/.env', '/@fs/etc/passwd', '/%2e%2e/.env', '/signin-with-chatgpt']) assert.equal((await f.request(route, {headers: {Cookie}})).status >= 400, true);
    assert.equal((await f.request('/api/clips', {method: 'POST', headers: {Cookie, Origin: 'https://attacker.example'}, body: '{}'})).status, 403);
    assert.equal((await f.request('/api/clips', {headers: {Cookie, Host: 'attacker.example'}})).status, 403);
    assert.equal((await f.request('/api/clips', {headers: {Cookie, 'Sec-Fetch-Site': 'cross-site'}})).status, 403);
    assert.equal((await f.request('/api/clips', {method: 'OPTIONS', headers: {Cookie}})).status, 405);
    assert.equal(allowedPath('/node_modules/.vite/deps/react.js', 'GET', projectRoot), true);
    assert.equal(allowedPath('/@id/__x00__virtual:vinext-rsc-browser-entry', 'GET', projectRoot), true);
  } finally { await f.close(); }
});

test('proxy preserves query, method, binary body and Range; strips credentials and rewrites Origin', async () => {
  const f = await fixture();
  try {
    const Cookie = await f.pair();
    const bytes = Buffer.from([0, 255, 128, 13, 10, 65]);
    const result = await f.request('/api/clips/clip1?source=a%2Fb&n=2', {method: 'PATCH', headers: {Cookie, Origin: publicOrigin, 'Content-Type': 'application/octet-stream', Authorization: 'not-forwarded', 'X-Cutnote-Pairing': fixtureSecret, 'oai-authenticated-user-id': 'not-forwarded'}, body: bytes});
    assert.equal(result.status, 200);
    const received = JSON.parse(result.body);
    assert.equal(received.method, 'PATCH');
    assert.equal(received.url, '/api/clips/clip1?source=a%2Fb&n=2');
    assert.equal(received.body, bytes.toString('base64'));
    assert.match(received.headers.origin, /^http:\/\/127\.0\.0\.1:/);
    for (const name of ['cookie', 'authorization', 'x-cutnote-pairing', 'oai-authenticated-user-id']) assert.equal(received.headers[name], undefined);
    assert.ok(result.headers['set-cookie'].every(v => !v.includes('upstream-secret')));
    const partial = await f.request('/api/media/clip1?poster=1', {headers: {Cookie, Range: 'bytes=2-4'}});
    assert.equal(partial.status, 206); assert.equal(partial.body, 'cde'); assert.equal(partial.headers['content-range'], 'bytes 2-4/6');
    const redirected = await f.request('/mobile?redirect=1', {headers: {Cookie}});
    assert.equal(redirected.status, 302); assert.equal(redirected.headers.location, '/mobile?url=next'); assert.equal(redirected.headers['set-cookie'], undefined);
    assert.equal((await f.request('/mobile?external=1', {headers: {Cookie}})).status, 502);
  } finally { await f.close(); }
});

test('request sizes, chunked bodies and timeouts are bounded', async () => {
  const f = await fixture({maxBytes: 1024, timeout: 150});
  try {
    const Cookie = await f.pair();
    assert.equal((await f.request('/api/clips', {method: 'POST', headers: {Cookie, 'Content-Length': '1025'}, body: Buffer.alloc(1025)})).status, 413);
    assert.equal((await f.request('/api/clips', {method: 'POST', headers: {Cookie}, chunks: [Buffer.alloc(800), Buffer.alloc(800)]})).status, 413);
    assert.equal((await f.request('/mobile?slow=1', {headers: {Cookie}})).status, 504);
  } finally { await f.close(); }
});

test('authenticated requests always identify the LAN client; supplied identity never enables key changes', async () => {
  const f = await fixture();
  try {
    const Cookie = await f.pair();
    assert.equal(f.seen[0].headers['x-cutnote-client'], 'lan');
    for (const supplied of [undefined, 'pc', 'here', 'lan, pc']) {
      const headers = {Cookie};
      if (supplied !== undefined) headers['X-Cutnote-Client'] = supplied;
      const result = await f.request('/api/ai/status', {headers});
      assert.equal(result.status, 200);
      assert.equal(JSON.parse(result.body).headers['x-cutnote-client'], 'lan');
    }
    const count = f.seen.length;
    assert.equal((await f.request('/api/ai/status', {headers: {'X-Cutnote-Client': 'pc'}})).status, 401);
    assert.equal((await f.request('/api/ai/connect', {method: 'POST', headers: {Cookie, 'X-Cutnote-Client': 'pc', 'Content-Type': 'application/json'}, body: '{}'})).status, 403);
    assert.equal(f.seen.length, count);
  } finally { await f.close(); }
});

test('media route methods and ID lengths are restricted; binary MP4/WebM headers are preserved', async () => {
  assert.equal(MAX_BYTES, 28 * 1024 * 1024);
  for (const method of ['GET', 'HEAD', 'POST']) {
    assert.equal(allowedPath('/api/media/clip_1-a', method, projectRoot), true);
    assert.equal(allowedPath('/api/segment-media/clip_1-a/segment_2-b', method, projectRoot), true);
  }
  for (const method of ['GET', 'HEAD']) assert.equal(allowedPath('/api/segment-media/clip_1-a', method, projectRoot), true);
  for (const method of ['POST', 'PATCH', 'DELETE']) assert.equal(allowedPath('/api/segment-media/clip_1-a', method, projectRoot), false);
  for (const route of ['/api/media/' + 'a'.repeat(65), '/api/segment-media/' + 'a'.repeat(65), '/api/segment-media/a/' + 'b'.repeat(65), '/api/segment-media/a/b/extra']) assert.equal(allowedPath(route, 'GET', projectRoot), false);
  assert.equal(allowedPath('/api/media/' + 'a'.repeat(64), 'POST', projectRoot), true);
  assert.equal(allowedPath('/api/segment-media/a/b', 'DELETE', projectRoot), false);
  assert.equal(allowedPath('/api/media/a', 'PATCH', projectRoot), false);
  const f = await fixture();
  try {
    const Cookie = await f.pair();
    const bytes = Buffer.from([0, 255, 128, 13, 10, 65]);
    for (const [route, extension] of [['/api/media/clip1?download=1', 'mp4'], ['/api/segment-media/clip1/segment1?download=1&v=abc', 'webm']]) {
      const downloaded = await f.request(route, {headers: {Cookie}});
      assert.equal(downloaded.status, 200);
      assert.deepEqual(downloaded.bodyBytes, bytes);
      assert.equal(downloaded.headers['content-type'], `video/${extension}`);
      assert.equal(downloaded.headers['content-length'], String(bytes.length));
      assert.match(downloaded.headers['content-disposition'], new RegExp(`attachment; filename="cutnote\\.${extension}"; filename\\*=UTF-8''`));
      const head = await f.request(route, {method: 'HEAD', headers: {Cookie}});
      assert.equal(head.status, 200); assert.equal(head.body, ''); assert.equal(head.headers['content-length'], String(bytes.length));
    }
    for (const route of ['/api/media/clip1', '/api/segment-media/clip1/segment1']) {
      const uploaded = await f.request(route, {method: 'POST', headers: {Cookie, Origin: publicOrigin, 'Content-Type': 'application/octet-stream'}, body: bytes});
      assert.equal(uploaded.status, 200); assert.equal(JSON.parse(uploaded.body).body, bytes.toString('base64'));
    }
    assert.equal((await f.request('/api/segment-media/clip1', {headers: {Cookie}})).status, 200);
    assert.equal((await f.request('/api/segment-media/clip1', {method: 'POST', headers: {Cookie}})).status, 403);
  } finally { await f.close(); }
});

test('image search permits only authenticated same-origin POST and keeps key management blocked', async () => {
  const route = '/api/ai/image-query';
  const f = await fixture();
  try {
    assert.equal((await f.request(route, {method: 'POST', body: '{}'})).status, 401);
    assert.equal(f.seen.length, 0);
    const Cookie = await f.pair();
    const body = JSON.stringify({image: 'data:image/png;base64,dGVzdA=='});
    const result = await f.request(route, {method: 'POST', headers: {Cookie, Origin: publicOrigin, 'Content-Type': 'application/json'}, body});
    assert.equal(result.status, 200);
    const received = JSON.parse(result.body);
    assert.equal(received.method, 'POST');
    assert.equal(received.url, route);
    assert.equal(Buffer.from(received.body, 'base64').toString(), body);
    assert.equal(received.headers['x-cutnote-client'], 'lan');
    const count = f.seen.length;
    for (const method of ['GET', 'HEAD', 'PATCH', 'DELETE']) {
      assert.equal(allowedPath(route, method, projectRoot), false);
      assert.equal((await f.request(route, {method, headers: {Cookie}})).status, 403);
    }
    for (const path of [route + '/extra', '/api/ai/connect']) assert.equal((await f.request(path, {method: 'POST', headers: {Cookie}, body: '{}'})).status, 403);
    assert.equal((await f.request(route, {method: 'POST', headers: {Cookie, Origin: 'https://attacker.example'}, body: '{}'})).status, 403);
    assert.equal(f.seen.length, count);
  } finally { await f.close(); }
});

test('effect search and recommendation feedback use exact authenticated routes and restricted methods', async () => {
  const routes = new Map([['/api/ai/effect-query', ['POST']], ['/api/recommendations/feedback', ['GET', 'POST']]]);
  const f = await fixture();
  try {
    for (const [route, methods] of routes) for (const method of methods) assert.equal((await f.request(route, {method})).status, 401);
    assert.equal(f.seen.length, 0);
    const Cookie = await f.pair();
    for (const [route, methods] of routes) {
      for (const method of methods) {
        const body = method === 'POST' ? JSON.stringify({query: 'fixture effect', rating: 'helpful'}) : undefined;
        const result = await f.request(route, {method, headers: {Cookie, Origin: publicOrigin, 'Content-Type': 'application/json'}, body});
        assert.equal(result.status, 200);
        const received = JSON.parse(result.body);
        assert.equal(received.url, route);
        assert.equal(received.method, method);
        assert.equal(Buffer.from(received.body, 'base64').toString(), body || '');
        assert.equal(received.headers['x-cutnote-client'], 'lan');
      }
      const count = f.seen.length;
      for (const method of ['GET', 'HEAD', 'POST', 'PATCH', 'DELETE'].filter(value => !methods.includes(value))) {
        assert.equal(allowedPath(route, method, projectRoot), false);
        assert.equal((await f.request(route, {method, headers: {Cookie}})).status, 403);
      }
      for (const suffix of ['/', '/extra', '-other']) assert.equal((await f.request(route + suffix, {method: 'POST', headers: {Cookie}, body: '{}'})).status, 403);
      assert.equal((await f.request(route, {method: 'POST', headers: {Cookie, Origin: 'https://attacker.example'}, body: '{}'})).status, 403);
      assert.equal(f.seen.length, count);
    }
    assert.equal((await f.request('/api/ai/connect', {method: 'POST', headers: {Cookie}, body: '{}'})).status, 403);
  } finally { await f.close(); }
});


test('external YouTube recommendations permit only exact authenticated POST', async () => {
  const route = '/api/recommendations/youtube';
  const f = await fixture();
  try {
    assert.equal((await f.request(route, {method: 'POST', body: '{}'})).status, 401);
    assert.equal(f.seen.length, 0);
    const Cookie = await f.pair();
    const body = JSON.stringify({query: 'fixture video effect'});
    const result = await f.request(route, {method: 'POST', headers: {Cookie, Origin: publicOrigin, 'Content-Type': 'application/json'}, body});
    assert.equal(result.status, 200);
    const received = JSON.parse(result.body);
    assert.equal(received.url, route);
    assert.equal(received.method, 'POST');
    assert.equal(Buffer.from(received.body, 'base64').toString(), body);
    assert.equal(received.headers['x-cutnote-client'], 'lan');
    const count = f.seen.length;
    for (const method of ['GET', 'HEAD', 'PATCH', 'DELETE']) {
      assert.equal(allowedPath(route, method, projectRoot), false);
      assert.equal((await f.request(route, {method, headers: {Cookie}})).status, 403);
    }
    for (const suffix of ['/', '/extra', '-other']) assert.equal((await f.request(route + suffix, {method: 'POST', headers: {Cookie}, body: '{}'})).status, 403);
    assert.equal((await f.request(route, {method: 'POST', headers: {Cookie, Origin: 'https://attacker.example'}, body: '{}'})).status, 403);
    assert.equal((await f.request('/api/ai/connect', {method: 'POST', headers: {Cookie}, body: '{}'})).status, 403);
    assert.equal(f.seen.length, count);
  } finally { await f.close(); }
});

const htmlNavigation = {Accept: 'text/html,application/xhtml+xml', 'Sec-Fetch-Mode': 'navigate', 'Sec-Fetch-Dest': 'document'};
const pairingFormHeaders = {Origin: publicOrigin, 'Content-Type': 'application/x-www-form-urlencoded'};
const pairingBody = (code = fixtureSecret, next = '/') => new URLSearchParams({code, next}).toString();

function assertEmptyPairingForm(result, status) {
  assert.equal(result.status, status);
  assert.match(result.headers['content-type'], /^text\/html(?:;|$)/i);
  assert.equal(result.headers['cache-control'], 'no-store');
  assert.equal(result.headers['referrer-policy'], 'same-origin');
  assert.equal(result.headers['x-frame-options'], 'DENY');
  assert.match(result.headers['content-security-policy'], /default-src 'none'/);
  assert.match(result.headers['content-security-policy'], /form-action 'self'/);
  assert.match(result.headers['content-security-policy'], /frame-ancestors 'none'/);
  const nonce = /style-src 'nonce-([^']+)'/.exec(result.headers['content-security-policy']);
  assert.ok(nonce, 'inline CSS is allowed only by the response nonce');
  assert.ok(result.body.includes(`<style nonce="${nonce[1]}">`));
  assert.match(result.body, /<form\b[^>]*\baction=["']\/pair["']/i);
  const passwords = result.body.match(/<input\b[^>]*\btype=["']password["'][^>]*>/gi) || [];
  assert.equal(passwords.length, 1);
  assert.match(passwords[0], /\bname=["']code["']/i);
  assert.ok(!/\bvalue\s*=\s*(?:["'][^"']+|[^\s"'>][^\s>]*)/i.test(passwords[0]), 'password input must be empty');
  assert.ok(!result.body.includes(fixtureSecret));
  assert.equal(result.headers['set-cookie'], undefined);
}

test('anonymous browser navigation gets a pairing form only on root and mobile', async () => {
  const f = await fixture();
  try {
    for (const route of ['/', '/mobile', '/mobile?url=https%3A%2F%2Fyoutu.be%2Ffixture']) {
      assertEmptyPairingForm(await f.request(route, {headers: htmlNavigation}), 200);
    }
    for (const route of ['/api/clips', '/api/ai/status', '/api/library/order', '/@vite/client', '/mobile/extra']) {
      const response = await f.request(route, {headers: htmlNavigation});
      assert.equal(response.status, 401);
      assert.equal(response.headers['x-cutnote-connection'], 'required');
      assert.equal(response.headers['set-cookie'], undefined);
    }
    assert.equal((await f.request('/pair', {headers: htmlNavigation})).status, 405);
    for (const route of ['/', '/mobile']) {
      for (const pairing of ['wrong', '']) {
        const response = await f.request(route, {headers: {...htmlNavigation, 'X-Cutnote-Pairing': pairing}});
        assert.equal(response.status, 401);
        assert.equal(response.headers['x-cutnote-connection'], 'required');
        assert.equal(response.headers['set-cookie'], undefined);
      }
      assert.equal((await f.request(route, {method: 'HEAD', headers: htmlNavigation})).status, 401);
      assert.equal((await f.request(route, {headers: {Accept: 'application/json'}})).status, 401);
    }
    assert.equal(f.seen.length, 0);
  } finally { await f.close(); }
});

test('browser pairing redirects with a private session cookie and clamps return destinations', async () => {
  const f = await fixture();
  try {
    for (const [next, expected] of [['/', '/'], ['/mobile', '/mobile'], ['https://attacker.example/', '/'], ['//attacker.example/', '/'], ['/api/ai/connect', '/'], ['/mobile?start=analyze', '/']]) {
      const paired = await f.request('/pair', {method: 'POST', headers: pairingFormHeaders, body: pairingBody(fixtureSecret, next)});
      assert.equal(paired.status, 303);
      assert.equal(paired.headers.location, expected);
      assert.equal(paired.headers['set-cookie'].length, 1);
      const cookie = paired.headers['set-cookie'][0];
      assert.match(cookie, /^cutnote_lan_session=[A-Za-z0-9_-]+; HttpOnly; SameSite=Strict; Path=\//);
      assert.ok(!cookie.includes(fixtureSecret));
      assert.ok(!paired.body.includes(fixtureSecret));
      const result = await f.request('/api/clips', {headers: {Cookie: cookie.split(';')[0]}});
      assert.equal(result.status, 200);
      assert.equal(JSON.parse(result.body).headers['x-cutnote-client'], 'lan');
    }
    assert.ok(f.seen.every(request => request.url === '/api/clips'), 'pairing form never reaches the upstream');
  } finally { await f.close(); }
});

test('incorrect browser pairing never echoes the code or issues a session', async () => {
  const f = await fixture();
  try {
    for (const code of ['wrong-fixture-code', '', '"><script>alert(1)</script>']) {
      const result = await f.request('/pair', {method: 'POST', headers: pairingFormHeaders, body: pairingBody(code, '/mobile')});
      assertEmptyPairingForm(result, 401);
      if (code) assert.ok(!result.body.includes(code));
      assert.equal(result.headers.location, undefined);
    }
    assert.equal(f.seen.length, 0);
  } finally { await f.close(); }
});

test('browser pairing requires the exact local endpoint, matching Origin and form content type', async () => {
  const f = await fixture();
  try {
    for (const Origin of [undefined, 'https://attacker.example', 'null']) {
      const headers = {'Content-Type': 'application/x-www-form-urlencoded'};
      if (Origin !== undefined) headers.Origin = Origin;
      const result = await f.request('/pair', {method: 'POST', headers, body: pairingBody()});
      assert.equal(result.status, 403);
      assert.equal(result.headers['set-cookie'], undefined);
    }
    for (const type of [undefined, 'application/json', 'text/plain', 'multipart/form-data; boundary=fixture']) {
      const headers = {Origin: publicOrigin};
      if (type !== undefined) headers['Content-Type'] = type;
      const result = await f.request('/pair', {method: 'POST', headers, body: pairingBody()});
      assert.equal(result.status, 415);
      assert.equal(result.headers['set-cookie'], undefined);
    }
    for (const route of ['/pair/', '/pair/extra']) {
      const result = await f.request(route, {method: 'POST', headers: pairingFormHeaders, body: pairingBody()});
      assert.equal(result.status, 401);
      assert.equal(result.headers['set-cookie'], undefined);
    }
    const query = await f.request('/pair?extra=1', {method: 'POST', headers: pairingFormHeaders, body: pairingBody()});
    assert.equal(query.status, 400);
    assert.equal(query.headers['set-cookie'], undefined);
    assert.equal(f.seen.length, 0);
  } finally { await f.close(); }
});

test('browser pairing limits fixed and chunked form bodies to 1024 bytes and times out incomplete bodies', async () => {
  const f = await fixture({timeout: 120});
  try {
    const prefix = new URLSearchParams({code: fixtureSecret}).toString() + '&next=';
    const exactBody = prefix + 'x'.repeat(1024 - Buffer.byteLength(prefix));
    assert.equal(Buffer.byteLength(exactBody), 1024);
    assert.equal((await f.request('/pair', {method: 'POST', headers: {...pairingFormHeaders, 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'}, body: exactBody})).status, 303);
    for (const options of [{headers: {...pairingFormHeaders, 'Content-Length': '1025'}, body: 'x'.repeat(1025)}, {headers: pairingFormHeaders, chunks: ['x'.repeat(600), 'x'.repeat(425)]}]) {
      const result = await f.request('/pair', {method: 'POST', ...options});
      assert.equal(result.status, 413);
      assert.equal(result.headers['set-cookie'], undefined);
    }
    const incomplete = await f.request('/pair', {method: 'POST', headers: {...pairingFormHeaders, 'Content-Length': '100'}, body: 'code=', holdOpen: true});
    assert.equal(incomplete.status, 408);
    assert.equal(incomplete.headers['set-cookie'], undefined);
    assert.equal(f.seen.length, 0);
  } finally { await f.close(); }
});

test('browser pairing rate limit uses the socket IP and cannot be bypassed with forwarded headers', async () => {
  const f = await fixture();
  try {
    for (let attempt = 0; attempt < 8; attempt++) {
      const result = await f.request('/pair', {method: 'POST', headers: {...pairingFormHeaders, 'X-Forwarded-For': `192.168.1.${attempt + 1}`, Forwarded: `for=192.168.2.${attempt + 1}`, 'X-Real-IP': `192.168.3.${attempt + 1}`}, body: pairingBody('wrong')});
      assert.equal(result.status, 401);
      assert.equal(result.headers['set-cookie'], undefined);
    }
    for (const code of [fixtureSecret, 'wrong']) {
      const result = await f.request('/pair', {method: 'POST', headers: {...pairingFormHeaders, 'X-Forwarded-For': '10.0.0.123'}, body: pairingBody(code)});
      assert.equal(result.status, 429);
      assert.match(result.headers['retry-after'], /^\d+$/);
      assert.ok(Number(result.headers['retry-after']) > 0 && Number(result.headers['retry-after']) <= 60);
      assert.equal(result.headers['set-cookie'], undefined);
    }
    assert.equal(f.seen.length, 0);
    const Cookie = await f.pair();
    assert.equal((await f.request('/api/clips', {headers: {Cookie}})).status, 200, 'native pairing is unaffected by browser form throttling');
  } finally { await f.close(); }
});

test('library ordering permits only the exact authenticated PATCH route and retains key and YouTube restrictions', async () => {
  const route = '/api/library/order';
  const f = await fixture();
  try {
    assert.equal((await f.request(route, {method: 'PATCH', headers: {Origin: publicOrigin, 'Content-Type': 'application/json'}, body: '{}'})).status, 401);
    assert.equal(f.seen.length, 0);
    const Cookie = await f.pair();
    const body = JSON.stringify({ids: ['clip-fixture-2', 'clip-fixture-1']});
    const result = await f.request(route, {method: 'PATCH', headers: {Cookie, Origin: publicOrigin, 'Content-Type': 'application/json'}, body});
    assert.equal(allowedPath(route, 'PATCH', projectRoot), true);
    assert.equal(result.status, 200);
    const received = JSON.parse(result.body);
    assert.equal(received.url, route);
    assert.equal(received.method, 'PATCH');
    assert.equal(Buffer.from(received.body, 'base64').toString(), body);
    assert.equal(received.headers['x-cutnote-client'], 'lan');
    const count = f.seen.length;
    for (const method of ['GET', 'HEAD', 'POST', 'DELETE']) {
      assert.equal(allowedPath(route, method, projectRoot), false);
      assert.equal((await f.request(route, {method, headers: {Cookie}})).status, 403);
    }
    for (const suffix of ['/', '/extra', '-other']) assert.equal((await f.request(route + suffix, {method: 'PATCH', headers: {Cookie}, body})).status, 403);
    assert.equal((await f.request(route, {method: 'PATCH', headers: {Cookie, Origin: 'https://attacker.example'}, body})).status, 403);
    assert.equal((await f.request('/api/ai/connect', {method: 'POST', headers: {Cookie}, body: '{}'})).status, 403);
    assert.equal((await f.request('/api/recommendations/youtube', {method: 'GET', headers: {Cookie}})).status, 403);
    assert.equal(f.seen.length, count);
    assert.equal((await f.request('/api/recommendations/youtube', {method: 'POST', headers: {Cookie, Origin: publicOrigin, 'Content-Type': 'application/json'}, body: '{}'})).status, 200);
  } finally { await f.close(); }
});

// Project discovery must follow the relocated apps layout, not archived copies.
test('project discovery finds apps/web from Android bridge and repository root', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'cutnote-layout-'));
  try {
    const web = path.join(root, 'apps', 'web');
    const bridge = path.join(root, 'apps', 'android', 'bridge');
    await mkdir(web, {recursive: true});
    await mkdir(bridge, {recursive: true});
    await writeFile(path.join(web, 'package.json'), '{}');
    assert.equal(findProject(bridge), web);
    assert.equal(findProject(root), web);
  } finally { await rm(root, {recursive: true, force: true}); }
});
