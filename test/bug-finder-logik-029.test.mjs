/**
 * Bug-Finder-Logik-029: file-discovery removeListener uses splice(-1, 1)
 * when listener is not found, which removes the LAST element.
 *
 * The removeListener function:
 *   function removeListener(listeners, listener) {
 *     const idx = listeners.indexOf(listener);
 *     if (idx >= 0) listeners.splice(idx, 1);
 *   }
 *
 * Wait... it has `if (idx >= 0)` guard. So splice(-1, 1) should NOT happen
 * because indexOf returns -1 when not found, and -1 >= 0 is false.
 *
 * Let me re-read... line 6-8:
 *   function removeListener(listeners, listener) {
 *     const idx = listeners.indexOf(listener);
 *     if (idx >= 0) listeners.splice(idx, 1);
 *   }
 *
 * Yes, there IS a guard. My earlier analysis in test 011 was WRONG about
 * removeListener being called twice causing corruption.
 *
 * In waitForFileDiscovery's done():
 *   function done() {
 *     clearTimeout(debounceTimer);
 *     clearTimeout(maxTimer);
 *     removeListener(listeners, onEvent);
 *     resolve();
 *   }
 *
 * If done() is called twice (unlikely due to clearTimeout):
 * First call: removeListener removes onEvent. OK.
 * Second call: indexOf(onEvent) returns -1. idx < 0. splice not called. OK.
 *
 * But CAN done() be called twice? Let me check:
 * 1. maxTimer fires -> done(). Clears debounceTimer and maxTimer (no-op for self).
 * 2. debounceTimer was already cleared. Can't fire.
 *
 * What if both timers fire "simultaneously" (in the same microtask batch)?
 * In Node.js, setTimeout callbacks are called one at a time. So even if both
 * are scheduled at the same tick, one fires first, clears the other,
 * and the second never fires.
 *
 * So done() CAN'T be called twice. And even if it could, the guard prevents
 * corruption. My test 011 was testing something that can't happen.
 *
 * Let me look for bugs in a different area. What about the regex in extractRoot
 * for UNC paths? Let me test edge cases.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { normalizePath } from '../client/path-utils.mjs';

describe('BUG-FINDER-LOGIK-029: UNC path edge cases in normalizePath', () => {

  it('UNC path with only server (no share)', () => {
    // \\server has no share component
    // extractWindowsRoot regex: /^(?:\\\\|\/\/)[^\\/]+[\\/][^\\/]+/
    // "\\\\server" doesn't match (no separator after server, no share)
    // Falls through to drive letter check (no match).
    // Falls through to "starts with \\" check? No, extractRoot checks hasBackslash first.
    // Actually, extractRoot calls extractWindowsRoot which returns empty root.
    // Then line 18: path.startsWith('\\') -> yes.
    // Returns { root: '/', rest: '\\server' minus first char }
    // Wait, path.startsWith('/') || path.startsWith('\\')?
    // "\\server" starts with '\\' -> yes.
    // Returns { root: '/', rest: 'server' } (hmm, loses the second \)
    //
    // Actually "\\server" starts with '\'. So yes.
    // Returns { root: '/', rest: '\\server'.slice(1) } = { root: '/', rest: 'server' }
    //
    // BUT we already tried extractWindowsRoot which didn't match UNC.
    // So the fallback treats it as a root-relative path.
    // normalizePath("\\\\server", "\\") would give:
    // isWindows = true. extractRoot calls extractWindowsRoot.
    // UNC regex on "\\\\server": /^(?:\\\\|\/\/)[^\\/]+[\\/][^\\/]+/
    // "\\\\server" -> \\\\[^\\/]+ matches "\\\\server" but then needs [\\/][^\\/]+
    // for the share name. No match.
    // Drive letter: no match.
    // extractWindowsRoot returns empty.
    // Back in extractRoot: line 18: "\\\\server".startsWith('\\') -> true.
    // Returns { root: '/', rest: '\\server' minus first char }
    // Wait, path = "\\\\server". path.startsWith('/') = false.
    // path.startsWith('\\') = true. slice(1) = "\\server".
    // root = '/', rest = '\\server', hasRootSep = true.
    //
    // parts = rest.split(/[\\/]+/) = ["", "server"]. Filter empty: ["server"].
    // normalized = ["server"]. joined = "server".
    // root = '/'. isWindows = true. rootChar = '\\'.
    // Return rootChar + joined = "\\server".
    //
    // Expected: "\\\\server" normalized = "\\server" (lost one backslash).
    // This is a bug: UNC path \\server\ loses the \\server prefix and becomes \server.
    const result = normalizePath('\\\\server', '\\');
    assert.equal(result, '\\\\server',
      'UNC path without share should preserve double backslash');
  });

  it('UNC path with server and share', () => {
    const result = normalizePath('\\\\server\\share\\dir\\file.txt', '\\');
    assert.equal(result, '\\\\server\\share\\dir\\file.txt');
  });

  it('UNC path forward slashes', () => {
    const result = normalizePath('//server/share/dir/file.txt', '/');
    assert.equal(result, '//server/share/dir/file.txt');
  });
});
