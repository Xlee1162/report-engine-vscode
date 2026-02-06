const fs = require("fs");
const path = require("path");

class ExcelGenerator {
  constructor(excelAdapter, logger) {
    this.excelAdapter = excelAdapter;
    this.logger = logger;
  }

  async generate({ excelConfig = {}, datasets }) {
    if (!excelConfig) {
      return null;
    }

    if (this.excelAdapter && typeof this.excelAdapter.generateExcel === "function") {
      return this.excelAdapter.generateExcel(excelConfig, datasets);
    }

    const outputDir = path.join(process.cwd(), "output");
    await fs.promises.mkdir(outputDir, { recursive: true });
    const outputPath = path.join(outputDir, `report-${Date.now()}.json`);
    await fs.promises.writeFile(outputPath, JSON.stringify({ excelConfig, datasets }, null, 2));
    this.logger.warn("Excel adapter not configured, wrote JSON placeholder", { outputPath });
    return outputPath;
  }
}

module.exports = {
  ExcelGenerator,
};
