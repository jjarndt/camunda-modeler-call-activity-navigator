import { extractProcessIds } from './bpmn-parser.mjs';
import { normalizePath } from './path-utils.mjs';

function parentDir(filePath) {
  return filePath.split(/[/\\]/).slice(0, -1).join('/');
}

function commonPrefixLength(dirA, dirB) {
  const partsA = dirA.split('/');
  const partsB = dirB.split('/');
  const limit = Math.min(partsA.length, partsB.length);

  let count = 0;
  for (let i = 0; i < limit; i++) {
    if (partsA[i] !== partsB[i]) break;
    count++;
  }

  return count;
}

export class NavigatorSearch {
  constructor({ fileSystem, index }) {
    this._fileSystem = fileSystem;
    this._index = index;
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
    try {
      const file = await this._fileSystem.readFile(filePath);
      const processIds = extractProcessIds(file?.contents || '');
      this._index.setFileIndex(filePath, processIds);
    } catch {
      // Mark as indexed with no processes to avoid repeated I/O failures
      this._index.setFileIndex(filePath, []);
    }
  }

  async getProcessIdsFromFile(filePath) {
    try {
      const file = await this._fileSystem.readFile(filePath);
      return extractProcessIds(file?.contents || '');
    } catch {
      return [];
    }
  }

  async searchInKnownFiles(processId, currentFilePath, knownFiles) {
    const normalizedCurrent = normalizePath(currentFilePath, '/');

    for (const filePath of (knownFiles ?? [])) {
      if (normalizePath(filePath, '/') === normalizedCurrent) continue;

      if (!this.isFileIndexed(filePath)) {
        await this.indexFile(filePath);
      }
    }

    const allLocations = this.getLocations(processId);
    const locations = normalizedCurrent
      ? allLocations.filter(loc => loc.path !== normalizedCurrent)
      : allLocations;

    if (locations.length > 0) {
      return this.findBestMatch(locations, currentFilePath).path;
    }

    return null;
  }

  findBestMatch(locations, currentFilePath) {
    if (!locations.length) return null;
    if (locations.length === 1 || !currentFilePath) {
      return locations[0];
    }

    const currentDir = parentDir(currentFilePath);
    let bestMatch = locations[0];
    let bestScore = 0;

    for (const location of locations) {
      const score = commonPrefixLength(currentDir, parentDir(location.path));

      if (score > bestScore) {
        bestScore = score;
        bestMatch = location;
      }
    }

    return bestMatch;
  }
}
