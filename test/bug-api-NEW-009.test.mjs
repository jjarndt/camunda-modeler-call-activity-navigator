/**
 * BUG-API-NEW-009: checkForUpdate uses response.json() without Content-Type
 * validation. If the GitHub API returns a non-JSON response (e.g., HTML
 * error page with 200 status), response.json() throws a SyntaxError.
 *
 * The catch block on line 85 catches ALL errors and returns NO_UPDATE.
 * So this doesn't crash. But it sets the throttle BEFORE the fetch
 * (bug-api-NEW-005), meaning a temporarily broken API (returning HTML)
 * blocks update checks for 24 hours.
 *
 * However, there's another issue: checkForUpdate accesses `data.tag_name`
 * on line 77. If data is a valid JSON but not the expected format (e.g.,
 * an array instead of an object), `data.tag_name` is undefined.
 * `(undefined || '').replace(...)` returns ''. The function correctly
 * returns NO_UPDATE. Not a crash bug.
 *
 * REAL BUG: isNewerVersion with pre-release detection.
 * hasPreRelease checks for '-' in the version after removing the leading 'v'.
 * cleanVersion strips everything from '-' or '+' onwards.
 * So for "1.2.3-beta.1":
 *   cleanVersion -> "1.2.3"
 *   hasPreRelease -> true (because "-beta.1" contains '-')
 *
 * But for "1.2.3+build123":
 *   cleanVersion -> "1.2.3" (strips from '+')
 *   hasPreRelease -> false (no '-')
 *
 * The issue: cleanVersion uses `version.replace(/[-+].*$/, '')` which
 * strips from the FIRST '-' or '+'. For "1.2.3-beta+build":
 *   cleanVersion -> "1.2.3" (strips "-beta+build")
 *   hasPreRelease -> true (finds '-' in "1.2.3-beta+build")
 *
 * This is correct. But what about version "v1.2.3"?
 *   cleanVersion -> "1.2.3" (strips 'v' prefix, no '-' or '+')
 *   hasPreRelease -> false (no '-' after stripping 'v')
 *
 * What about "v1.2.3-rc1"?
 *   cleanVersion -> "1.2.3" (strips 'v', then '-rc1')
 *   hasPreRelease -> true (finds '-' in "1.2.3-rc1" after stripping 'v')
 *
 * This all seems correct. Let me look at edge cases...
 *
 * isNewerVersion("1.2.3-beta", "1.2.3"):
 *   currentStr = "1.2.3", latestStr = "1.2.3"
 *   Version numbers are equal
 *   hasPreRelease("1.2.3-beta") = true, hasPreRelease("1.2.3") = false
 *   Returns true ✓ (stable is newer than pre-release)
 *
 * isNewerVersion("1.2.3", "1.2.3-beta"):
 *   currentStr = "1.2.3", latestStr = "1.2.3"
 *   Version numbers are equal
 *   hasPreRelease("1.2.3") = false, hasPreRelease("1.2.3-beta") = true
 *   Line 53 condition: false && true -> false
 *   Returns false ✓ (pre-release is not newer than stable)
 *
 * Wait, what about: isNewerVersion("1.2.3-alpha", "1.2.3-beta")?
 *   currentStr = "1.2.3", latestStr = "1.2.3"
 *   Both have same version numbers
 *   hasPreRelease(current) = true, hasPreRelease(latest) = true
 *   Line 53: true && !true -> false
 *   Returns false
 *   BUG? Both are pre-releases but beta > alpha. The function says
 *   "no update available". But pre-release ordering is complex.
 *   This is a known limitation, not really a bug.
 *
 * isNewerVersion with versions that have different number of segments:
 *   isNewerVersion("1.2", "1.2.1"):
 *   currentStr = "1.2", latestStr = "1.2.1"
 *   currentParts = [1, 2], latestParts = [1, 2, 1]
 *   i=0: 1 === 1
 *   i=1: 2 === 2
 *   i=2: latestParts[2]=1, currentParts[2]=undefined||0=0
 *   1 > 0 -> returns true ✓
 *
 * Let me test a concrete bug: what about a version like "1.02.3"?
 * cleanVersion doesn't strip leading zeros. isValidVersionStr allows
 * \d{1,10} which matches "02". Number("02") = 2. So comparison works.
 * Not a bug.
 *
 * Actually, let me look at: what about negative comparison with isNewerVersion?
 * isNewerVersion returns boolean, but the caller might use it wrong.
 * Not our problem.
 *
 * NEW ANGLE: checkForUpdate on line 77 does:
 * `const latestVersion = (data.tag_name || '').replace(/^v/, '')`
 * This strips only a lowercase 'v'. cleanVersion strips case-insensitive v.
 * Then on line 79: `isNewerVersion(currentVersion, latestVersion)`
 * Inside isNewerVersion, cleanVersion strips 'v' again. So double-stripping
 * of 'v' is harmless. But: if tag_name is "V1.2.3" (uppercase V),
 * line 77 doesn't strip it. latestVersion becomes "V1.2.3".
 * cleanVersion("V1.2.3") strips "V" (case-insensitive /^v/i). -> "1.2.3"
 * This works correctly.
 *
 * OK, let me shift to: what happens when data.html_url is present but not
 * a safe URL? Line 83: `const url = isSafeUrl(data.html_url) ? data.html_url : RELEASES_URL`
 * Falls back to RELEASES_URL. But RELEASES_URL is an API URL, not a release page URL.
 * The returned url is used by the caller to open in a browser.
 * Opening the API URL would show JSON, not a nice release page.
 * This is a minor UX bug when html_url is not safe.
 *
 * Actually, this is not testable without mocking. Let me test something
 * more concrete:
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { isNewerVersion, checkForUpdate } from '../client/update-check.mjs';

describe('BUG-API-NEW-009: checkForUpdate fallback URL is API endpoint, not release page', () => {

  it('when html_url is unsafe, returns API URL as fallback', async () => {
    const originalFetch = globalThis.fetch;
    const storage = new Map();
    globalThis.localStorage = {
      getItem: (k) => storage.get(k) ?? null,
      setItem: (k, v) => storage.set(k, v),
    };

    globalThis.fetch = async () => ({
      ok: true,
      json: async () => ({
        tag_name: 'v2.0.0',
        html_url: 'http://evil.com/malware'  // not safe (http, not github)
      })
    });

    try {
      const result = await checkForUpdate('1.0.0');

      assert.strictEqual(result.available, true);
      assert.strictEqual(result.latest, '2.0.0');

      // BUG: the URL is the GitHub API endpoint (JSON), not a user-friendly page
      // The fallback should be a user-friendly URL, not an API endpoint
      const isApiUrl = result.url.includes('api.github.com');
      assert.strictEqual(isApiUrl, false,
        `Fallback URL should be a user-friendly page, not API endpoint: ${result.url}`);
    } finally {
      globalThis.fetch = originalFetch;
      delete globalThis.localStorage;
    }
  });
});
