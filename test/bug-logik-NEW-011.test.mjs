/**
 * Bug-Logik-NEW-011: commonPrefixLength treats "/a/b" and "a/b" identically
 * because filter(Boolean) strips the leading empty segment from absolute paths.
 *
 * "/a/b".split('/') -> ["", "a", "b"] -> filter(Boolean) -> ["a", "b"]
 * "a/b".split('/') -> ["a", "b"] -> filter(Boolean) -> ["a", "b"]
 *
 * So commonPrefixLength("/a/b", "a/b") returns 2 (full match),
 * even though one is absolute and the other is relative.
 *
 * This allows findBestMatch to prefer a relative path over an absolute one
 * (or vice versa) when the path segments happen to coincide.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { NavigatorSearch } from '../client/navigator-search.mjs';

describe('BUG-LOGIK-NEW-011: commonPrefixLength conflates absolute and relative paths', () => {

  it('relative path gets same prefix score as absolute path against absolute currentDir', () => {
    const search = new NavigatorSearch({
      fileSystem: { readFile: async () => ({ contents: '' }) },
      index: { isIndexed: () => false, getLocations: () => [], setFileIndex: () => {}, removeFile: () => {} }
    });

    // currentFilePath = /project/src/current.bpmn
    // currentDir = /project/src
    // currentDir parts (after filter(Boolean)) = ["project", "src"]
    //
    // Location 1: "project/src/match.bpmn" (RELATIVE - no leading slash)
    //   parentDir = "project/src"
    //   parts = ["project", "src"]
    //   commonPrefixLength with ["project", "src"] = 2 (FULL MATCH!)
    //
    // Location 2: "/other/place/match.bpmn" (absolute but different path)
    //   parentDir = "/other/place"
    //   parts = ["other", "place"]
    //   commonPrefixLength with ["project", "src"] = 0
    //
    // findBestMatch picks Location 1 with score 2, even though it's a relative
    // path that has nothing to do with the actual /project/src directory.
    // The relative path "project/src/match.bpmn" refers to ./project/src/match.bpmn,
    // NOT /project/src/match.bpmn.

    const locations = [
      { path: '/other/place/match.bpmn' },
      { path: 'project/src/match.bpmn' }  // relative! NOT the same as /project/src/
    ];

    const result = search.findBestMatch(locations, '/project/src/current.bpmn');

    // A relative path should NOT score as high as the absolute equivalent
    assert.notStrictEqual(result.path, 'project/src/match.bpmn',
      'findBestMatch incorrectly preferred relative path "project/src/..." over ' +
      'absolute "/other/place/..." because commonPrefixLength conflates them. ' +
      `Got: "${result.path}"`);
  });
});
