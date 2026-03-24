/**
 * Bug-Finder-Logik-026: bpmn-parser stripNonContent - PI detection issue
 *
 * In stripNonContent, the code searches for both `<?` and `<!` on each iteration.
 * Line 10: `let piIdx = noMorePIs ? -1 : str.indexOf('<?', searchFrom);`
 * Line 12: `const commentIdx = str.indexOf('<!', searchFrom);`
 *
 * Note: Line 12 does NOT check `noMoreComments` or `noMoreCdata` before searching!
 * It always searches for `<!` even when both comment and CDATA flags are set.
 *
 * But line 63: `if (noMoreComments && noMoreCdata) break;`
 * This break is inside the `else` path of the comment processing.
 * If `nextIdx` was a PI, we'd be in the PI branch and never reach line 63.
 *
 * What happens when noMoreComments && noMoreCdata but there are still PIs?
 * The code finds `<!` (commentIdx is not -1 because we always search for it).
 * nextComment = commentIdx (some finite value).
 * Also finds `<?` (piIdx).
 * nextIdx = Math.min(nextPi, nextComment).
 *
 * If nextPi < nextComment: processes PI. Correct.
 * If nextComment < nextPi: goes to line 40 (idx = commentIdx).
 *   Line 43: checks if it's a comment -> noMoreComments is true, skips.
 *   Line 52: checks if it's CDATA -> noMoreCdata is true, skips.
 *   Line 63: noMoreComments && noMoreCdata -> break!
 *   But there was still a PI to process!
 *
 * Actually wait, line 43: `if (!noMoreComments && ...)`. If noMoreComments is true,
 * this condition is false. It falls through.
 * Line 52: `if (!noMoreCdata && ...)`. If noMoreCdata is true, this is false.
 * Falls through.
 * Line 63: break.
 *
 * So if noMoreComments AND noMoreCdata, and a `<!` appears BEFORE the next `<?`,
 * the loop breaks and any remaining PIs are NOT stripped.
 *
 * Is this a real bug? Let me construct a test case:
 * `<!badcomment <![BADCDATA[ <?custom data?> <bpmn:process id="Test" />`
 *
 * After encountering bad comment (no -->), noMoreComments = true.
 * After encountering bad CDATA (no ]]>), noMoreCdata = true.
 * But there's still a `<?custom data?>` PI.
 * If there's a `<!` BEFORE the PI, the loop breaks.
 * In this string: "<!badcomment" starts at 0, then "<![BADCDATA[" later.
 * After processing both, noMoreComments and noMoreCdata are true.
 * Next `<!` search from some position... actually the "<!badcomment" doesn't
 * have "--" after it, so line 43 check fails, and "<!badcomment" doesn't start
 * with "<![CDATA[", so line 52 fails. The first `<!` sets neither flag properly.
 *
 * Let me trace more carefully for simpler input:
 * `<!-- unclosed comment <![CDATA[ unclosed CDATA <?strip-me?> content`
 *
 * Iteration 1: searchFrom=0.
 * piIdx = indexOf('<?', 0) = position of '<?strip-me?>'. Let's say pos 50.
 * commentIdx = indexOf('<!', 0) = 0 (start of <!-- unclosed).
 * nextPi = 50, nextComment = 0. nextIdx = 0.
 * 0 !== 50 (not PI). Go to line 40.
 * str[2] = '-', str[3] = '-'. It's a comment!
 * end = indexOf('-->', 4) = -1 (unclosed!). noMoreComments = true.
 * searchFrom = 0 + 2 = 2.
 *
 * Iteration 2: searchFrom=2.
 * piIdx = indexOf('<?', 2) = 50.
 * commentIdx = indexOf('<!', 2) = 22 (position of <![CDATA[).
 * nextPi = 50, nextComment = 22. nextIdx = 22.
 * 22 !== 50. Line 40: idx = 22.
 * Line 43: !noMoreComments = false. Skip.
 * Line 52: !noMoreCdata && str.startsWith('<![CDATA[', 22)? Depends on string.
 * Let's say it does. end = indexOf(']]>', 31) = -1. noMoreCdata = true.
 * searchFrom is NOT updated (no continue). Falls to line 63.
 * Line 63: noMoreComments && noMoreCdata -> true. BREAK!
 *
 * The `<?strip-me?>` at position 50 is NEVER stripped!
 * The resulting string still contains `<?strip-me?>`.
 *
 * This is a confirmed logic bug: when both comment and CDATA flags are set,
 * the loop breaks prematurely, leaving unprocessed PIs in the content.
 *
 * However, the impact is limited: PIs in BPMN files are rare, and the
 * only PI that matters is `<?xml ...?>` which is preserved anyway.
 * The only affected PI would be a non-xml PI that appears AFTER an
 * unclosed comment AND unclosed CDATA.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { extractProcessIds } from '../client/bpmn-parser.mjs';

describe('BUG-FINDER-LOGIK-026: stripNonContent breaks too early with PI after bad comment/CDATA', () => {

  it('PI after unclosed comment and CDATA should still be stripped', () => {
    // This is an extreme edge case but tests the logic
    // We need: unclosed comment, then unclosed CDATA, then a PI, then process
    // The PI should be stripped but due to the break, it won't be.
    //
    // Actually, PIs don't contain process tags, so even if they're not stripped,
    // extractProcessIds still works because the process tag regex won't match
    // inside a PI. So let me construct a case where NOT stripping a PI
    // causes a false process ID match.
    //
    // Actually that can't happen because PIs use `<?...?>` syntax, not `<process>`.
    // So even if PIs aren't stripped, they won't produce false process IDs.
    //
    // However, I can verify that the PI IS present in the stripped output
    // by checking if content after the break still has `<?`.
    //
    // Since stripNonContent is not exported, I'll test indirectly.
    // A custom PI containing `<bpmn:process id="Hidden"` would be split
    // by the PI delimiters and would NOT be matched by PROCESS_TAG_RE
    // because the `<bpmn:process` would appear after `<?`.
    //
    // Actually, what if we have: <?fake <bpmn:process id="InPI" /> ?>
    // After stripping, the PI should be removed, and InPI not found.
    // But if the PI is NOT stripped (due to the bug), the `<bpmn:process`
    // WOULD be found because it appears in the un-stripped content.
    // The isInsideAttributeValue check wouldn't help because PIs are not attributes.
    //
    // Let me test this scenario.
    const xml = [
      '<!-- unclosed comment',
      '<![CDATA[ unclosed CDATA',
      '<?fake <bpmn:process id="InPI" /> ?>',
      '<bpmn:process id="Real" />'
    ].join('\n');

    const result = extractProcessIds(xml);

    // If the bug exists, "InPI" would be extracted because the PI isn't stripped.
    // Expected: only "Real" should be extracted.
    // But "InPI" is inside `<?...?>`. isInsideAttributeValue backward scan would
    // encounter `<?fake ` and see `<` as tag start -> return false.
    // So `<bpmn:process` at that position would not be considered inside an attribute.
    // The process tag regex matches. extractIdFromTag finds id="InPI".
    // SAFE_PROCESS_ID.test("InPI") = true. So it WOULD be extracted.
    //
    // Unless... the stripped content removes the PI. With the bug, it doesn't.
    assert.ok(!result.includes('InPI'),
      'BUG: Process ID inside unstripped PI should not be extracted');
  });
});
