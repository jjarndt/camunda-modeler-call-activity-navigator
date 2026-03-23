/**
 * SEC-006: XSS via processId in context pad HTML title (unescaped)
 *
 * In CallActivityContextPadProvider.js line 37:
 *   title: `Open "${processId}"`
 *
 * The processId is interpolated directly into the title attribute string.
 * While VALID_PROCESS_ID in index.js blocks XSS in the navigation flow,
 * the context pad title is set BEFORE any validation in index.js.
 * The processId comes from getCalledProcessId(element) which reads the
 * BPMN model directly, and is then placed into the context pad entry
 * without sanitization.
 *
 * If a BPMN file contains a calledElement with HTML/JS, it flows into
 * the DOM title attribute unescaped.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getCalledProcessId, isCallActivity } from '../client/bpmn-extension/util.mjs';

function makeCallActivityElement(calledElement) {
  return {
    type: 'bpmn:CallActivity',
    businessObject: {
      get(prop) {
        if (prop === 'calledElement') return calledElement;
        if (prop === 'extensionElements') return null;
        return null;
      }
    }
  };
}

describe('SEC-006: XSS via unescaped processId in context pad title', () => {

  it('processId with double-quote breaks out of title attribute', () => {
    const xssId = 'test" onclick="alert(1)" data-x="';
    const element = makeCallActivityElement(xssId);

    assert.ok(isCallActivity(element), 'should be a call activity');
    const processId = getCalledProcessId(element);

    // processId contains unescaped double quotes
    assert.ok(processId.includes('"'), 'processId should contain double quote');

    // Simulate what CallActivityContextPadProvider does:
    const title = `Open "${processId}"`;

    // In an HTML context, this title would be:
    // title='Open "test" onclick="alert(1)" data-x=""'
    // If rendered as an attribute value, the double-quote breaks out
    assert.ok(
      title.includes('onclick'),
      'XSS payload should be present in title string'
    );
  });

  it('processId with HTML tags passes through to context pad', () => {
    const xssId = '<img src=x onerror=alert(1)>';
    const element = makeCallActivityElement(xssId);
    const processId = getCalledProcessId(element);

    assert.ok(processId.includes('<'), 'processId should contain < character');
    assert.ok(processId.includes('>'), 'processId should contain > character');

    // This gets set as: title: `Open "${processId}"`
    // which is: title: 'Open "<img src=x onerror=alert(1)>"'
    const title = `Open "${processId}"`;
    assert.ok(title.includes('<img'), 'HTML tag should be in title');
  });

  it('SAFE_PROCESS_ID in bpmn-parser.mjs blocks HTML in extracted IDs', () => {
    // The parser has its own safeguard
    const SAFE_PROCESS_ID = /^[^\s/\\<>"']+$/;

    assert.equal(SAFE_PROCESS_ID.test('<script>'), false, '< blocked');
    assert.equal(SAFE_PROCESS_ID.test('test"xss'), false, '" blocked');
    assert.equal(SAFE_PROCESS_ID.test("test'xss"), false, "' blocked");
    assert.equal(SAFE_PROCESS_ID.test('test xss'), false, 'space blocked');
  });

  it('but getCalledProcessId from model has NO such filter - XSS is possible', () => {
    // The critical point: when a user opens a malicious .bpmn file,
    // the calledElement value is read from the model by getCalledProcessId,
    // and placed into the context pad title UNESCAPED.
    // The VALID_PROCESS_ID check only happens later in _doHandleOpenProcess.
    const payloads = [
      '<script>alert(1)</script>',
      '" onmouseover="alert(1)',
      '\'><svg/onload=alert(1)>',
    ];

    for (const payload of payloads) {
      const element = makeCallActivityElement(payload);
      const result = getCalledProcessId(element);

      // All these pass through getCalledProcessId unfiltered
      assert.ok(
        result === payload.trim(),
        `Expected payload to pass through, got: ${result}`
      );
    }
  });
});
