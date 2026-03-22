/**
 * SEC-007: Unvalidated processId in ContextPad title attribute
 *
 * CallActivityContextPadProvider.getContextPadEntries (line 36) sets:
 *   title: `Open "${processId}"`
 *
 * where processId comes directly from getCalledProcessId() (BPMN XML attribute).
 * No validation is applied. VALID_PROCESS_ID check is only in _doHandleOpenProcess
 * (index.js line 134), which runs on CLICK, not on RENDER.
 *
 * This means arbitrary strings from BPMN XML reach the DOM title attribute.
 * In bpmn-js, the title is set as an HTML attribute via innerHTML when the
 * context pad entry uses the `html` property. While the title itself is
 * attribute-context (not direct HTML injection), the processId also flows
 * into notification content strings (index.js lines 150, 171) without escaping.
 *
 * The notification system in Camunda Modeler renders content as text, but the
 * `link.href` property (line 89) could be exploited if combined with SEC-003.
 *
 * CWE-79: Improper Neutralization of Input During Web Page Generation
 * Severity: Low-Medium (depends on Camunda Modeler's rendering of title/content)
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getCalledProcessId, isCallActivity } from '../client/bpmn-extension/util.mjs';

const VALID_PROCESS_ID = /^[a-zA-Z0-9_\-.:]+$/;

// Simulate CallActivityContextPadProvider.getContextPadEntries logic
function getContextPadEntries(element) {
  if (!isCallActivity(element)) return {};
  const processId = getCalledProcessId(element);
  if (!processId) return {};

  return {
    'open-called-process': {
      group: 'edit',
      html: '<div class="entry">icon</div>',
      title: `Open "${processId}"`,
      action: { click() {} }
    }
  };
}

describe('SEC-007: Unvalidated processId in ContextPad', () => {

  it('XSS payload in calledElement reaches title without validation', () => {
    const element = {
      type: 'bpmn:CallActivity',
      businessObject: {
        get(prop) {
          if (prop === 'calledElement') return '"><img src=x onerror=alert(1)>';
          if (prop === 'extensionElements') return null;
          return null;
        }
      }
    };

    const entries = getContextPadEntries(element);
    const title = entries['open-called-process'].title;

    // The title contains unescaped HTML
    assert.ok(
      title.includes('<img'),
      `Expected title to contain unescaped HTML, got: ${title}`
    );

    // Confirm this would fail VALID_PROCESS_ID if it were checked
    const processId = getCalledProcessId(element);
    assert.equal(VALID_PROCESS_ID.test(processId), false,
      'Payload fails VALID_PROCESS_ID but reaches ContextPad title unchecked');
  });

  it('Unicode/special chars in processId reach title unescaped', () => {
    const element = {
      type: 'bpmn:CallActivity',
      businessObject: {
        get(prop) {
          if (prop === 'calledElement') return 'process\u0000\u001B[31mRED';
          if (prop === 'extensionElements') return null;
          return null;
        }
      }
    };

    const entries = getContextPadEntries(element);
    const title = entries['open-called-process'].title;

    assert.ok(
      title.includes('\u0000'),
      'Null byte in processId reaches title unescaped'
    );
  });

  it('processId with JS template literal injection reaches title', () => {
    const element = {
      type: 'bpmn:CallActivity',
      businessObject: {
        get(prop) {
          if (prop === 'calledElement') return '${alert(1)}';
          if (prop === 'extensionElements') return null;
          return null;
        }
      }
    };

    const entries = getContextPadEntries(element);
    const processId = getCalledProcessId(element);

    // processId is used in template literal on index.js line 150:
    //   `The process "${processId}" is already in this file.`
    // While template literals don't re-evaluate ${}, the string still
    // reaches the notification system unvalidated
    assert.equal(processId, '${alert(1)}');
    assert.equal(VALID_PROCESS_ID.test(processId), false,
      'Template injection payload bypasses VALID_PROCESS_ID but reaches ContextPad first');
  });
});
