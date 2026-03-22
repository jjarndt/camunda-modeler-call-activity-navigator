import { describe, test } from 'node:test';
import assert from 'node:assert/strict';

import { isNewerVersion, checkForUpdate } from '../client/update-check.mjs';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function setupGlobals({ fetchResponse, localStorage: storageData } = {}) {
  const storage = new Map(Object.entries(storageData || {}));
  globalThis.localStorage = {
    getItem: (k) => storage.get(k) ?? null,
    setItem: (k, v) => storage.set(k, v)
  };
  globalThis.fetch = async () => fetchResponse;
  return storage;
}

function teardownGlobals() {
  delete globalThis.localStorage;
  delete globalThis.fetch;
}

function fakeRelease(tagName, url = 'https://github.com/jjarndt/camunda-modeler-call-activity-navigator/releases/tag/v2.0.0') {
  return {
    ok: true,
    json: async () => ({ tag_name: tagName, html_url: url })
  };
}

// ---------------------------------------------------------------------------
// isNewerVersion
// ---------------------------------------------------------------------------

describe('isNewerVersion', () => {
  test('returns true when latest has a higher major version', () => {
    assert.equal(isNewerVersion('1.0.0', '2.0.0'), true);
  });

  test('returns true when latest has a higher minor version', () => {
    assert.equal(isNewerVersion('1.2.0', '1.3.0'), true);
  });

  test('returns true when latest has a higher patch version', () => {
    assert.equal(isNewerVersion('1.2.1', '1.2.2'), true);
  });

  test('returns false when versions are equal', () => {
    assert.equal(isNewerVersion('1.2.1', '1.2.1'), false);
  });

  test('returns false when current is newer', () => {
    assert.equal(isNewerVersion('2.0.0', '1.9.9'), false);
  });

  test('treats missing patch segment as zero', () => {
    assert.equal(isNewerVersion('1.0', '1.0.1'), true);
  });

  test('strips pre-release suffix before comparing', () => {
    assert.equal(isNewerVersion('1.2.3-beta.1', '1.2.4'), true);
  });

  test('ignores pre-release suffix on both sides (compares only numeric parts)', () => {
    assert.equal(isNewerVersion('1.2.3-rc.1', '1.2.3-rc.2'), false);
  });
});

// ---------------------------------------------------------------------------
// checkForUpdate
// ---------------------------------------------------------------------------

describe('checkForUpdate', () => {

  // -- update availability --------------------------------------------------

  describe('update availability', () => {
    test('returns available when a newer version exists', async (t) => {
      t.after(teardownGlobals);
      setupGlobals({ fetchResponse: fakeRelease('v2.0.0') });

      const result = await checkForUpdate('1.0.0');

      assert.deepEqual(result, {
        available: true,
        latest: '2.0.0',
        url: 'https://github.com/jjarndt/camunda-modeler-call-activity-navigator/releases/tag/v2.0.0'
      });
    });

    test('returns not available when already on the latest version', async (t) => {
      t.after(teardownGlobals);
      setupGlobals({ fetchResponse: fakeRelease('v1.2.1') });

      const result = await checkForUpdate('1.2.1');

      assert.deepEqual(result, { available: false });
    });

    test('strips the "v" prefix from tag_name', async (t) => {
      t.after(teardownGlobals);
      setupGlobals({ fetchResponse: fakeRelease('v5.1.0') });

      const result = await checkForUpdate('1.0.0');

      assert.equal(result.latest, '5.1.0');
    });
  });

  // -- throttling -----------------------------------------------------------

  describe('throttling', () => {
    test('skips fetch when last check was within the past day', async (t) => {
      t.after(teardownGlobals);
      let fetchCalled = false;
      setupGlobals({
        fetchResponse: fakeRelease('v9.0.0'),
        localStorage: { 'callActivityNavigator.lastUpdateCheck': String(Date.now()) }
      });
      const origFetch = globalThis.fetch;
      globalThis.fetch = async () => { fetchCalled = true; return origFetch(); };

      const result = await checkForUpdate('1.0.0');

      assert.deepEqual(result, { available: false });
      assert.equal(fetchCalled, false);
    });

    test('fetches when the last check was over a day ago', async (t) => {
      t.after(teardownGlobals);
      let fetchCalled = false;
      const oneDayAgo = Date.now() - 25 * 60 * 60 * 1000;
      setupGlobals({
        fetchResponse: fakeRelease('v3.0.0'),
        localStorage: { 'callActivityNavigator.lastUpdateCheck': String(oneDayAgo) }
      });
      const origFetch = globalThis.fetch;
      globalThis.fetch = async () => { fetchCalled = true; return origFetch(); };

      const result = await checkForUpdate('1.0.0');

      assert.equal(fetchCalled, true);
      assert.equal(result.available, true);
    });

    test('stores the current timestamp in localStorage after a check', async (t) => {
      t.after(teardownGlobals);
      const storage = setupGlobals({ fetchResponse: fakeRelease('v1.0.0') });

      await checkForUpdate('1.0.0');

      const stored = storage.get('callActivityNavigator.lastUpdateCheck');
      assert.ok(stored);
      assert.ok(Math.abs(Date.now() - Number(stored)) < 5000);
    });
  });

  // -- error handling -------------------------------------------------------

  describe('error handling', () => {
    test('returns not available on HTTP error response', async (t) => {
      t.after(teardownGlobals);
      setupGlobals({ fetchResponse: { ok: false } });

      const result = await checkForUpdate('1.0.0');

      assert.deepEqual(result, { available: false });
    });

    test('returns not available on network exception', async (t) => {
      t.after(teardownGlobals);
      globalThis.localStorage = { getItem: () => null, setItem: () => {} };
      globalThis.fetch = async () => { throw new Error('network down'); };

      const result = await checkForUpdate('1.0.0');

      assert.deepEqual(result, { available: false });
    });

    test('returns not available when JSON parsing fails', async (t) => {
      t.after(teardownGlobals);
      setupGlobals({
        fetchResponse: {
          ok: true,
          json: async () => { throw new SyntaxError('Unexpected token'); }
        }
      });

      const result = await checkForUpdate('1.0.0');

      assert.deepEqual(result, { available: false });
    });
  });

  // -- malformed response data ----------------------------------------------

  describe('malformed response data', () => {
    test('returns not available when tag_name is an empty string', async (t) => {
      t.after(teardownGlobals);
      setupGlobals({
        fetchResponse: {
          ok: true,
          json: async () => ({ tag_name: '', html_url: 'https://example.com' })
        }
      });

      const result = await checkForUpdate('1.0.0');

      assert.deepEqual(result, { available: false });
    });

    test('returns not available when tag_name is missing', async (t) => {
      t.after(teardownGlobals);
      setupGlobals({
        fetchResponse: {
          ok: true,
          json: async () => ({ html_url: 'https://example.com' })
        }
      });

      const result = await checkForUpdate('1.0.0');

      assert.deepEqual(result, { available: false });
    });
  });
});
