/**
 * SEC-016: Version string injection in notification content
 *
 * In index.js line 88:
 *   content: `Call Activity Navigator v${result.latest} is available. ...`
 *
 * result.latest comes from the GitHub API tag_name, stripped of 'v' prefix.
 * If an attacker controls the tag_name (e.g., via compromised GitHub repo),
 * they can inject HTML into the notification.
 *
 * isNewerVersion validates the version has the format \d{1,10}(\.\d{1,10}){0,2}
 * BUT the content string uses result.latest which is data.tag_name.replace(/^v/, '')
 * NOT cleanVersion(). So the raw tag_name (minus v) is used.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { isNewerVersion } from '../client/update-check.mjs';

describe('SEC-016: Version string in notification content', () => {

  it('isNewerVersion allows comparison but tag_name flows to content unfiltered', () => {
    // Simulate: data.tag_name = 'v2.0.0<script>alert(1)</script>'
    // In checkForUpdate:
    //   latestVersion = (data.tag_name || '').replace(/^v/, '')
    //   => '2.0.0<script>alert(1)</script>'
    //   isNewerVersion('1.0.0', latestVersion) calls cleanVersion which strips after -
    //   cleanVersion('2.0.0<script>alert(1)</script>') => version.replace(/[-+].*$/, '')
    //   But < is not - or +, so cleanVersion returns '2.0.0<script>alert(1)</script>'
    //   isValidVersionStr('2.0.0<script>alert(1)</script>') => false (contains non-digit chars)
    //   So isNewerVersion returns false.

    const malicious = '2.0.0<script>alert(1)</script>';
    const result = isNewerVersion('1.0.0', malicious);
    assert.equal(result, false, 'Malicious version should be rejected by isValidVersionStr');
  });

  it('version with HTML after hyphen gets cleaned', () => {
    // data.tag_name = 'v2.0.0-<script>alert(1)</script>'
    // cleanVersion strips after - : '2.0.0'
    // isValidVersionStr('2.0.0') => true
    // isNewerVersion('1.0.0', '2.0.0-<script>alert(1)</script>') => true
    // BUT latestVersion used in content is '2.0.0-<script>alert(1)</script>'
    const malicious = '2.0.0-<script>alert(1)</script>';
    const result = isNewerVersion('1.0.0', malicious);
    assert.ok(
      result === true,
      `Expected version with HTML after hyphen to pass isNewerVersion. Got: ${result}`
    );
    // BUG: This passes isNewerVersion, and then the RAW string (including HTML)
    // gets interpolated into the notification content!
  });

  it('tag_name with HTML after hyphen flows into notification unescaped', () => {
    // Simulate checkForUpdate flow:
    const data = { tag_name: 'v2.0.0-<img src=x onerror=alert(1)>', html_url: 'https://github.com/releases' };
    const latestVersion = (data.tag_name || '').replace(/^v/, '');
    // => '2.0.0-<img src=x onerror=alert(1)>'

    const isNewer = isNewerVersion('1.0.0', latestVersion);
    assert.ok(isNewer, 'Should detect as newer version');

    // This is what goes into the notification:
    const content = `Call Activity Navigator v${latestVersion} is available. Run the install command or visit GitHub Releases to update.`;
    assert.ok(
      content.includes('<img'),
      'HTML injection in notification content'
    );
    assert.ok(
      content.includes('onerror=alert'),
      'XSS payload in notification content'
    );
  });

  it('tag_name with link injection', () => {
    const data = { tag_name: 'v2.0.0-<a href="https://evil.com">click here</a>' };
    const latestVersion = (data.tag_name || '').replace(/^v/, '');

    const isNewer = isNewerVersion('1.0.0', latestVersion);
    assert.ok(isNewer, 'Should detect as newer version');

    const content = `Call Activity Navigator v${latestVersion} is available.`;
    assert.ok(
      content.includes('<a href="https://evil.com">'),
      'Link injection in notification content'
    );
  });
});
