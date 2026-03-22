import { extractProcessIds } from './bpmn-parser.mjs';
import { normalizePath } from './path-utils.mjs';

function parentDir(filePath) {
  return filePath.split(/[/\\]/).slice(0, -1).join('/');
}

function commonPrefixLength(dirA, dirB) {
  if (!dirA || !dirB) return 0;

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
  }

  isFileIndexed(filePath) {
    return this._index.isIndexed(filePath);
  }

  invalidateFile(filePath) {
    this._index.removeFile(filePath);
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
    try {
      const file = await this._fileSystem.readFile(filePath);
      const processIds = extractProcessIds(file?.contents || '');
      this._index.setFileIndex(filePath, processIds);
    } catch (err) {
      if (err instanceof TypeError) throw err;
      // Mark as indexed with no processes to avoid repeated I/O failures
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
    const normalizedCurrent = normalizePath(currentFilePath, '/');
    const currentDir = parentDir(normalizedCurrent);

    const candidates = [...(knownFiles ?? [])]
      .filter(f => isValidPath(f) && !pathsEqualIgnoreCase(normalizePath(f, '/'), normalizedCurrent))
      .sort((a, b) => {
        const dirA = parentDir(normalizePath(a, '/'));
        const dirB = parentDir(normalizePath(b, '/'));
        return commonPrefixLength(currentDir, dirB) - commonPrefixLength(currentDir, dirA);
      });

    for (const filePath of candidates) {
      if (!this.isFileIndexed(filePath)) {
        await this.indexFile(filePath);
      }

      // Only break if THIS candidate has the process (not a pre-indexed distant file)
      const normalizedFilePath = normalizePath(filePath, '/');
      const found = this.getLocations(processId);
      if (found.some(loc => loc.path === normalizedFilePath)) break;
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
    const valid = locations.filter(loc => loc?.path);
    if (!valid.length) return null;
    if (valid.length === 1 || !currentFilePath) {
      return valid[0];
    }

    const currentDir = parentDir(normalizePath(currentFilePath, '/'));
    let bestMatch = valid[0];
    let bestScore = -1;

    for (const location of valid) {
      const score = commonPrefixLength(currentDir, parentDir(location.path));

      if (score > bestScore) {
        bestScore = score;
        bestMatch = location;
      } else if (score === bestScore) {
        const locDepth = parentDir(location.path).split('/').filter(Boolean).length;
        const bestDepth = parentDir(bestMatch.path).split('/').filter(Boolean).length;
        if (locDepth < bestDepth || (locDepth === bestDepth && location.path < bestMatch.path)) {
          bestMatch = location;
        }
      }
    }

    return bestMatch;
  }
}
