import {createRequire, isBuiltin} from 'node:module';
import {mkdtemp, rm} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname, isAbsolute, join, resolve} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {spawnSync} from 'node:child_process';

// This runner never imports the original workspace, starts a server, or opens
// a persistent database. Every suite runs in its own process with fresh mocks.
const handoffRoot = fileURLToPath(new URL('../', import.meta.url));
const cutnoteRoot = join(handoffRoot, 'cutnote');
const testRoot = join(handoffRoot, 'tests', 'web');
const requireFromCutnote = createRequire(join(cutnoteRoot, 'package.json'));
const mockCloudflare = join(testRoot, 'mock-cloudflare.ts');
const suites = [
  'discovery-order-check.ts',
  'youtube-public-search-tests.ts',
  'segment-independent-review-tests.ts',
  'segment-tagging-current-review-tests.ts',
  'segment-retag-parser-review-tests.ts',
  'image-search-review-tests.ts',
  'recommendation-review-tests.ts',
  'segment-media-review-tests.ts',
  'favorites-review-tests.ts',
  'full-video-tests.ts',
  'sync-polling-tests.mjs',
];

const major = Number(process.versions.node.split('.')[0]);
const minor = Number(process.versions.node.split('.')[1]);
if (major < 22 || (major === 22 && minor < 13)) {
  throw new Error('Offline web tests require Node.js 22.13 or newer (node:sqlite).');
}
if (!existsSync(join(cutnoteRoot, 'node_modules', 'esbuild', 'package.json'))) {
  throw new Error('Install the handoff dependencies first: cd cutnote && npm ci');
}
const {build} = requireFromCutnote('esbuild');
const tempRoot = await mkdtemp(join(tmpdir(), 'cutnote-web-tests-'));
const failed = [];

// Do not forward provider credentials or a NODE_OPTIONS preload to child tests.
const childEnv = {NODE_ENV: 'test', TZ: 'UTC'};
for (const name of ['PATH', 'SystemRoot', 'WINDIR', 'TEMP', 'TMP', 'TMPDIR', 'LANG']) {
  if (process.env[name]) childEnv[name] = process.env[name];
}

const resolutionPlugin = {
  name: 'offline-cutnote-resolution',
  setup(builder) {
    builder.onResolve({filter: /^cloudflare:workers$/}, () => ({path: mockCloudflare}));
    builder.onResolve({filter: /.*/}, args => {
      if (isBuiltin(args.path)) return {path: args.path, external: true};
      // Let esbuild resolve relative TS imports and @/* via cutnote/tsconfig.json.
      if (args.path.startsWith('.') || args.path.startsWith('@/') || isAbsolute(args.path)) return;
      // Absolute external package entry paths keep npm resolution anchored to the
      // installed handoff copy, even though the generated bundle lives in /tmp.
      const localRequire = args.importer && isAbsolute(args.importer)
        ? createRequire(join(dirname(args.importer), '__offline_tests__.cjs'))
        : requireFromCutnote;
      try {
        return {path: pathToFileURL(localRequire.resolve(args.path)).href, external: true};
      } catch {
        return {path: pathToFileURL(requireFromCutnote.resolve(args.path)).href, external: true};
      }
    });
  },
};

try {
  for (const suite of suites) {
    console.log(`\n--- ${suite} ---`);
    const outfile = join(tempRoot, suite.replace(/\.(?:ts|mjs)$/, '.mjs'));
    try {
      await build({
        stdin: {
          contents: `
let blockedNetworkCalls = 0;
globalThis.fetch = async () => {
  blockedNetworkCalls++;
  throw new Error('Offline regression suite blocked fetch. Install an explicit test mock.');
};
await import(${JSON.stringify(resolve(testRoot, suite))});
if (blockedNetworkCalls !== 0) {
  throw new Error('Offline regression suite attempted unmocked fetch (' + blockedNetworkCalls + ').');
}
`,
          resolveDir: handoffRoot,
          sourcefile: `offline-${suite}.entry.mjs`,
          loader: 'js',
        },
        absWorkingDir: cutnoteRoot,
        tsconfig: join(cutnoteRoot, 'tsconfig.json'),
        outfile,
        bundle: true,
        platform: 'node',
        format: 'esm',
        target: 'node22',
        plugins: [resolutionPlugin],
        logLevel: 'warning',
      });
      const child = spawnSync(process.execPath, [outfile], {
        cwd: handoffRoot,
        env: childEnv,
        stdio: 'inherit',
        timeout: 120_000,
      });
      if (child.error) throw child.error;
      if (child.status !== 0) throw new Error(`Exited with ${child.signal || child.status}`);
    } catch (error) {
      failed.push(suite);
      console.error(`FAIL ${suite}: ${error.message}`);
    }
  }
} finally {
  // Only delete the temporary directory this process created.
  await rm(tempRoot, {recursive: true, force: true});
}

console.log(`\nOffline web suites: ${suites.length - failed.length}/${suites.length} passed.`);
if (failed.length) {
  console.error('Failed suites:', failed.join(', '));
  process.exitCode = 1;
}
