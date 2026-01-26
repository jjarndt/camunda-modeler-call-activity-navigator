import React, { PureComponent } from 'react';
import { registerClientExtension } from 'camunda-modeler-plugin-helpers';

import CallActivityContextPadModule from './bpmn-extension';

class CallActivityNavigatorPlugin extends PureComponent {
  constructor(props) {
    super(props);

    const { subscribe, triggerAction, displayNotification, _getGlobal } = props;

    this._triggerAction = triggerAction;
    this._displayNotification = displayNotification;
    this._getGlobal = _getGlobal;
    this._activeTab = null;
    this._processIndex = new Map(); // processId -> Array<{path: string}>
    this._knownFiles = new Set(); // Dateien die wir vom Modeler kennen

    // Sammle Dateien die der Modeler uns mitteilt (ohne add-root aufzurufen)
    const backend = _getGlobal('backend');
    backend.on('file-context:changed', (_, items) => {
      if (!items) return;
      for (const item of items) {
        if (item.file?.path?.endsWith('.bpmn')) {
          this._knownFiles.add(item.file.path);
        }
      }
    });

    subscribe('app.activeTabChanged', ({ activeTab }) => {
      this._activeTab = activeTab;
    });

    subscribe('bpmn.modeler.configure', ({ middlewares }) => {
      middlewares.push(config => {
        return {
          ...config,
          additionalModules: [
            ...(config.additionalModules || []),
            CallActivityContextPadModule
          ]
        };
      });
    });

    subscribe('bpmn.modeler.created', ({ modeler }) => {
      const eventBus = modeler.get('eventBus');

      eventBus.on('callActivity.openProcess', (event) => {
        this._handleOpenProcess(event.processId);
      });
    });
  }

  async _handleOpenProcess(processId) {
    const currentFilePath = this._activeTab?.file?.path;

    if (!currentFilePath) {
      this._displayNotification({
        type: 'warning',
        title: 'Keine Datei geoeffnet',
        content: 'Bitte speichere die Datei zuerst.'
      });
      return;
    }

    // 1. Prüfe ob der Prozess in der aktuellen Datei eingebettet ist
    const embeddedProcessIds = await this._getProcessIdsFromFile(currentFilePath);
    if (embeddedProcessIds.includes(processId)) {
      this._displayNotification({
        type: 'info',
        title: 'Eingebetteter Prozess',
        content: `Der Prozess "${processId}" befindet sich bereits in dieser Datei.`
      });
      return;
    }

    // 2. Suche in bekannten Dateien (vom Modeler)
    const foundInKnown = await this._searchInKnownFiles(processId, currentFilePath);
    if (foundInKnown) {
      this._triggerAction('open-diagram', { path: foundInKnown });
      return;
    }

    // 3. Versuche relative Pfade basierend auf der Process-ID
    const foundRelative = await this._tryRelativePaths(processId, currentFilePath);
    if (foundRelative) {
      this._triggerAction('open-diagram', { path: foundRelative });
      return;
    }

    this._displayNotification({
      type: 'warning',
      title: 'Prozess nicht gefunden',
      content: `Konnte "${processId}" nicht finden. Oeffne die Datei manuell.`
    });
  }

  async _searchInKnownFiles(processId, currentFilePath) {
    // Scanne bekannte Dateien und baue Index on-demand
    for (const filePath of this._knownFiles) {
      if (filePath === currentFilePath) continue;

      // Prüfe ob wir diese Datei schon indexiert haben
      if (!this._isFileIndexed(filePath)) {
        await this._indexFile(filePath);
      }
    }

    // Suche im Index
    const locations = this._processIndex.get(processId);
    if (locations && locations.length > 0) {
      return this._findBestMatch(locations, currentFilePath).path;
    }

    return null;
  }

  _isFileIndexed(filePath) {
    for (const locations of this._processIndex.values()) {
      if (locations.some(loc => loc.path === filePath)) {
        return true;
      }
    }
    return false;
  }

