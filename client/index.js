console.log('[CallActivityNavigator] CLIENT MODULE LOADING...');

import React, { PureComponent } from 'react';
import { registerClientExtension } from 'camunda-modeler-plugin-helpers';

import CallActivityContextPadModule from './bpmn-extension';
import { getPathSeparator, normalizePath } from './path-utils.mjs';
import { ProcessIndex } from './process-index.mjs';
import { NavigatorSearch } from './navigator-search.mjs';
import { extractProcessIds } from './bpmn-parser.mjs';

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
    this._index = new ProcessIndex();
    this._search = new NavigatorSearch({
      fileSystem: _getGlobal('fileSystem'),
      index: this._index
    });
    this._knownFiles = new Set(); // Files known from the modeler

    // Collect files reported by the modeler
    this._backend = _getGlobal('backend');
    this._rootAdded = false;

    this._backend.on('file-context:changed', (_, items) => {
      console.log('[CallActivityNavigator] file-context:changed event, items:', items?.length || 0);
      if (!items) return;
      for (const item of items) {
        const filePath = item.file?.path;
        if (!filePath || !filePath.endsWith('.bpmn')) continue;

        const isRemoved = item.type === 'removed' ||
          item.type === 'deleted' ||
          item.action === 'removed' ||
          item.action === 'deleted' ||
          item.removed === true ||
          item.deleted === true;

        if (isRemoved) {
          this._knownFiles.delete(filePath);
          this._search.invalidateFile(filePath);
          continue;
        }

        // Mark as known and dirty so we re-index on next search
        this._knownFiles.add(filePath);
        this._search.invalidateFile(filePath);
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
    const embeddedProcessIds = await this._search.getProcessIdsFromFile(currentFilePath);
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
    return this._search.searchInKnownFiles(processId, currentFilePath, this._knownFiles);
  }

  /**
   * Stage 4: Add project root to file-context and search all discovered files.
   * Uses backend.send('file-context:add-root') to discover all BPMN files.
   */
  async _searchInSiblingDirs(processId, currentFilePath) {
    // Find the "processes" or "bpmn" root directory
    const processesMatch = currentFilePath.match(/(.+[\\/](?:processes|bpmn))[\\/]/);
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

      if (!this._search.isFileIndexed(filePath)) {
        console.log('[CallActivityNavigator] Stage 4: indexing:', filePath);
        await this._search.indexFile(filePath);

        // Check if we found it
        const locations = this._search.getLocations(processId);
        if (locations && locations.length > 0) {
          console.log('[CallActivityNavigator] Stage 4: FOUND!', locations);
          return this._search.findBestMatch(locations, currentFilePath).path;
        }
      }
    }

    console.log('[CallActivityNavigator] Stage 4: Not found in known files');
    return null;
  }

  async _tryRelativePaths(processId, currentFilePath) {
    const pathSep = getPathSeparator(currentFilePath);
    const currentDir = currentFilePath.split(/[/\\]/).slice(0, -1).join(pathSep);
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
      currentDir,                                              // Same directory
      `${currentDir}${pathSep}..`,                             // Parent
      `${currentDir}${pathSep}..${pathSep}..`,                 // Grandparent
      `${currentDir}${pathSep}..${pathSep}..${pathSep}..`,     // 3 levels up
      `${currentDir}${pathSep}..${pathSep}..${pathSep}..${pathSep}..`, // 4 levels up
      `${currentDir}${pathSep}..${pathSep}..${pathSep}..${pathSep}..${pathSep}..`, // 5 levels up
    ];
    console.log('[CallActivityNavigator] Stage 3: possibleDirs:', possibleDirs);

    for (const dir of possibleDirs) {
      for (const name of possibleNames) {
        const candidatePath = normalizePath(`${dir}${pathSep}${name}`, pathSep);
        console.log('[CallActivityNavigator] Stage 3: trying path:', candidatePath);

        try {
          const file = await fileSystem.readFile(candidatePath);
          console.log('[CallActivityNavigator] Stage 3: file read result:', file ? 'OK' : 'null', 'contents:', file?.contents?.length || 0, 'bytes');
          if (file && file.contents) {
            // Verify that the file contains the searched process
            const processIds = extractProcessIds(file.contents);
            console.log('[CallActivityNavigator] Stage 3: processIds in file:', processIds);
            if (processIds.includes(processId)) {
              console.log('[CallActivityNavigator] Stage 3: FOUND!', candidatePath);
              // Add to known list for future searches
              this._knownFiles.add(candidatePath);
              await this._search.indexFile(candidatePath);
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

  render() {
    return null;
  }
}

registerClientExtension(CallActivityNavigatorPlugin);
console.log('[CallActivityNavigator] REGISTERED!');
