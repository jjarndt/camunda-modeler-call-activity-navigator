/**
 * bug-perf-NEW-014: searchInKnownFiles now uses Schwartzian Transform
 *
 * Previously, normalizePath was called in the sort comparator O(N log N) times.
 * Now it's pre-computed once per file (Schwartzian Transform):
 *   .map(f => ({ f, dir: parentDir(normalizePath(f, '/')) }))
 *   .sort((a, b) => ...)
 *   .map(x => x.f)
 *
 * This test verifies the fix works correctly and search still returns proper results.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { NavigatorSearch } from '../client/navigator-search.mjs';
import { ProcessIndex } from '../client/process-index.mjs';

describe('BUG-PERF-NEW-014: Schwartzian Transform in searchInKnownFiles sort', () => {

  it('searchInKnownFiles with 1000 files completes within time limit', async () => {
    const N = 1000;
    const index = new ProcessIndex();
    const mockFS = {
      readFile: async (path) => {
        const match = path.match(/file-(\d+)/);
        const i = match ? Number(match[1]) : 0;
        return { contents: `<bpmn:process id="p${i}" isExecutable="true"/>` };
      }
    };

    const search = new NavigatorSearch({ fileSystem: mockFS, index });
    const knownFiles = Array.from({ length: N }, (_, i) => `/proj/dir${i % 10}/file-${i}.bpmn`);

    const start = Date.now();
    const result = await search.searchInKnownFiles('p500', '/proj/dir5/current.bpmn', knownFiles);
    const elapsed = Date.now() - start;

    assert.ok(result, 'Should find process p500');
    assert.ok(elapsed < 5000, `Search with ${N} files took ${elapsed}ms, limit 5000ms`);
  });

  it('sort comparator no longer calls normalizePath (verified by timing)', async () => {
    const N = 2000;
    const index = new ProcessIndex();
    for (let i = 0; i < N; i++) {
      index.setFileIndex(`/proj/dir${i % 20}/file-${i}.bpmn`, [`p${i}`]);
    }
    const mockFS = { readFile: async () => { throw new Error(); } };
    const search = new NavigatorSearch({ fileSystem: mockFS, index });
    const files = Array.from({ length: N }, (_, i) => `/proj/dir${i % 20}/file-${i}.bpmn`);

    // Warm up
    await search.searchInKnownFiles('NEVER_FOUND', '/proj/dir3/current.bpmn', files);

    const RUNS = 20;
    const start = Date.now();
    for (let r = 0; r < RUNS; r++) {
      await search.searchInKnownFiles(`NEVER_FOUND_${r}`, '/proj/dir3/current.bpmn', files);
    }
    const perRun = (Date.now() - start) / RUNS;

    assert.ok(perRun < 200,
      `Search with ${N} pre-indexed files averages ${perRun.toFixed(1)}ms per run, limit 200ms`);
  });
});