  async _indexFile(filePath) {
    try {
      const processIds = await this._getProcessIdsFromFile(filePath);
      for (const pid of processIds) {
        const existing = this._processIndex.get(pid) || [];
        if (!existing.some(entry => entry.path === filePath)) {
          existing.push({ path: filePath });
          this._processIndex.set(pid, existing);
        }
      }
    } catch (error) {
      // Datei konnte nicht gelesen werden - ignorieren
    }
  }

  async _tryRelativePaths(processId, currentFilePath) {
    const currentDir = currentFilePath.split(/[/\\]/).slice(0, -1).join('/');
    const fileSystem = this._getGlobal('fileSystem');

    // Mögliche Dateinamen basierend auf der Process-ID
    const possibleNames = [
      `${processId}.bpmn`,
      `${processId.replace(/_/g, '-')}.bpmn`,
      `${processId.replace(/-/g, '_')}.bpmn`
    ];

    // Mögliche Verzeichnisse relativ zur aktuellen Datei
    const possibleDirs = [
      currentDir,                    // Gleiches Verzeichnis
      `${currentDir}/..`,            // Parent
      `${currentDir}/../..`,         // Grandparent
    ];

    for (const dir of possibleDirs) {
      for (const name of possibleNames) {
        const candidatePath = this._normalizePath(`${dir}/${name}`);

        try {
          const file = await fileSystem.readFile(candidatePath);
          if (file && file.contents) {
            // Verifiziere dass die Datei den gesuchten Prozess enthält
            const processIds = this._extractProcessIds(file.contents);
            if (processIds.includes(processId)) {
              // Zur bekannten Liste hinzufügen für zukünftige Suchen
              this._knownFiles.add(candidatePath);
              await this._indexFile(candidatePath);
              return candidatePath;
            }
          }
        } catch (error) {
          // Datei existiert nicht oder kann nicht gelesen werden - weiter
        }
      }
    }

    return null;
  }

  _normalizePath(path) {
    // Vereinfache Pfade wie /a/b/../c zu /a/c
    const parts = path.split('/');
    const normalized = [];

    for (const part of parts) {
      if (part === '..') {
        normalized.pop();
      } else if (part !== '.' && part !== '') {
        normalized.push(part);
      }
    }

    return '/' + normalized.join('/');
  }

  async _getProcessIdsFromFile(filePath) {
    try {
      const fileSystem = this._getGlobal('fileSystem');
      const file = await fileSystem.readFile(filePath);
      return this._extractProcessIds(file.contents);
    } catch (error) {
      return [];
    }
  }

  _extractProcessIds(content) {
    const processIds = [];
    const regex = /<bpmn2?:process[^>]+id="([^"]+)"/g;
    let match;

    while ((match = regex.exec(content)) !== null) {
      processIds.push(match[1]);
    }

    return processIds;
  }

  _findBestMatch(locations, currentFilePath) {
    if (locations.length === 1 || !currentFilePath) {
      return locations[0];
    }

    const currentDir = currentFilePath.split(/[/\\]/).slice(0, -1).join('/');
    let bestMatch = locations[0];
    let bestScore = 0;

    for (const location of locations) {
      const locationDir = location.path.split(/[/\\]/).slice(0, -1).join('/');
      const currentParts = currentDir.split('/');
      const locationParts = locationDir.split('/');
      let commonParts = 0;

      for (let i = 0; i < Math.min(currentParts.length, locationParts.length); i++) {
        if (currentParts[i] === locationParts[i]) {
          commonParts++;
        } else {
          break;
        }
      }

      if (commonParts > bestScore) {
        bestScore = commonParts;
        bestMatch = location;
      }
    }

    return bestMatch;
  }

  render() {
    return null;
  }
}

registerClientExtension(CallActivityNavigatorPlugin);
