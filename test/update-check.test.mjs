import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { isNewerVersion, isSafeUrl, checkForUpdate } from '../client/update-check.mjs';

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

  // -- basic comparison -----------------------------------------------------

  describe('basic comparison', () => {
    it('returns true when latest has a higher major version', () => {
      assert.equal(isNewerVersion('1.0.0', '2.0.0'), true);
    });

    it('returns true when latest has a higher minor version', () => {
      assert.equal(isNewerVersion('1.2.0', '1.3.0'), true);
    });

    it('returns true when latest has a higher patch version', () => {
      assert.equal(isNewerVersion('1.2.1', '1.2.2'), true);
    });

    it('returns false when versions are equal', () => {
      assert.equal(isNewerVersion('1.2.1', '1.2.1'), false);
    });

    it('returns false when current is newer', () => {
      assert.equal(isNewerVersion('2.0.0', '1.9.9'), false);
    });

    it('treats missing patch segment as zero', () => {
      assert.equal(isNewerVersion('1.0', '1.0.1'), true);
    });
  });

  // -- versions with fewer than 3 segments ----------------------------------

  describe('versions with fewer than 3 segments', () => {
    it('handles single-segment versions', () => {
      assert.strictEqual(isNewerVersion('1', '2'), true);
      assert.strictEqual(isNewerVersion('1', '1'), false);
      assert.strictEqual(isNewerVersion('2', '1.99.99'), false);
      assert.strictEqual(isNewerVersion('1.0.0', '1'), false);
    });

    it('handles two-segment versions', () => {
      assert.strictEqual(isNewerVersion('1.0', '1.1'), true);
    });
  });

  // -- large version jumps and zero versions --------------------------------

  describe('large version jumps and zero versions', () => {
    it('correctly handles large jumps and zero versions', () => {
      assert.strictEqual(isNewerVersion('0.0.1', '1.0.0'), true);
      assert.strictEqual(isNewerVersion('0.0.0', '0.0.1'), true);
      assert.strictEqual(isNewerVersion('99.99.99', '100.0.0'), true);
      assert.strictEqual(isNewerVersion('1.0.0', '0.99.99'), false);
      assert.strictEqual(isNewerVersion('0.0.0', '0.0.0'), false);
    });
  });

  // -- build metadata -------------------------------------------------------

  describe('build metadata', () => {
    it('strips build metadata (+build) before comparing', () => {
      assert.equal(isNewerVersion('1.2.3+build.123', '1.2.4+build.456'), true);
      assert.equal(isNewerVersion('1.2.3+build.123', '1.2.3+build.456'), false);
      assert.equal(isNewerVersion('2.0.0+metadata', '1.9.9+metadata'), false);
      assert.equal(isNewerVersion('1.0.0-beta+exp.sha', '1.0.1'), true);
    });

    it('does not treat build metadata (+) as pre-release', () => {
      assert.equal(isNewerVersion('1.0.0+build.123', '1.0.0'), false);
      assert.equal(isNewerVersion('1.0.0+20240101', '1.0.0'), false);
    });

    it('does not misclassify build metadata with dash as pre-release', () => {
      assert.equal(isNewerVersion('1.0.0+build-123', '1.0.0'), false);
      assert.equal(isNewerVersion('1.0.0+20231201-release', '1.0.0'), false);
      assert.equal(isNewerVersion('1.0.0+git-abcdef', '1.0.0'), false);
      assert.equal(isNewerVersion('1.0.0+build', '1.0.0'), false);
    });
  });

  // -- v-prefix handling ----------------------------------------------------

  describe('v-prefix handling', () => {
    it('handles v-prefix in currentVersion', () => {
      assert.strictEqual(isNewerVersion('v1.0.0', '2.0.0'), true);
    });

    it('works without v-prefix (control)', () => {
      assert.strictEqual(isNewerVersion('1.0.0', '2.0.0'), true);
    });

    it('handles uppercase V prefix in latest version', () => {
      assert.equal(isNewerVersion('1.1.0', 'V1.2.0'), true);
    });

    it('handles uppercase V prefix in current version', () => {
      assert.equal(isNewerVersion('V1.1.0', '1.2.0'), true);
    });
  });

  // -- null/undefined guards ------------------------------------------------

  describe('null/undefined guards', () => {
    it('does not throw when current version is null', () => {
      assert.doesNotThrow(() => isNewerVersion(null, '1.0.0'));
    });

    it('does not throw when current version is undefined', () => {
      assert.doesNotThrow(() => isNewerVersion(undefined, '1.0.0'));
    });

    it('does not throw when latest version is null', () => {
      assert.doesNotThrow(() => isNewerVersion('1.0.0', null));
    });

    it('does not throw when latest version is undefined', () => {
      assert.doesNotThrow(() => isNewerVersion('1.0.0', undefined));
    });

    it('does not throw when both versions are null', () => {
      assert.doesNotThrow(() => isNewerVersion(null, null));
    });
  });

  // -- NaN coercion and malformed input -------------------------------------

  describe('NaN coercion and malformed input', () => {
    it('returns false for empty current version string', () => {
      assert.equal(isNewerVersion('', '1.0.0'), false);
    });

    it('returns false for non-numeric current segment', () => {
      assert.equal(isNewerVersion('1.x.0', '1.1.0'), false);
    });

    it('rejects version string with empty segment "1..0"', () => {
      assert.equal(isNewerVersion('1..0', '1.1.0'), false);
    });

    it('rejects version string with only dots "..."', () => {
      assert.equal(isNewerVersion('...', '1.0.0'), false);
    });
  });

  // -- version string injection / security ----------------------------------

  describe('version string injection', () => {
    it('extremely long version string does not cause DoS', () => {
      const longVersion = '1.' + '9'.repeat(100_000);
      const start = Date.now();
      const result = isNewerVersion('1.0.0', longVersion);
      const elapsed = Date.now() - start;

      assert.ok(elapsed < 100, `Long version string took ${elapsed}ms`);
      assert.strictEqual(result, false);
    });

    it('version with many dots does not cause issues', () => {
      const manyDots = '1.2.3.4.5.6.7.8.9.10';
      const start = Date.now();
      const result = isNewerVersion('1.0.0', manyDots);
      const elapsed = Date.now() - start;

      assert.ok(elapsed < 50, `Many-dots version took ${elapsed}ms`);
      assert.strictEqual(result, false);
    });

    it('ReDoS in cleanVersion regex', () => {
      const adversarial = 'v' + '-'.repeat(100_000);
      const start = Date.now();
      isNewerVersion('1.0.0', adversarial);
      const elapsed = Date.now() - start;

      assert.ok(elapsed < 100, `cleanVersion with 100k dashes took ${elapsed}ms`);
    });

    it('ReDoS in isValidVersionStr regex', () => {
      const adversarial = ('1.').repeat(50_000) + '2';
      const start = Date.now();
      isNewerVersion('1.0.0', adversarial);
      const elapsed = Date.now() - start;

      assert.ok(elapsed < 100,
        `isValidVersionStr with 50k dot-segments took ${elapsed}ms`);
    });

    it('version string with newlines/special chars', () => {
      assert.strictEqual(isNewerVersion('1.0.0', '99.99.99\n<script>alert(1)</script>'), false);
    });

    it('negative version numbers', () => {
      assert.strictEqual(isNewerVersion('1.0.0', '-1.0.0'), false);
    });

    it('version with leading zeros', () => {
      assert.strictEqual(isNewerVersion('1.0.0', '01.00.00'), false);
    });

    it('NaN version parts', () => {
      assert.strictEqual(isNewerVersion('1.0.0', 'NaN.NaN.NaN'), false);
    });

    it('Infinity version', () => {
      assert.strictEqual(isNewerVersion('1.0.0', 'Infinity.0.0'), false);
    });
  });

  // -- HTML injection in version strings ------------------------------------

  describe('HTML injection in version strings', () => {
    it('rejects version with inline HTML', () => {
      assert.equal(isNewerVersion('1.0.0', '2.0.0<script>alert(1)</script>'), false);
    });

    it('version with HTML after hyphen passes comparison (cleans to valid version)', () => {
      const malicious = '2.0.0-<script>alert(1)</script>';
      assert.ok(isNewerVersion('1.0.0', malicious) === true);
    });

    it('tag_name with HTML after hyphen flows into notification unescaped', () => {
      const data = { tag_name: 'v2.0.0-<img src=x onerror=alert(1)>', html_url: 'https://github.com/releases' };
      const latestVersion = (data.tag_name || '').replace(/^v/, '');
      assert.ok(isNewerVersion('1.0.0', latestVersion));

      const content = `Call Activity Navigator v${latestVersion} is available.`;
      assert.ok(content.includes('<img'));
      assert.ok(content.includes('onerror=alert'));
    });

    it('tag_name with link injection', () => {
      const data = { tag_name: 'v2.0.0-<a href="https://evil.com">click here</a>' };
      const latestVersion = (data.tag_name || '').replace(/^v/, '');
      assert.ok(isNewerVersion('1.0.0', latestVersion));

      const content = `Call Activity Navigator v${latestVersion} is available.`;
      assert.ok(content.includes('<a href="https://evil.com">'));
    });
  });
});

