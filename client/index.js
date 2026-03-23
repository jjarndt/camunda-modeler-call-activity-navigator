import { PureComponent } from 'react';
import { registerClientExtension } from 'camunda-modeler-plugin-helpers';

import CallActivityContextPadModule from './bpmn-extension';
import { getPathSeparator, normalizePath } from './path-utils.mjs';
import { ProcessIndex } from './process-index.mjs';
import { NavigatorSearch } from './navigator-search.mjs';
import { extractProcessIds } from './bpmn-parser.mjs';
import { waitForFileDiscovery } from './file-discovery.mjs';
import { debug, error } from './log.mjs';
import { checkForUpdate } from './update-check.mjs';

const VALID_PROCESS_ID = /^(?!(?:CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(?:\.|$))[a-zA-Z0-9_\-.]+$/i;
const UPDATE_CHECK_DELAY_MS = 30_000;
const BPMN_ROOT_PATTERN = /^((?:[^\\/]*[\\/])*(?:processes|bpmn))[\\/]/;

function isFileRemoval(item) {
  return item.type === 'removed' ||
    item.type === 'deleted' ||
    item.action === 'removed' ||
    item.action === 'deleted' ||
    item.removed === true ||
    item.deleted === true;
}

class CallActivityNavigatorPlugin extends PureComponent {
  constructor(props) {
    super(props);

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
    this._knownFiles = new Set();
    this._fileContextListeners = [];
    this._searchInProgress = null;
    this._backend = _getGlobal('backend');
    this._addedRoots = new Set();

    this._backend.on('file-context:changed', (_, items) => this._onFileContextChanged(items));

    subscribe('app.activeTabChanged', ({ activeTab }) => {
      this._activeTab = activeTab;
    });

    this._scheduleUpdateCheck();
    this._configureModeler(subscribe);
  }

  _onFileContextChanged(items) {
    if (!items) return;

    for (const item of items) {
      const filePath = item.file?.path;
      if (!filePath || !filePath.endsWith('.bpmn')) continue;

      if (isFileRemoval(item)) {
        this._knownFiles.delete(filePath);
        this._search.invalidateFile(filePath);
        continue;
      }

      this._knownFiles.add(filePath);
      this._search.invalidateFile(filePath);
    }

    debug('file-context:changed, knownFiles:', this._knownFiles.size);

    for (const listener of this._fileContextListeners) {
      listener();
    }
  }

  _scheduleUpdateCheck() {
    setTimeout(() => {
      checkForUpdate(__PLUGIN_VERSION__).then(async result => {
        debug('update check result:', JSON.stringify(result));
        if (!result.available) return;

        if (result.downloadUrl) {
          try {
            await this._autoUpdate(result);
            return;
          } catch (err) {
            error('auto-update failed, showing manual hint:', err);
          }
        }

        this._displayNotification({
          type: 'info',
          title: 'Update available',
          content: `Call Activity Navigator v${result.latest} is available. Run: curl -fsSL https://raw.githubusercontent.com/jjarndt/camunda-modeler-call-activity-navigator/master/install.sh | bash`
        });
      }).catch(err => {
        error('update check error:', err);
      });
    }, UPDATE_CHECK_DELAY_MS);
  }

  async _autoUpdate(result) {
    debug('auto-update: downloading', result.downloadUrl);

    const response = await fetch(result.downloadUrl, {
      signal: AbortSignal.timeout(30_000)
    });
    if (!response.ok) throw new Error(`Download failed: ${response.status}`);

    const blob = await response.blob();
    const arrayBuffer = await blob.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);

    const pluginDir = this._resolvePluginDir();
    if (!pluginDir) throw new Error('Could not determine plugin directory');

    debug('auto-update: extracting to', pluginDir);
    await this._extractZip(bytes, pluginDir);

    debug('auto-update: v' + result.latest + ' installed');
    this._displayNotification({
      type: 'success',
      title: 'Plugin updated',
      content: `Call Activity Navigator updated to v${result.latest}. Restart Camunda Modeler to apply.`
    });
  }

  _resolvePluginDir() {
    try {
      // eslint-disable-next-line no-undef
      const nodeRequire = window.require || (typeof __non_webpack_require__ !== 'undefined' ? __non_webpack_require__ : null);
      if (!nodeRequire) return null;

      const fs = nodeRequire('fs');
      const path = nodeRequire('path');

      const candidates = [
        path.join(process.env.HOME || '', 'Library/Application Support/camunda-modeler/plugins/camunda-modeler-call-activity-navigator'),
        path.join(process.env.HOME || '', '.config/camunda-modeler/plugins/camunda-modeler-call-activity-navigator'),
        path.join(process.env.APPDATA || '', 'camunda-modeler/plugins/camunda-modeler-call-activity-navigator')
      ];

      for (const dir of candidates) {
        if (fs.existsSync(path.join(dir, 'index.js'))) return dir;
      }
    } catch {
      // Not in Node context
    }
    return null;
  }

  async _extractZip(zipBytes, targetDir) {
    // eslint-disable-next-line no-undef
    const nodeRequire = window.require || __non_webpack_require__;
    const fs = nodeRequire('fs');
    const path = nodeRequire('path');
    const { execSync } = nodeRequire('child_process');
    const os = nodeRequire('os');

    const tmpZip = path.join(os.tmpdir(), `can-update-${Date.now()}.zip`);
    fs.writeFileSync(tmpZip, Buffer.from(zipBytes));

    try {
      const tmpExtract = path.join(os.tmpdir(), `can-extract-${Date.now()}`);
      fs.mkdirSync(tmpExtract, { recursive: true });

      execSync(`unzip -qo "${tmpZip}" -d "${tmpExtract}"`);

      // Find the plugin root inside the extracted dir
      const entries = fs.readdirSync(tmpExtract);
      const pluginRoot = entries.includes('index.js')
        ? tmpExtract
        : path.join(tmpExtract, entries.find(e => fs.statSync(path.join(tmpExtract, e)).isDirectory()) || '');

      // Copy dist/client.js and index.js
      const srcDist = path.join(pluginRoot, 'dist', 'client.js');
      const srcIndex = path.join(pluginRoot, 'index.js');

      if (fs.existsSync(srcDist)) {
        fs.mkdirSync(path.join(targetDir, 'dist'), { recursive: true });
        fs.copyFileSync(srcDist, path.join(targetDir, 'dist', 'client.js'));
      }
      if (fs.existsSync(srcIndex)) {
        fs.copyFileSync(srcIndex, path.join(targetDir, 'index.js'));
      }

      // Cleanup
      fs.rmSync(tmpExtract, { recursive: true, force: true });
    } finally {
      fs.unlinkSync(tmpZip);
    }
  }

  _configureModeler(subscribe) {
    subscribe('bpmn.modeler.configure', ({ middlewares }) => {
      middlewares.push(config => ({
        ...config,
        additionalModules: [
          ...(config.additionalModules || []),
          CallActivityContextPadModule
        ]
      }));
    });

    this._openProcessHandler = (event) => {
      debug('openProcess:', event.processId);
      this._handleOpenProcess(event.processId);
    };

    subscribe('bpmn.modeler.created', ({ modeler }) => {
      if (this._currentEventBus) {
        this._currentEventBus.off('callActivity.openProcess', this._openProcessHandler);
      }
      const eventBus = modeler.get('eventBus');
      this._currentEventBus = eventBus;
      eventBus.on('callActivity.openProcess', this._openProcessHandler);
    });
  }

  async _handleOpenProcess(processId) {
    const previous = this._searchInProgress;
    const current = (async () => {
      if (previous) await previous;
      return this._doHandleOpenProcess(processId);
    })();
    this._searchInProgress = current;
    try {
      await current;
    } finally {
      if (this._searchInProgress === current) {
        this._searchInProgress = null;
      }
    }
  }

  async _doHandleOpenProcess(processId) {
    if (!VALID_PROCESS_ID.test(processId)) {
      return this._warn('Invalid process ID', 'The process ID contains invalid characters.');
    }

    const currentFilePath = this._activeTab?.file?.path;

    if (!currentFilePath) {
      return this._warn('No file opened', 'Please save the file first.');
    }

    // Embedded in current file?
    const embeddedProcessIds = await this._search.getProcessIdsFromFile(currentFilePath);
    if (embeddedProcessIds.includes(processId)) {
      this._displayNotification({
        type: 'info',
        title: 'Embedded Process',
        content: `The process "${processId}" is already in this file.`
      });
      return;
    }

    // Known files
    const foundInKnown = await this._searchInKnownFiles(processId, currentFilePath);
    if (foundInKnown) return this._openDiagram(foundInKnown);

    // Relative paths
    const foundRelative = await this._tryRelativePaths(processId, currentFilePath);
    if (foundRelative) return this._openDiagram(foundRelative);

    // Sibling directories
    try {
      const foundInSiblings = await this._searchInSiblingDirs(processId, currentFilePath);
      if (foundInSiblings) return this._openDiagram(foundInSiblings);
    } catch (err) {
      error('project scan failed:', err);
    }

    this._warn('Process not found', `Could not find "${processId}". Please open the file manually.`);
  }

  _openDiagram(path) {
    this._triggerAction('open-diagram', { path });
  }

  _warn(title, content) {
    this._displayNotification({ type: 'warning', title, content });
  }

  async _searchInKnownFiles(processId, currentFilePath) {
    return this._search.searchInKnownFiles(processId, currentFilePath, this._knownFiles);
  }

  async _searchInSiblingDirs(processId, currentFilePath) {
    const processesMatch = currentFilePath.match(BPMN_ROOT_PATTERN);
    if (!processesMatch) {
      return null;
    }

    const rootDir = processesMatch[1];

    await this._discoverRoot(rootDir);

    const normalizedCurrent = normalizePath(currentFilePath, '/');

    for (const filePath of this._knownFiles) {
      if (normalizePath(filePath, '/') === normalizedCurrent) continue;

      if (!this._search.isFileIndexed(filePath)) {
        await this._search.indexFile(filePath);

        const found = this._search.getLocations(processId);
        if (found.some(loc => loc.path !== normalizedCurrent)) break;
      }
    }

    const locations = this._search.getLocations(processId);
    if (locations?.length > 0) {
      const match = this._search.findBestMatch(locations, currentFilePath);
      return match ? match.path : null;
    }

    return null;
  }

  _waitForFileDiscovery() {
    return waitForFileDiscovery(this._fileContextListeners);
  }

  async _discoverRoot(rootDir) {
    if (this._addedRoots.has(rootDir)) return;

    try {
      const knownFilesBefore = this._knownFiles.size;
      await this._backend.send('file-context:add-root', { filePath: rootDir });
      await this._waitForFileDiscovery();

      const newFilesCount = this._knownFiles.size - knownFilesBefore;
      debug('discovered', newFilesCount, 'new files in', rootDir);

      this._addedRoots.add(rootDir);
    } catch (err) {
      error('add-root failed:', err);
    }
  }

  async _tryRelativePaths(processId, currentFilePath) {
    const pathSep = getPathSeparator(currentFilePath);
    const currentDir = currentFilePath.split(/[/\\]/).slice(0, -1).join(pathSep);
    const fileSystem = this._getGlobal('fileSystem');

    const candidateNames = this._buildCandidateNames(processId);
    const parentDirs = this._buildParentDirs(currentDir, pathSep, 5);

    for (const searchDir of parentDirs) {
      for (const name of candidateNames) {
        const candidatePath = normalizePath(`${searchDir}${pathSep}${name}`, pathSep);

        try {
          const file = await fileSystem.readFile(candidatePath);
          if (file?.contents) {
            const processIds = extractProcessIds(file.contents);
            this._index.setFileIndex(candidatePath, processIds);
            if (processIds.includes(processId)) {
              const normalizedCandidate = normalizePath(candidatePath, '/');
              this._knownFiles.add(normalizedCandidate);
              return normalizedCandidate;
            }
          }
        } catch {
        }
      }
    }

    return null;
  }

  _buildCandidateNames(processId) {
    return [...new Set([
      `${processId}.bpmn`,
      `${processId.replace(/_/g, '-')}.bpmn`,
      `${processId.replace(/-/g, '_')}.bpmn`
    ])];
  }

  _buildParentDirs(currentDir, pathSep, maxLevels) {
    if (!currentDir) return [currentDir];

    const dirs = [currentDir];
    let dir = currentDir;
    for (let i = 0; i < maxLevels; i++) {
      const parent = normalizePath(`${dir}${pathSep}..`, pathSep);
      if (!parent || parent === dir || parent === '.') break;
      dir = parent;
      dirs.push(dir);
    }
    return dirs;
  }

  render() {
    return null;
  }
}

registerClientExtension(CallActivityNavigatorPlugin);
