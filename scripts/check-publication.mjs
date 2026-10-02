import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import {knownSecrets, secretFindings} from './publication-secrets.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
function git(args) {
  const result = spawnSync('git', args, { cwd: root, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
  if (result.status !== 0) throw new Error('Git inspection failed; no file content was printed.');
  return result.stdout;
}

const indexOnly = process.argv.includes('--index');
const candidates = [...new Set(git(['ls-files', '--cached', ...(!indexOnly ? ['--others', '--exclude-standard'] : []), '-z']).split('\0').filter(Boolean))];
const values = knownSecrets(root);
const reviewedMedia = JSON.parse(indexOnly ? git(['show', ':scripts/reviewed-media.json']) : readFileSync(resolve(root, 'scripts/reviewed-media.json'), 'utf8'));
const failures = [];
const denyPath = /(?:^|\/)(?:__MACOSX|node_modules|\.git|\.wrangler|\.qa-state|\.sites-runtime|\.next|\.vinext|dist|coverage)(?:\/|$)|(?:^|\/)\._|\.(?:sqlite(?:3)?(?:-.*)?|db(?:-.*)?|keystore|jks|pem|key|p12|pfx|bak|backup|dump|log(?:\..*)?|har|apk|aab|idsig|zip|tgz|gz|7z|rar|cpgz)$/i;
const privateRoot = /^(?:docs_ext\/|example\/|main\/(?:work|outputs)\/|main\/handoff-package\/handoff-package\/|docs\/사전 멘토링 및 참가자 허브 이용 안내\.md$|\.security-checks\/)/;
for (const entry of git(['ls-files', '--stage', '-z']).split('\0')) {
  if (entry && !/^(?:100644|100755) /.test(entry)) failures.push('Unsupported index mode (nested checkout or symlink): ' + entry.split('\t')[1]);
}
let scannedText = 0;
let skippedBinary = 0;
for (const path of candidates) {
  const envName = /(?:^|\/)(?:\.env(?:\..*)?|\.dev\.vars(?:\..*)?)$/i.test(path);
  const example = path.endsWith('.example');
  if (denyPath.test(path) || privateRoot.test(path) || ['legacy/초기 아이디어 기획서.md', 'docs/Presentation.pdf'].includes(path) || (envName && !example)) {
    failures.push('Private/generated upload candidate: ' + path);
    continue;
  }
  const full = resolve(root, path);
  if (!indexOnly) {
    let stat;
    try { stat = statSync(full); } catch { continue; }
    if (!stat.isFile()) { failures.push('Nested checkout/directory candidate: ' + path); continue; }
  }
  const bytes = indexOnly ? spawnSync('git', ['show', ':' + path], {cwd: root, maxBuffer: 64 * 1024 * 1024}) : {status: 0, stdout: readFileSync(full)};
  if (bytes.status !== 0) { failures.push('Unreadable index blob: ' + path); continue; }
  const content = bytes.stdout;
  if ([...values].some(value => content.includes(Buffer.from(value)))) failures.push('Known secret copy (value withheld): ' + path);
  if (content.includes(0) || /\.(?:pdf|png|jpe?g|gif|webp|ico|woff2?|mp4)$/i.test(path)) {
    skippedBinary++;
    const hash = createHash('sha256').update(content).digest('hex');
    if (reviewedMedia[path]?.sha256 !== hash) failures.push('Unreviewed or changed binary: ' + path);
    continue;
  }
  const text = content.toString('utf8');
  scannedText++;
  for (const finding of secretFindings(text, values)) {
    if (!finding.startsWith('credential label') || /\.(?:md|txt|ya?ml|env)$/i.test(path)) failures.push(finding + ' (value withheld): ' + path);
  }
  if (envName && example) {
    const nonempty = text.split(/\r?\n/).some(line => /^\s*(?:export\s+)?[A-Za-z_][A-Za-z0-9_]*\s*=\s*\S/.test(line));
    if (nonempty) failures.push('Environment example must use empty placeholders: ' + path);
  }
}

// Validate the selected manifest: the real index may still contain the old layout
// while an unstaged move is being reviewed. Never mix index paths with disk paths.
const legacyIndex = indexOnly && !candidates.includes('apps/web/package-lock.json')
  && candidates.includes('main/handoff-package/cutnote/package-lock.json');
const webRoot = legacyIndex ? 'main/handoff-package/cutnote' : 'apps/web';
const environmentExample = legacyIndex ? 'main/handoff-package/.env.example' : 'apps/.env.example';
// Verify essential source is retained; never ignore every directory named build.
for (const path of [
  `${webRoot}/package-lock.json`,
  `${webRoot}/build/sites-worker.ts`,
  `${webRoot}/drizzle/0000_steady_wendell_rand.sql`,
  environmentExample,
]) {
  if (!indexOnly && !existsSync(resolve(root, path))) failures.push('Essential source missing: ' + path);
  if (!candidates.includes(path)) failures.push('Essential source absent from candidate manifest: ' + path);
  if (spawnSync('git', ['check-ignore', '-q', path], { cwd: root }).status === 0) {
    failures.push('Essential source unexpectedly ignored: ' + path);
  }
}

console.log(`Upload candidates: ${candidates.length}; scanned text: ${scannedText}; hash-pinned reviewed media: ${skippedBinary}; known local values: ${values.size}.`);
if (failures.length) {
  for (const failure of failures) console.error(failure);
  process.exitCode = 1;
} else {
  console.log('PASS: no blocked paths, nested Git links, nonempty environment examples or known secret patterns in current candidates.');
}
console.log('This checks the current index/worktree, not past commits, OCR or archive contents. It never stages or changes files.');
// Staged bytes can differ from the working tree. Inspect both without changing either.
if (!indexOnly && git(['ls-files', '--cached', '-z']).length) {
  const staged = spawnSync(process.execPath, [fileURLToPath(import.meta.url), '--index'], {cwd: root, stdio: 'inherit'});
  if (staged.status !== 0) process.exitCode = 1;
}
