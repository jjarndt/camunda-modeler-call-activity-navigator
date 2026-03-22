import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { normalizePath } from '../client/path-utils.mjs';
import { ProcessIndex } from '../client/process-index.mjs';

// ---------------------------------------------------------------------------
// BUG-DATA-002: normalizePath zerstoert UNC-Pfade wenn preferredSep='/' ist
//
// ProcessIndex ruft normalizePath(filePath, '/') auf (process-index.mjs Zeilen
// 10, 18, 34). Wenn filePath ein Windows UNC-Pfad ist (z.B. \\server\share\...),
// dann:
//   sep='/' => isWindows=false
//   extractRoot: path.startsWith('/') ist false -> root='', rest=vollstaendiger Pfad
//   split(/[\\/]+/) liefert ['', '', 'server', 'share', ...] aber leere Teile
//   werden durch die `if (!part || part === '.')` Bedingung gefiltert.
//   Result: 'server/share/dir/file.bpmn' (absoluter Prefix '\\\\' verloren!)
//
// Konsequenz: Der resultierende Pfad ist relativ statt absolut. Wenn zwei
// verschiedene BPMN-Dateien mit gleichem Pfad-Suffix (aber auf anderen Servern)
// im Index gespeichert werden, ersetzen sie sich gegenseitig.
// ---------------------------------------------------------------------------
describe('BUG-DATA-002: normalizePath destroys UNC path when preferredSep is /', () => {
  it('UNC path must retain its absolute //server/share prefix when normalized with /', () => {
    const input = '\\\\server\\share\\projects\\foo.bpmn';
    const result = normalizePath(input, '/');

    assert.ok(
      result.startsWith('//') || result.startsWith('\\\\'),
      `UNC path lost its absolute prefix: got "${result}" from "${input}". ` +
      `The path is now indistinguishable from a relative path.`
    );
  });

  it('indexing a UNC path then checking isIndexed must return true for the same logical path', () => {
    const idx = new ProcessIndex();
    const uncPath = '\\\\server-a\\share\\work\\proc.bpmn';
    idx.setFileIndex(uncPath, ['my-process']);

    // isIndexed('\\\\server-a\\share\\work\\proc.bpmn') ruft normalizePath(path, '/') auf
    // und erhaelt 'server-a/share/work/proc.bpmn' (kein '//' Prefix).
    // _processesByFile speichert den Schlussel als 'server-a/share/work/proc.bpmn'.
    // isIndexed sucht nach demselben normalisierten Pfad => true.
    // Das waere KORREKT intern. Aber wenn ein anderer Code normalizePath mit
    // anderem Separator nutzt, gibt es Mismatches.

    // Kritischer Test: normalizePath(uncPath, '/') liefert einen relativen Pfad
    // der nicht mehr als absoluter UNC-Pfad erkannt wird.
    const normalised = normalizePath(uncPath, '/');
    assert.ok(
      normalised.startsWith('//') || normalised.startsWith('\\\\'),
      `normalizePath('${uncPath}', '/') = '${normalised}' – UNC absolute prefix verloren. ` +
      `Ein relativer Pfad und ein UNC-Pfad mit gleichem Suffix sind jetzt ununterscheidbar.`
    );
  });
});
