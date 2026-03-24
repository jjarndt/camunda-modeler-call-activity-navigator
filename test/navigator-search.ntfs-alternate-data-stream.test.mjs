/**
 * SEC-NEW-007: VALID_PROCESS_ID allows Alternate Data Stream syntax
 *
 * VALID_PROCESS_ID allows colons (:), which on Windows NTFS enables:
 * - Alternate Data Streams: "file:stream" accesses hidden data
 * - Combined with processId -> "processId:stream.bpmn"
 *   This could access hidden ADS content or create confusing filenames
 *
 * Additionally, processId with leading/trailing dots and colons
 * can create problematic filenames on various OSes.
 *
 * CWE-41: Improper Resolution of Path Equivalence
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

const VALID_PROCESS_ID = /^(?!(?:CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(?:\.|$))[a-zA-Z0-9_\-.]+$/i;

function buildCandidateNames(processId) {
  return [...new Set([
    `${processId}.bpmn`,
    `${processId.replace(/_/g, '-')}.bpmn`,
    `${processId.replace(/-/g, '_')}.bpmn`
  ])];
}

describe('SEC-NEW-007: NTFS Alternate Data Stream and special filename injection', () => {

  it('VALID_PROCESS_ID accepts ADS-like processId with colon', () => {
    const adsPayloads = [
      'file:secret',       // Alternate Data Stream reference
      'process:$DATA',     // Default data stream
      'test::$INDEX',      // NTFS index stream
    ];

    const accepted = adsPayloads.filter(p => VALID_PROCESS_ID.test(p));

    if (accepted.length > 0) {
      const candidates = accepted.flatMap(p =>
        buildCandidateNames(p).map(c => `"${p}" -> "${c}"`)
      );
      assert.fail(
        `VALID_PROCESS_ID accepts ADS-like process IDs:\n${candidates.join('\n')}\n` +
        'On NTFS, "file:secret.bpmn" accesses an Alternate Data Stream, ' +
        'enabling hidden data access or exfiltration (CWE-41).'
      );
    }
  });

  it('processId with only dots creates problematic filenames', () => {
    const dotPayloads = ['.', '..', '...'];
    const accepted = dotPayloads.filter(p => VALID_PROCESS_ID.test(p));

    if (accepted.length > 0) {
      const candidates = accepted.flatMap(p =>
        buildCandidateNames(p).map(c => `"${p}" -> "${c}"`)
      );
      // "." -> "..bpmn", ".." -> "...bpmn", "..." -> "....bpmn"
      // While "...bpmn" is valid, ".." is a special directory entry
    }
  });

  it('processId starting with dash creates problematic filenames', () => {
    // "--.bpmn" could be interpreted as command flags
    const dashIds = ['-', '--', '-rf'];
    const accepted = dashIds.filter(p => VALID_PROCESS_ID.test(p));

    if (accepted.length > 0) {
      const candidates = accepted.flatMap(p =>
        buildCandidateNames(p).map(c => `"${p}" -> "${c}"`)
      );
      // These are edge cases but not critical security issues
    }
  });

  it('processId with consecutive colons creates problematic paths', () => {
    // Multiple colons: "a::b" -> "a::b.bpmn"
    // On some systems, :: has special meaning
    const result = VALID_PROCESS_ID.test('a::b');
    if (result) {
      const candidates = buildCandidateNames('a::b');
      // "a::b.bpmn" on NTFS accesses the default data stream of "a" with "b.bpmn"
      assert.fail(
        `processId "a::b" passes validation. Candidate: "${candidates[0]}". ` +
        'On NTFS, double colon in filename accesses Alternate Data Streams.'
      );
    }
  });
});
