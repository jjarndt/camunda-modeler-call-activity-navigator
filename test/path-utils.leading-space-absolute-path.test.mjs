import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { normalizePath } from '../client/path-utils.mjs';
import { ProcessIndex } from '../client/process-index.mjs';

// ---------------------------------------------------------------------------
// BUG-DATA-NEW-002: normalizePath - fuehrender Space macht absoluten Pfad relativ
//
// stripControlChars entfernt nur Zeichen im Bereich 0x00-0x1f und 0x7f.
// Space (0x20) liegt ausserhalb dieses Bereichs und wird NICHT entfernt.
//
// Folge: ' /foo/bar' wird nach dem Strippen zu ' /foo/bar'.
// extractRoot(' /foo/bar', false) prueft path.startsWith('/') = false (Space vor /).
// Der Pfad wird als RELATIV behandelt, root = ''.
// split(/[\/]+/) ergibt [' ', 'foo', 'bar']: Das Space-Segment ' ' ist kein '.' oder '..',
// wird also als Verzeichnisname beibehalten.
// Ergebnis: ' /foo/bar' (unveraendert) statt '/foo/bar' (absolut).
//
// Das hat zwei Konsequenzen:
// 1. normalizePath gibt einen anderen String zurueck als fuer den 'sauberen' Pfad.
// 2. ProcessIndex speichert ' /foo/bar.bpmn' und isIndexed('/foo/bar.bpmn') gibt false.
// ---------------------------------------------------------------------------
describe('BUG-DATA-NEW-002: normalizePath - leading space prevents absolute-path detection', () => {

  it('normalizePath(" /foo/bar") should equal normalizePath("/foo/bar")', () => {
    const withLeadingSpace = normalizePath(' /foo/bar');
    const clean = normalizePath('/foo/bar');

    assert.equal(
      withLeadingSpace,
      clean,
      `normalizePath(' /foo/bar') = ${JSON.stringify(withLeadingSpace)}, ` +
      `normalizePath('/foo/bar') = ${JSON.stringify(clean)}. ` +
      `Leading space causes the absolute path to be treated as relative; ` +
      `stripControlChars only removes 0x00-0x1f/0x7f but not 0x20 (space).`
    );
  });

  it('ProcessIndex: setFileIndex with leading-space path and isIndexed without space - should match', () => {
    const idx = new ProcessIndex();
    idx.setFileIndex(' /projects/my-process.bpmn', ['proc1']);

    const found = idx.isIndexed('/projects/my-process.bpmn');
    assert.equal(
      found,
      true,
      `ProcessIndex stores path ${JSON.stringify(normalizePath(' /projects/my-process.bpmn', '/'))} ` +
      `but isIndexed('/projects/my-process.bpmn') returns ${found}. ` +
      `The same logical file is stored under two different keys due to the unstripped leading space.`
    );
  });

  it('ProcessIndex: duplicate entries for same logical path with and without leading space', () => {
    const idx = new ProcessIndex();
    idx.setFileIndex('/foo/bar.bpmn', ['proc1']);
    idx.setFileIndex(' /foo/bar.bpmn', ['proc1']); // same logical path, different key

    const locs = idx.getLocations('proc1');
    assert.equal(
      locs.length,
      1,
      `ProcessIndex created ${locs.length} location entries for the same logical file ` +
      `because '/foo/bar.bpmn' and ' /foo/bar.bpmn' are stored as different keys. ` +
      `Paths: ${locs.map(l => JSON.stringify(l.path)).join(', ')}`
    );
  });

});
