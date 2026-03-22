/**
 * Bug-Logik-007: commonPrefixLength returns 1 for two empty strings.
 *
 * ''.split('/') yields [''] (an array with one empty-string element).
 * Since '' === '', commonPrefixLength('', '') returns 1 instead of 0.
 * This means two files with no common path get a non-zero similarity score,
 * which could cause findBestMatch to prefer an unrelated file over another.
 *
 * We test this through findBestMatch since commonPrefixLength is not exported.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { NavigatorSearch } from '../client/navigator-search.mjs';

describe('BUG-LOGIK-007: findBestMatch with empty-string path anomaly', () => {

  it('should prefer a file in a nearby directory over a file with empty path', () => {
    // Setup: two locations, one has an empty path (degenerate), one is close
    const search = new NavigatorSearch({ fileSystem: null, index: null });

    const locations = [
      { path: '' },                         // empty/degenerate
      { path: '/projects/app/process.bpmn' } // nearby
    ];

    const currentFile = '/projects/app/main.bpmn';

    // The nearby file shares /projects/app prefix -> score should be higher
    // But empty path '' split('/') = [''], and currentDir '/projects/app' split('/') = ['', 'projects', 'app']
    // '' matches '' -> score 1 for empty path!
    // '/projects/app' vs '/projects/app' split('/') = ['','projects','app'] vs ['','projects','app'] -> score 3
    // So actually the nearby file should still win here.
    // Let me construct the case where the empty path anomaly matters:

    const locations2 = [
      { path: '' },
      { path: '/other/dir/process.bpmn' }
    ];

    const currentFile2 = '/another/dir/main.bpmn';

    // currentDir = '/another/dir'
    // For empty path: parentDir('') = '', commonPrefixLength('/another/dir', '') ->
    //   '/another/dir'.split('/') = ['', 'another', 'dir']
    //   ''.split('/') = ['']
    //   '' === '' -> count = 1
    // For /other/dir/process.bpmn: parentDir = '/other/dir', commonPrefixLength('/another/dir', '/other/dir') ->
    //   ['', 'another', 'dir'] vs ['', 'other', 'dir']
    //   '' === '' -> count = 1
    //   'another' !== 'other' -> break
    //   count = 1
    // Both have score 1, so the first one (empty path) wins!
    const best = search.findBestMatch(locations2, currentFile2);

    // The file with an actual path should be preferred over an empty/degenerate path
    assert.equal(
      best.path,
      '/other/dir/process.bpmn',
      `Expected non-empty path to be preferred, but got "${best.path}". The empty-string split anomaly gives empty paths a false score of 1.`
    );
  });
});
