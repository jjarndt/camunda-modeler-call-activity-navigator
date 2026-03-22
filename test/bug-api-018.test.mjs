import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { isNewerVersion } from '../client/update-check.mjs';

describe('Bug API-018: isNewerVersion scheitert bei v-Prefix in currentVersion', () => {

  it('erkennt Update nicht wenn currentVersion v-Prefix hat', () => {
    // __PLUGIN_VERSION__ koennte ein v-Prefix haben (je nach Build-Tool-Konfiguration).
    // checkForUpdate entfernt das v-Prefix nur von latestVersion (data.tag_name),
    // aber NICHT von currentVersion.
    // stripPreRelease entfernt nur -/+ Suffixe, nicht v-Prefixe.
    // "v1.0.0".split('.') => ['v1', '0', '0'], Number('v1') => NaN => return false
    const result = isNewerVersion('v1.0.0', '2.0.0');

    assert.strictEqual(result, true,
      'v1.0.0 -> 2.0.0 muss als Update erkannt werden');
  });

  it('funktioniert ohne v-Prefix (Kontrolle)', () => {
    const result = isNewerVersion('1.0.0', '2.0.0');
    assert.strictEqual(result, true, 'Ohne v-Prefix funktioniert es');
  });
});
