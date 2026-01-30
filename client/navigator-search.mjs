import { extractProcessIds } from './bpmn-parser.mjs';

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
      const contents = file?.contents || '';
      const processIds = extractProcessIds(contents);
      this._index.setFileIndex(filePath, processIds);
    } catch (error) {
      // File could not be read - mark as indexed to avoid repeated I/O
      this._index.setFileIndex(filePath, []);
    }
  }

  async getProcessIdsFromFile(filePath) {
    try {
      const file = await this._fileSystem.readFile(filePath);
      return extractProcessIds(file?.contents || '');
    } catch (error) {
      return [];
    }
  }

  async searchInKnownFiles(processId, currentFilePath, knownFiles) {
    // Scan known files and build index on-demand
    for (const filePath of knownFiles) {
      if (filePath === currentFilePath) continue;

      // Check if we have already indexed this file
      if (!this.isFileIndexed(filePath)) {
        await this.indexFile(filePath);
      }
    }

    // Search in index
    const locations = this.getLocations(processId);
    if (locations && locations.length > 0) {
      return this.findBestMatch(locations, currentFilePath).path;
    }

    return null;
  }

  findBestMatch(locations, currentFilePath) {
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
}
