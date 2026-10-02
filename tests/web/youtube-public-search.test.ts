import assert from 'node:assert/strict';
import {parseYouTubeSearch, publicYouTubeQueries, publicYouTubeCandidates} from '../../apps/web/lib/ai/youtube-public-search';
import type {DiscoveryProfile} from '../../apps/web/features/discovery/discovery-profile';

// Entirely synthetic YouTube renderer-shaped data. No captured page, account,
// title, saved clip, API result, or network fixture is needed by these tests.
const ids = {saved: 'abcdefghijk', watch: 'lmnopqrstuv', short: '0123456789_', short2: '_9876543210', explore: 'ABCDEFGHIJK', exploreShort: 'LMNOPQRSTUV'};
const endpoint = (id: string, shorts = false) => ({
  ...(shorts ? {reelWatchEndpoint: {videoId: id}} : {watchEndpoint: {videoId: id}}),
  commandMetadata: {webCommandMetadata: {url: shorts ? '/shorts/' + id : '/watch?v=' + id}},
});
const watch = (id: string, title = 'Synthetic editing example') => ({videoRenderer: {videoId: id, title: {runs: [{text: title}]}, navigationEndpoint: endpoint(id)}});
const shorts = (id: string, title = 'Synthetic animation tutorial') => ({shortsLockupViewModel: {overlayMetadata: {primaryText: {content: title}}, onTap: {innertubeCommand: endpoint(id, true)}}});
const legacyReel = (id: string) => ({reelItemRenderer: {videoId: id, title: {simpleText: 'Synthetic reel'}, navigationEndpoint: endpoint(id, true)}});
const html = (items: unknown[]) => '<script>var ytInitialData = ' + JSON.stringify({contents: {twoColumnSearchResultsRenderer: {primaryContents: {sectionListRenderer: {contents: [{itemSectionRenderer: {contents: items}}]}}}}}) + ';</script>';

const parsed = parseYouTubeSearch(html([watch(ids.watch, 'Title with { braces } and "quoted" text'), shorts(ids.short)]));
assert.equal(parsed.length, 2);
assert.equal(parsed[0].shorts, false);
assert.equal(parsed[1].url, 'https://www.youtube.com/shorts/' + ids.short);
assert.equal(parseYouTubeSearch(html([watch(ids.watch, '#shorts 15 seconds')]))[0].shorts, false, 'A title or duration does not prove Shorts identity');
assert.deepEqual(parseYouTubeSearch(html([watch(ids.short), shorts(ids.short)])).map(x => x.shorts), [true], 'Duplicate ID retains its real Shorts endpoint');
assert.equal(parseYouTubeSearch(html([legacyReel(ids.short)]))[0].shorts, true);

const mismatch = shorts(ids.short);
mismatch.shortsLockupViewModel.onTap.innertubeCommand.commandMetadata.webCommandMetadata.url = '/shorts/' + ids.watch;
const external = shorts(ids.short);
external.shortsLockupViewModel.onTap.innertubeCommand.commandMetadata.webCommandMetadata.url = 'https://example.invalid/shorts/' + ids.short;
assert.equal(parseYouTubeSearch(html([mismatch, external, shorts('invalid')])).length, 0);
assert.equal(parseYouTubeSearch(html([{promotedSparklesWebRenderer: watch(ids.saved)}, {adSlotRenderer: shorts(ids.saved)}, watch(ids.watch)])).length, 1);
assert.throws(() => parseYouTubeSearch('<html>no initial JSON</html>'));
assert.throws(() => parseYouTubeSearch('<script>var ytInitialData = {broken;</script>'));
assert.throws(() => parseYouTubeSearch('x'.repeat(2 * 1024 * 1024 + 1)));

const profile: DiscoveryProfile = {
  version: 'synthetic-v1', sourceCount: 1,
  tags: [{id: 'visual_style.digital_glitch', label: 'glitch', weight: 1}, {id: 'shot_type.close_up', label: 'close up', weight: 0.5}, {id: 'color.blue', label: 'blue', weight: 0.2}],
  savedYouTubeIds: [ids.saved], explore: ['paper cutout animation'],
};
const queries = publicYouTubeQueries(profile, 'all');
assert(queries.length > 0 && queries.length <= 3);
assert.equal(queries.filter(q => q.group === 'similar').length, 2);
assert(queries.some(q => q.group === 'explore'));
assert(publicYouTubeQueries(profile, 'shorts').every(q => /\bshorts\b/i.test(q.query)));
assert(queries.every(q => !/glitch.*close up.*blue/.test(q.query)), 'Do not require every profile feature in a single query');

const previousFetch = globalThis.fetch;
let active = 0, maxActive = 0, calls = 0;
const pages = [
  html([watch(ids.saved), watch(ids.watch), shorts(ids.short)]),
  html([watch(ids.watch), shorts(ids.short2)]),
  html([watch(ids.explore), shorts(ids.exploreShort)]),
];
globalThis.fetch = async (input, init) => {
  const url = new URL(String(input));
  assert.equal(url.origin, 'https://www.youtube.com');
  assert.equal(url.pathname, '/results');
  assert.equal(init?.redirect, 'manual');
  assert(init?.signal);
  const index = calls++;
  active++; maxActive = Math.max(maxActive, active);
  await Promise.resolve();
  active--;
  return new Response(pages[index % pages.length], {headers: {'content-type': 'text/html; charset=utf-8'}});
};
try {
  const candidates = await publicYouTubeCandidates(profile, 'all', new AbortController().signal);
  assert.equal(calls, queries.length);
  assert(maxActive <= 2);
  assert(!candidates.some(c => c.id === ids.saved));
  assert.equal(new Set(candidates.map(c => c.id)).size, candidates.length);
  assert(candidates.some(c => c.shorts) && candidates.some(c => !c.shorts));
  assert(candidates.some(c => c.group === 'explore'));
  assert(candidates.every(c => c.reason.includes('검색') && c.reason.includes('아직 분석하지')));
  assert.equal(candidates.find(c => c.id === ids.short)?.kind, 'tutorial');
  calls = 0;
  const shortCandidates = await publicYouTubeCandidates(profile, 'shorts', new AbortController().signal);
  assert(shortCandidates.length > 0 && shortCandidates.every(c => c.shorts && c.url.includes('/shorts/')));

  globalThis.fetch = async () => new Response('Synthetic access denial', {status: 403});
  await assert.rejects(publicYouTubeCandidates(profile, 'all', new AbortController().signal));
  globalThis.fetch = async () => new Response('<html></html>', {headers: {'content-type': 'application/json'}});
  await assert.rejects(publicYouTubeCandidates(profile, 'all', new AbortController().signal));
  const controller = new AbortController(); controller.abort();
  let afterAbort = 0;
  globalThis.fetch = async () => {afterAbort++; throw new Error('Should never fetch after cancellation');};
  await assert.rejects(publicYouTubeCandidates(profile, 'all', controller.signal));
  assert.equal(afterAbort, 0);
} finally {
  globalThis.fetch = previousFetch;
}
console.log('PASS: synthetic YouTube parser, actual Shorts endpoints, deduplication, saved exclusions, limited queries/concurrency, mocked fetch, rejection and cancellation.');
