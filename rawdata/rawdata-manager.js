const fs = require("fs");
const path = require("path");

class RawdataManager {
  constructor(storageAdapter, logger) {
    this.storageAdapter = storageAdapter;
    this.logger = logger;
  }

  async merge(sqlResult, dataScope = {}) {
    if (!sqlResult || typeof sqlResult !== "object") {
      throw new Error("SQL result is required for rawdata merge");
    }

    const storagePath = dataScope.storage_path;
    if (!storagePath) {
      return sqlResult;
    }

    const absolutePath = path.isAbsolute(storagePath)
      ? storagePath
      : path.join(process.cwd(), storagePath);

    if (this.storageAdapter && typeof this.storageAdapter.load === "function") {
      const previous = await this.storageAdapter.load(absolutePath);
      return this.combine(previous, sqlResult);
    }

    let previous = null;
    try {
      const raw = await fs.promises.readFile(absolutePath, "utf-8");
      previous = JSON.parse(raw);
    } catch (error) {
      this.logger.warn("Rawdata storage not found, creating new", { path: absolutePath });
    }

    const merged = this.combine(previous, sqlResult);
    await fs.promises.mkdir(path.dirname(absolutePath), { recursive: true });
    await fs.promises.writeFile(absolutePath, JSON.stringify(merged, null, 2));

    return merged;
  }

  combine(previous, current) {
    if (!previous) {
      return current;
    }

    return {
      ...previous,
      ...current,
    };
  }
}

module.exports = {
  RawdataManager,
};
