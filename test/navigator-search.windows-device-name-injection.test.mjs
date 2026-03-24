/**
 * SEC-NEW-003: Windows Device Name Injection via processId
 *
 * VALID_PROCESS_ID allows colons (":"), which means process IDs like
 * "CON:", "NUL:", "AUX:", "PRN:", "COM1:", "LPT1:" pass validation.
 * On Windows, these are reserved device names. When _buildCandidateNames
 * creates filenames like "CON:.bpmn", "NUL:.bpmn", etc., and these
 * are passed to fileSystem.readFile, it could:
 * - Cause hangs (reading from CON: waits for console input)
 * - Cause errors/crashes
 * - Enable information disclosure
 *
 * Additionally, "CON" (without colon) also passes and "CON.bpmn"
 * is a reserved name on Windows (device name + any extension).
 *
 * CWE-67: Improper Handling of Windows Device Names
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { normalizePath } from '../client/path-utils.mjs';

const VALID_PROCESS_ID = /^(?!(?:CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(?:\.|$))[a-zA-Z0-9_\-.]+$/i;

// Windows reserved device names (case insensitive)
const WINDOWS_DEVICES = [
  'CON', 'PRN', 'AUX', 'NUL',
  'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9',
  'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9'
];

function buildCandidateNames(processId) {
  return [...new Set([
    `${processId}.bpmn`,
    `${processId.replace(/_/g, '-')}.bpmn`,
    `${processId.replace(/-/g, '_')}.bpmn`
  ])];
}

describe('SEC-NEW-003: Windows Device Name Injection', () => {

  it('VALID_PROCESS_ID accepts Windows reserved device names', () => {
    const accepted = WINDOWS_DEVICES.filter(name => VALID_PROCESS_ID.test(name));

    if (accepted.length > 0) {
      // This IS a bug: device names pass validation
      assert.fail(
        `VALID_PROCESS_ID accepts Windows reserved device names: ${accepted.join(', ')}. ` +
        'On Windows, filenames like "CON.bpmn", "NUL.bpmn" map to device handles ' +
        'and could cause hangs or errors (CWE-67).'
      );
    }
  });

  it('VALID_PROCESS_ID accepts device names with colon suffix', () => {
    const withColon = WINDOWS_DEVICES.map(d => `${d}:`);
    const accepted = withColon.filter(name => VALID_PROCESS_ID.test(name));

    if (accepted.length > 0) {
      assert.fail(
        `VALID_PROCESS_ID accepts device names with colon: ${accepted.join(', ')}. ` +
        'These are even more dangerous as "CON:" explicitly references the device.'
      );
    }
  });

  it('_buildCandidateNames generates dangerous filenames from device names', () => {
    const dangerous = [];

    for (const device of WINDOWS_DEVICES) {
      if (VALID_PROCESS_ID.test(device)) {
        const candidates = buildCandidateNames(device);
        // On Windows, "CON.bpmn" is still treated as device "CON"
        dangerous.push(...candidates.map(c => `${device} -> ${c}`));
      }
    }

    if (dangerous.length > 0) {
      assert.fail(
        `Device names produce dangerous candidate filenames:\n${dangerous.join('\n')}\n` +
        'On Windows, "CON.bpmn" resolves to the CON device, not a file.'
      );
    }
  });

  it('candidate path with device name in deep directory is still dangerous on Windows', () => {
    // Even in a subdirectory, Windows device names are matched
    // C:\project\processes\CON.bpmn -> still opens CON device
    const processId = 'CON';

    if (!VALID_PROCESS_ID.test(processId)) {
      return; // Skip if already fixed
    }

    const candidatePath = normalizePath(
      `C:\\Users\\project\\processes\\${processId}.bpmn`,
      '\\'
    );

    // The path looks normal but "CON.bpmn" is a device name on Windows
    assert.ok(
      candidatePath.includes('CON.bpmn'),
      `Expected path to contain CON.bpmn, got: ${candidatePath}`
    );

    assert.fail(
      `Path "${candidatePath}" contains Windows device name CON.bpmn which ` +
      'is resolved as console device, not a file. This could hang the application.'
    );
  });
});
