console.log('[CallActivityNavigator] CLIENT MODULE LOADING...');

import React, { PureComponent } from 'react';
import { registerClientExtension } from 'camunda-modeler-plugin-helpers';

import CallActivityContextPadModule from './bpmn-extension';

console.log('[CallActivityNavigator] CLIENT MODULE LOADED, registering...');

class CallActivityNavigatorPlugin extends PureComponent {
  constructor(props) {
    super(props);
    console.log('[CallActivityNavigator] PLUGIN CONSTRUCTOR START');

    const { subscribe, triggerAction, displayNotification, _getGlobal } = props;

    this._triggerAction = triggerAction;
    this._displayNotification = displayNotification;
    this._getGlobal = _getGlobal;
    this._activeTab = null;
    this._processIndex = new Map(); // processId -> Array<{path: string}>
    this._knownFiles = new Set(); // Files known from the modeler

    // Collect files reported by the modeler
    this._backend = _getGlobal('backend');
    this._rootAdded = false;

    this._backend.on('file-context:changed', (_, items) => {
      console.log('[CallActivityNavigator] file-context:changed event, items:', items?.length || 0);
      if (!items) return;
      for (const item of items) {
        if (item.file?.path?.endsWith('.bpmn')) {
          this._knownFiles.add(item.file.path);
        }
      }
      console.log('[CallActivityNavigator] knownFiles now:', this._knownFiles.size);
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
      console.log('[CallActivityNavigator] bpmn.modeler.created - registering listener');
      const eventBus = modeler.get('eventBus');
      console.log('[CallActivityNavigator] eventBus:', eventBus);

      eventBus.on('callActivity.openProcess', (event) => {
        console.log('[CallActivityNavigator] EVENT RECEIVED:', event);
        this._handleOpenProcess(event.processId);
      });
      console.log('[CallActivityNavigator] Listener registered');
    });
  }

  async _handleOpenProcess(processId) {
    console.log('[CallActivityNavigator] _handleOpenProcess START', { processId });
    const currentFilePath = this._activeTab?.file?.path;
    console.log('[CallActivityNavigator] currentFilePath:', currentFilePath);

    if (!currentFilePath) {
      this._displayNotification({
        type: 'warning',
        title: 'No file opened',
        content: 'Please save the file first.'
      });
      return;
    }

    // 1. Check if the process is embedded in the current file
    console.log('[CallActivityNavigator] Stage 1: Checking embedded processes...');
    const embeddedProcessIds = await this._getProcessIdsFromFile(currentFilePath);
    console.log('[CallActivityNavigator] Stage 1: embeddedProcessIds:', embeddedProcessIds);
    if (embeddedProcessIds.includes(processId)) {
      this._displayNotification({
        type: 'info',
        title: 'Embedded Process',
        content: `The process "${processId}" is already in this file.`
      });
      return;
    }

    // 2. Search in known files (from the modeler)
    console.log('[CallActivityNavigator] Stage 2: Searching in known files...');
    console.log('[CallActivityNavigator] Stage 2: knownFiles count:', this._knownFiles.size);
    console.log('[CallActivityNavigator] Stage 2: knownFiles:', [...this._knownFiles]);
    const foundInKnown = await this._searchInKnownFiles(processId, currentFilePath);
    console.log('[CallActivityNavigator] Stage 2: foundInKnown:', foundInKnown);
    if (foundInKnown) {
      this._triggerAction('open-diagram', { path: foundInKnown });
      return;
    }

    // 3. Try relative paths based on the process ID
    console.log('[CallActivityNavigator] Stage 3: Trying relative paths...');
    const foundRelative = await this._tryRelativePaths(processId, currentFilePath);
    console.log('[CallActivityNavigator] Stage 3: foundRelative:', foundRelative);
    if (foundRelative) {
      this._triggerAction('open-diagram', { path: foundRelative });
      return;
    }

    // 4. Project scan (if readDir is available)
    // 4. Scan sibling directories (since readDir is not available, try common patterns)
    console.log('[CallActivityNavigator] Stage 4: Scanning sibling directories...');
    try {
      const foundInSiblings = await this._searchInSiblingDirs(processId, currentFilePath);
      console.log('[CallActivityNavigator] Stage 4: foundInSiblings:', foundInSiblings);
      if (foundInSiblings) {
        this._triggerAction('open-diagram', { path: foundInSiblings });
        return;
      }
    } catch (error) {
      console.error('[CallActivityNavigator] Stage 4 failed:', error);
    }

    console.log('[CallActivityNavigator] ALL STAGES FAILED - showing notification');
    this._displayNotification({
      type: 'warning',
      title: 'Process not found',
      content: `Could not find "${processId}". Please open the file manually.`
    });
  }

  async _searchInKnownFiles(processId, currentFilePath) {
    // Scan known files and build index on-demand
    for (const filePath of this._knownFiles) {
      if (filePath === currentFilePath) continue;

      // Check if we have already indexed this file
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
      // File could not be read - ignore
    }
  }

