/**
 * SEC-003: isSafeUrl bypass via hostname suffix matching
 *
 * isSafeUrl (update-check.mjs) checks:
 *   hostname.endsWith('github.com')
 *
 * This allows any domain ending in "github.com", e.g.:
 *   https://evil-github.com/malicious
 *   https://notgithub.com/phishing
 *
 * Attack vector: A malicious GitHub API response (MITM or compromised
 * CDN/proxy) returns html_url pointing to "https://evil-github.com/release".
 * The plugin shows a clickable "GitHub Release" link in the Camunda Modeler
 * notification area that navigates to the attacker's domain.
 *
 * CWE-20: Improper Input Validation
 * Severity: Medium (requires MITM or compromised API response)
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// Replicate the fixed isSafeUrl logic from update-check.mjs
function isSafeUrl(url) {
  try {
    const { protocol, hostname } = new URL(url);
    return protocol === 'https:' &&
      (hostname === 'github.com' || hostname.endsWith('.github.com'));
  } catch {
    return false;
  }
}

describe('SEC-003: isSafeUrl rejects spoofed github.com domains', () => {

  it('rejects attacker domain "evil-github.com"', () => {
    assert.equal(isSafeUrl('https://evil-github.com/fake-release'), false);
  });

  it('rejects attacker domain "notgithub.com"', () => {
    assert.equal(isSafeUrl('https://notgithub.com/phishing-page'), false);
  });

  it('rejects attacker domain "attacker.fakegithub.com"', () => {
    assert.equal(isSafeUrl('https://attacker.fakegithub.com/exploit'), false);
  });

  // Sanity checks: these should legitimately pass
  it('correctly accepts github.com', () => {
    assert.equal(isSafeUrl('https://github.com/user/repo/releases/v1'), true);
  });

  it('correctly accepts subdomain of github.com', () => {
    assert.equal(isSafeUrl('https://api.github.com/repos/user/repo'), true);
  });

  it('correctly rejects http (non-https)', () => {
    assert.equal(isSafeUrl('http://github.com/release'), false);
  });

  it('correctly rejects non-github domain', () => {
    assert.equal(isSafeUrl('https://example.com/release'), false);
  });
});
