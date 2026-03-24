import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { getCalledProcessId } from '../client/bpmn-extension/util.mjs';

describe('Bug API-013: getCalledProcessId crasht wenn businessObject kein get() hat', () => {

  it('crasht mit TypeError statt calledElement zurueckzugeben', () => {
    // Ein Plain Object als businessObject - hat kein get() wie bpmn-moddle Objekte.
    // Dies ist ein realistisches Szenario, da die Funktion exportiert wird und
    // von externem Code aufgerufen werden koennte.
    const element = {
      businessObject: {
        calledElement: 'myProcess'
      }
    };

    // Erwartet: 'myProcess' (sollte calledElement auslesen)
    // Tatsaechlich: TypeError, weil getZeebeProcessId .get() aufruft
    assert.doesNotThrow(
      () => getCalledProcessId(element),
      'getCalledProcessId soll nicht crashen bei Plain Objects'
    );
  });

  it('crasht mit TypeError wenn element direkt ein Plain Object ohne get() ist', () => {
    // Fallback: element wird als businessObject behandelt (Zeile 15: element.businessObject || element)
    const element = {
      calledElement: 'directProcess'
    };

    assert.doesNotThrow(
      () => getCalledProcessId(element),
      'getCalledProcessId soll nicht crashen wenn element kein businessObject Property hat'
    );
  });
});
