import { extractProcessIds } from './bpmn-parser.mjs';
import { normalizePath } from './path-utils.mjs';

function parentDir(filePath) {
  return filePath.split(/[/\\]/).slice(0, -1).join('/');
}

function commonPrefixLength(dirA, dirB) {
  if (!dirA || !dirB) return 0;

  const aIsAbsolute = dirA.startsWith('/');
  const bIsAbsolute = dirB.startsWith('/');
  if (aIsAbsolute !== bIsAbsolute) return 0;

  const partsA = dirA.split('/').filter(Boolean);
  const partsB = dirB.split('/').filter(Boolean);
  const limit = Math.min(partsA.length, partsB.length);

  let count = 0;
  for (let i = 0; i < limit; i++) {
    if (partsA[i].toLowerCase() !== partsB[i].toLowerCase()) break;
    count++;
  }

  return count;
}

function isValidPath(filePath) {
  return filePath && typeof filePath === 'string' && filePath.trim() !== '';
}

function pathsEqualIgnoreCase(a, b) {
  if (!a || !b) return false;
  return a.toLowerCase() === b.toLowerCase();
}

export class NavigatorSearch {
  constructor({ fileSystem, index }) {
    if (!fileSystem) throw new TypeError('fileSystem is required');
    if (!index) throw new TypeError('index is required');
    this._fileSystem = fileSystem;
    this._index = index;
    this._indexingPromises = new Map();
    this._indexVersion = new Map();
  }

  isFileIndexed(filePath) {
    return this._index.isIndexed(filePath);
  }

  invalidateFile(filePath) {
    this._index.removeFile(filePath);
    const normalized = normalizePath(filePath, '/');
    this._indexVersion.set(normalized, (this._indexVersion.get(normalized) || 0) + 1);
  }

  getLocations(processId) {
    return this._index.getLocations(processId);
  }

  async indexFile(filePath) {
    if (!isValidPath(filePath)) return;

    const normalized = normalizePath(filePath, '/');
    const existing = this._indexingPromises.get(normalized);
    if (existing) return existing;

    const promise = this._doIndexFile(filePath);
    this._indexingPromises.set(normalized, promise);
    try {
      await promise;
    } finally {
      this._indexingPromises.delete(normalized);
    }
  }

  async _doIndexFile(filePath) {
    const normalized = normalizePath(filePath, '/');
    const versionBefore = this._indexVersion.get(normalized) || 0;
    try {
      const file = await this._fileSystem.readFile(filePath);
      const versionAfter = this._indexVersion.get(normalized) || 0;
      if (versionAfter !== versionBefore) return; // invalidated during read
      const processIds = extractProcessIds(file?.contents || '');
      this._index.setFileIndex(filePath, processIds);
    } catch (err) {
      if (err instanceof TypeError) throw err;
      const versionAfter = this._indexVersion.get(normalized) || 0;
      if (versionAfter !== versionBefore) return;
      this._index.setFileIndex(filePath, []);
    }
  }

  async getProcessIdsFromFile(filePath) {
    if (!isValidPath(filePath)) return [];
    try {
      const file = await this._fileSystem.readFile(filePath);
      return extractProcessIds(file?.contents || '');
    } catch (err) {
      if (err instanceof TypeError) throw err;
      return [];
    }
  }

  async searchInKnownFiles(processId, currentFilePath, knownFiles) {
    if (typeof processId === 'string') processId = processId.trim();
    const normalizedCurrent = normalizePath(currentFilePath, '/');
    const currentDir = parentDir(normalizedCurrent);

    const files = typeof knownFiles === 'string' ? [knownFiles] : [...(knownFiles ?? [])];
    const candidates = files
      .filter(f => isValidPath(f) && !pathsEqualIgnoreCase(normalizePath(f, '/'), normalizedCurrent))
      .map(f => ({ f, dir: parentDir(normalizePath(f, '/')) }))
      .sort((a, b) => commonPrefixLength(currentDir, b.dir) - commonPrefixLength(currentDir, a.dir))
      .map(x => x.f);

    for (const filePath of candidates) {
      const normalizedFilePath = normalizePath(filePath, '/');

      // Skip if already found for this process
      const rawLocs = this._index._rawLocations(processId);
      if (rawLocs.some(loc => pathsEqualIgnoreCase(loc.path, normalizedFilePath))) {
        break;
      }

      if (!this.isFileIndexed(filePath)) {
        try {
          await this.indexFile(filePath);
        } catch {
          continue;
        }

        const found = this._index._rawLocations(processId);
        if (found.some(loc => pathsEqualIgnoreCase(loc.path, normalizedFilePath))) break;
      }
    }

    const allLocations = this.getLocations(processId);
    const locations = normalizedCurrent
      ? allLocations.filter(loc => !pathsEqualIgnoreCase(loc.path, normalizedCurrent))
      : allLocations;

    if (locations.length > 0) {
      const match = this.findBestMatch(locations, normalizedCurrent);
      return match ? match.path : null;
    }

    return null;
  }

  findBestMatch(locations, currentFilePath) {
    if (!Array.isArray(locations)) return null;
    const normalizedCurrent = currentFilePath ? normalizePath(currentFilePath, '/') : null;
    const valid = locations.filter(loc =>
      loc?.path && (!normalizedCurrent || !pathsEqualIgnoreCase(normalizePath(loc.path, '/'), normalizedCurrent))
    );
    if (!valid.length) return null;
    if (valid.length === 1 || !currentFilePath) {
      return valid[0];
    }

    const currentDir = parentDir(normalizePath(currentFilePath, '/'));
    let bestMatch = valid[0];
    let bestScore = -1;
    let bestDir = parentDir(valid[0].path);

    for (const location of valid) {
      const dir = parentDir(location.path);
      const score = commonPrefixLength(currentDir, dir);

      if (score > bestScore) {
        bestScore = score;
        bestMatch = location;
        bestDir = dir;
      } else if (score === bestScore) {
        const locDepth = dir.split('/').filter(Boolean).length;
        const bestDepth = bestDir.split('/').filter(Boolean).length;
        if (locDepth < bestDepth || (locDepth === bestDepth && location.path < bestMatch.path)) {
          bestMatch = location;
          bestDir = dir;
        }
      }
    }

    return bestMatch;
  }
}
