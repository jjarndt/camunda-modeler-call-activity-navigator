import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { extractProcessIds } from '../client/bpmn-parser.mjs';

describe('Bug API-012: extractProcessIds erkennt process-Tags ohne Namespace-Prefix nicht', () => {

  it('erkennt <process id="..."> ohne Namespace-Prefix', () => {
    // Manche BPMN-Tools exportieren process-Tags ohne Namespace-Prefix,
    // wenn der Default-Namespace auf BPMN gesetzt ist.
    const bpmn = `<?xml version="1.0" encoding="UTF-8"?>
<definitions xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL">
  <process id="myProcess" isExecutable="true">
  </process>
</definitions>`;

    const result = extractProcessIds(bpmn);
    assert.deepStrictEqual(result, ['myProcess'],
      'process-Tag ohne Namespace-Prefix muss erkannt werden');
  });

  it('erkennt <bpmn:process id="..."> mit Standard-Prefix', () => {
    // Kontrolle: Standard-Prefix funktioniert
    const bpmn = `<bpmn:definitions><bpmn:process id="stdProcess"></bpmn:process></bpmn:definitions>`;
    const result = extractProcessIds(bpmn);
    assert.deepStrictEqual(result, ['stdProcess']);
  });

  it('erkennt <bpmn2:process id="..."> mit bpmn2-Prefix', () => {
    // Kontrolle: bpmn2-Prefix funktioniert
    const bpmn = `<bpmn2:definitions><bpmn2:process id="bpmn2Process"></bpmn2:process></bpmn2:definitions>`;
    const result = extractProcessIds(bpmn);
    assert.deepStrictEqual(result, ['bpmn2Process']);
  });
});
