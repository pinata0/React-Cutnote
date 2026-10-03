// Handoff-only helper: apply every migration to this checkout's LOCAL D1.
// Never connects to a remote database or imports the original owner's data.
import { readFileSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { projectRoot } from './sites-env.mjs';

const builtConfig = path.join(projectRoot, 'dist/server/wrangler.json');
let config;
try { config = JSON.parse(readFileSync(builtConfig, 'utf8')); }
catch { throw new Error('먼저 npm run taxonomy:generate && npm run build를 실행하세요.'); }
const binding = config.d1_databases?.find((entry) => entry.binding === 'DB');
if (!binding) throw new Error('빌드 설정에서 DB 바인딩을 찾지 못했습니다.');
const directory = mkdtempSync(path.join(tmpdir(), 'cutnote-local-migrations-'));
try {
  const localConfig = path.join(directory, 'wrangler.json');
  writeFileSync(localConfig, JSON.stringify({
    name: 'cutnote-local-migrations',
    compatibility_date: '2026-05-15',
    d1_databases: [{ ...binding, migrations_dir: path.join(projectRoot, 'drizzle') }],
  }));
  const result = spawnSync(process.execPath, [
    path.join(projectRoot, 'node_modules/wrangler/bin/wrangler.js'),
    'd1', 'migrations', 'apply', 'DB', '--local', '--config', localConfig,
    '--persist-to', process.env.CUTNOTE_STATE_DIR || path.join(projectRoot, '.wrangler/state'),
  ], { cwd: projectRoot, env: process.env, stdio: 'inherit' });
  if (result.error) throw result.error;
  process.exitCode = result.status ?? 1;
} finally { rmSync(directory, { recursive: true, force: true }); }