// ---------------------------------------------------------------------------
// isSafeUrl
// ---------------------------------------------------------------------------

describe('isSafeUrl', () => {

  describe('null and non-string inputs', () => {
    it('returns false for null', () => {
      assert.strictEqual(isSafeUrl(null), false);
    });

    it('returns false for undefined', () => {
      assert.strictEqual(isSafeUrl(undefined), false);
    });

    it('returns false for number', () => {
      assert.strictEqual(isSafeUrl(42), false);
    });
  });

  describe('credential rejection', () => {
    it('rejects URLs with user:password@', () => {
      assert.strictEqual(
        isSafeUrl('https://user:password@github.com/repo/releases/tag/v1'),
        false
      );
    });

    it('rejects URLs with username only', () => {
      assert.strictEqual(
        isSafeUrl('https://user@github.com/repo/releases/tag/v1'),
        false
      );
    });

    it('accepts valid GitHub URLs', () => {
      assert.strictEqual(
        isSafeUrl('https://github.com/jjarndt/camunda-modeler-call-activity-navigator/releases/tag/v1.2.1'),
        true
      );
    });
  });

  describe('domain validation', () => {
    it('accepts github.com', () => {
      assert.equal(isSafeUrl('https://github.com/user/repo/releases/v1'), true);
    });

    it('accepts subdomain of github.com', () => {
      assert.equal(isSafeUrl('https://api.github.com/repos/user/repo'), true);
    });

    it('rejects http (non-https)', () => {
      assert.equal(isSafeUrl('http://github.com/release'), false);
    });

    it('rejects non-github domain', () => {
      assert.equal(isSafeUrl('https://example.com/release'), false);
    });

    it('rejects evil-github.com', () => {
      assert.equal(isSafeUrl('https://evil-github.com/fake-release'), false);
    });

    it('rejects notgithub.com', () => {
      assert.equal(isSafeUrl('https://notgithub.com/phishing-page'), false);
    });

    it('rejects attacker.fakegithub.com', () => {
      assert.equal(isSafeUrl('https://attacker.fakegithub.com/exploit'), false);
    });

    it('rejects evilgithub.com', () => {
      assert.equal(isSafeUrl('https://evilgithub.com/release'), false);
    });
  });
});