  /**
   * Stage 4: Add project root to file-context and search all discovered files.
   * Uses backend.send('file-context:add-root') to discover all BPMN files.
   */
  async _searchInSiblingDirs(processId, currentFilePath) {
    // Find the "processes" or "bpmn" root directory
    const processesMatch = currentFilePath.match(/(.+\/(?:processes|bpmn))\//);
    if (!processesMatch) {
      console.log('[CallActivityNavigator] Stage 4: No processes/bpmn directory found in path');
      return null;
    }

    const rootDir = processesMatch[1];
    console.log('[CallActivityNavigator] Stage 4: rootDir:', rootDir);
    console.log('[CallActivityNavigator] Stage 4: knownFiles before add-root:', this._knownFiles.size);

    // Add root directory to file-context if not already added
    if (!this._rootAdded) {
      console.log('[CallActivityNavigator] Stage 4: Calling file-context:add-root with:', rootDir);
      console.log('[CallActivityNavigator] Stage 4: backend.send type:', typeof this._backend.send);

      try {
        // filePath is the correct parameter name (not path)
        const result = await this._backend.send('file-context:add-root', { filePath: rootDir });
        console.log('[CallActivityNavigator] Stage 4: add-root result:', result);
        this._rootAdded = true;

        // Wait for the file-context:changed event to fire
        await new Promise(resolve => setTimeout(resolve, 1000));
        console.log('[CallActivityNavigator] Stage 4: knownFiles after add-root:', this._knownFiles.size);
      } catch (error) {
        console.error('[CallActivityNavigator] Stage 4: add-root failed:', error);
        // Try alternative: just search known files without adding root
      }
    }

    // Now search all known files
    console.log('[CallActivityNavigator] Stage 4: Searching in', this._knownFiles.size, 'known files...');

    for (const filePath of this._knownFiles) {
      if (filePath === currentFilePath) continue;

      if (!this._isFileIndexed(filePath)) {
        console.log('[CallActivityNavigator] Stage 4: indexing:', filePath);
        await this._indexFile(filePath);

        // Check if we found it
        const locations = this._processIndex.get(processId);
        if (locations && locations.length > 0) {
          console.log('[CallActivityNavigator] Stage 4: FOUND!', locations);
          return this._findBestMatch(locations, currentFilePath).path;
        }
      }
    }

    console.log('[CallActivityNavigator] Stage 4: Not found in known files');
    return null;
  }

  async _tryRelativePaths(processId, currentFilePath) {
    const currentDir = currentFilePath.split(/[/\\]/).slice(0, -1).join('/');
    console.log('[CallActivityNavigator] Stage 3: currentDir:', currentDir);
    const fileSystem = this._getGlobal('fileSystem');

    // Possible file names based on the process ID
    const possibleNames = [
      `${processId}.bpmn`,
      `${processId.replace(/_/g, '-')}.bpmn`,
      `${processId.replace(/-/g, '_')}.bpmn`
    ];
    console.log('[CallActivityNavigator] Stage 3: possibleNames:', possibleNames);

    // Possible directories relative to the current file - go up to 5 levels
    const possibleDirs = [
      currentDir,                              // Same directory
      `${currentDir}/..`,                      // Parent
      `${currentDir}/../..`,                   // Grandparent
      `${currentDir}/../../..`,                // 3 levels up
      `${currentDir}/../../../..`,             // 4 levels up
      `${currentDir}/../../../../..`,          // 5 levels up
    ];
    console.log('[CallActivityNavigator] Stage 3: possibleDirs:', possibleDirs);

    for (const dir of possibleDirs) {
      for (const name of possibleNames) {
        const candidatePath = this._normalizePath(`${dir}/${name}`);
        console.log('[CallActivityNavigator] Stage 3: trying path:', candidatePath);

        try {
          const file = await fileSystem.readFile(candidatePath);
          console.log('[CallActivityNavigator] Stage 3: file read result:', file ? 'OK' : 'null', 'contents:', file?.contents?.length || 0, 'bytes');
          if (file && file.contents) {
            // Verify that the file contains the searched process
            const processIds = this._extractProcessIds(file.contents);
            console.log('[CallActivityNavigator] Stage 3: processIds in file:', processIds);
            if (processIds.includes(processId)) {
              console.log('[CallActivityNavigator] Stage 3: FOUND!', candidatePath);
              // Add to known list for future searches
              this._knownFiles.add(candidatePath);
              await this._indexFile(candidatePath);
              return candidatePath;
            }
          }
        } catch (error) {
          // File does not exist or cannot be read - continue
          console.log('[CallActivityNavigator] Stage 3: error for', candidatePath, ':', error.message || error);
        }
      }
    }

    return null;
  }

  _normalizePath(path) {
    // Simplify paths like /a/b/../c to /a/c
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
console.log('[CallActivityNavigator] REGISTERED!');