// ---------------------------------------------------------------------------
// checkForUpdate
// ---------------------------------------------------------------------------

describe('checkForUpdate', () => {

  // -- update availability --------------------------------------------------

  describe('update availability', () => {
    it('returns available when a newer version exists', async (t) => {
      t.after(teardownGlobals);
      setupGlobals({ fetchResponse: fakeRelease('v2.0.0') });

      const result = await checkForUpdate('1.0.0');

      assert.deepEqual(result, {
        available: true,
        latest: '2.0.0',
        url: 'https://github.com/jjarndt/camunda-modeler-call-activity-navigator/releases/tag/v2.0.0'
      });
    });

    it('returns not available when already on the latest version', async (t) => {
      t.after(teardownGlobals);
      setupGlobals({ fetchResponse: fakeRelease('v1.2.1') });

      const result = await checkForUpdate('1.2.1');

      assert.deepEqual(result, { available: false });
    });

    it('strips the "v" prefix from tag_name', async (t) => {
      t.after(teardownGlobals);
      setupGlobals({ fetchResponse: fakeRelease('v5.1.0') });

      const result = await checkForUpdate('1.0.0');

      assert.equal(result.latest, '5.1.0');
    });
  });

  // -- throttling -----------------------------------------------------------

  describe('throttling', () => {
    it('skips fetch when last check was within the past day', async (t) => {
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

    it('fetches when the last check was over a day ago', async (t) => {
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

    it('stores the current timestamp in localStorage after a check', async (t) => {
      t.after(teardownGlobals);
      const storage = setupGlobals({ fetchResponse: fakeRelease('v1.0.0') });

      await checkForUpdate('1.0.0');

      const stored = storage.get('callActivityNavigator.lastUpdateCheck');
      assert.ok(stored);
      assert.ok(Math.abs(Date.now() - Number(stored)) < 5000);
    });

    it('throttle is set even when fetch throws a network error', async (t) => {
      const storage = new Map();
      globalThis.localStorage = {
        getItem: (k) => storage.get(k) ?? null,
        setItem: (k, v) => storage.set(k, v)
      };
      globalThis.fetch = async () => { throw new Error('Network error'); };

      t.after(teardownGlobals);

      const result = await checkForUpdate('1.0.0');
      assert.deepStrictEqual(result, { available: false });

      const throttleTimestamp = storage.get('callActivityNavigator.lastUpdateCheck');
      assert.strictEqual(throttleTimestamp, undefined,
        'Throttle timestamp should NOT be set when fetch fails');
    });

    it('second call within 24h is not throttled after first call failed', async (t) => {
      const storage = new Map();
      globalThis.localStorage = {
        getItem: (k) => storage.get(k) ?? null,
        setItem: (k, v) => storage.set(k, v)
      };

      // First call: fetch fails
      globalThis.fetch = async () => { throw new Error('Network error'); };

      t.after(teardownGlobals);

      await checkForUpdate('1.0.0');

      // Second call: fetch succeeds
      let secondFetchCalled = false;
      globalThis.fetch = async () => {
        secondFetchCalled = true;
        return {
          ok: true,
          json: async () => ({
            tag_name: 'v2.0.0',
            html_url: 'https://github.com/jjarndt/camunda-modeler-call-activity-navigator/releases/tag/v2.0.0'
          })
        };
      };

      const result2 = await checkForUpdate('1.0.0');

      assert.strictEqual(secondFetchCalled, true,
        'Second call should NOT be throttled when first call failed');
      assert.strictEqual(result2.available, true);
    });
  });

  // -- error handling -------------------------------------------------------

  describe('error handling', () => {
    it('returns not available on HTTP error response', async (t) => {
      t.after(teardownGlobals);
      setupGlobals({ fetchResponse: { ok: false } });

      const result = await checkForUpdate('1.0.0');

      assert.deepEqual(result, { available: false });
    });

    it('returns not available on network exception', async (t) => {
      t.after(teardownGlobals);
      globalThis.localStorage = { getItem: () => null, setItem: () => {} };
      globalThis.fetch = async () => { throw new Error('network down'); };

      const result = await checkForUpdate('1.0.0');

      assert.deepEqual(result, { available: false });
    });

    it('returns not available when JSON parsing fails', async (t) => {
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

    it('returns not available when localStorage throws', async (t) => {
      t.after(teardownGlobals);

      globalThis.localStorage = {
        getItem: () => { throw new Error('localStorage disabled'); },
        setItem: () => {}
      };
      globalThis.fetch = async () => ({
        ok: true,
        json: async () => ({ tag_name: 'v9.0.0' })
      });

      const result = await checkForUpdate('1.0.0');

      assert.deepEqual(result, { available: false });
    });

    it('returns not available when localStorage is absent (Node.js)', async () => {
      const result = await checkForUpdate('1.0.0');
      assert.deepStrictEqual(result, { available: false });
    });
  });

  // -- malformed response data ----------------------------------------------

  describe('malformed response data', () => {
    it('returns not available when tag_name is an empty string', async (t) => {
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

    it('returns not available when tag_name is missing', async (t) => {
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

    it('returns not available when tag_name is null', async (t) => {
      t.after(teardownGlobals);
      setupGlobals({
        fetchResponse: {
          ok: true,
          json: async () => ({ tag_name: null, html_url: 'https://example.com' })
        }
      });

      const result = await checkForUpdate('1.0.0');

      assert.deepEqual(result, { available: false });
    });
  });

  // -- fetch behavior -------------------------------------------------------

  describe('fetch behavior', () => {
    it('fetch is called with an AbortSignal', async (t) => {
      const originalFetch = globalThis.fetch;
      let signal = null;

      globalThis.fetch = (url, options) => {
        signal = options?.signal;
        return Promise.resolve({ ok: false });
      };
      globalThis.localStorage = {
        getItem: () => null,
        setItem: () => {}
      };

      t.after(() => {
        globalThis.fetch = originalFetch;
        delete globalThis.localStorage;
      });

      await checkForUpdate('1.0.0');
      assert.ok(signal, 'fetch should be called with an AbortSignal');
      assert.ok(signal instanceof AbortSignal, 'signal should be an AbortSignal instance');
    });
  });

  // -- fallback URL ---------------------------------------------------------

  describe('fallback URL', () => {
    it('falls back to releases URL when html_url is missing from response', async (t) => {
      t.after(teardownGlobals);
      setupGlobals({
        fetchResponse: {
          ok: true,
          json: async () => ({ tag_name: 'v2.0.0' })
        }
      });

      const result = await checkForUpdate('1.0.0');

      assert.deepStrictEqual(result, {
        available: true,
        latest: '2.0.0',
        url: 'https://github.com/jjarndt/camunda-modeler-call-activity-navigator/releases/latest'
      });
    });

    it('when html_url is unsafe, returns user-friendly fallback URL', async (t) => {
      const storage = new Map();
      globalThis.localStorage = {
        getItem: (k) => storage.get(k) ?? null,
        setItem: (k, v) => storage.set(k, v)
      };
      globalThis.fetch = async () => ({
        ok: true,
        json: async () => ({
          tag_name: 'v2.0.0',
          html_url: 'http://evil.com/malware'
        })
      });

      t.after(teardownGlobals);

      const result = await checkForUpdate('1.0.0');

      assert.strictEqual(result.available, true);
      assert.strictEqual(result.latest, '2.0.0');

      const isApiUrl = result.url.includes('api.github.com');
      assert.strictEqual(isApiUrl, false,
        `Fallback URL should be a user-friendly page, not API endpoint: ${result.url}`);
    });
  });
});
