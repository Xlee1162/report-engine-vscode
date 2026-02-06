const path = require("path");
const fs = require("fs");
const ExcelJS = require("exceljs");

class ExcelAdapter {
  constructor(logger) {
    this.logger = logger;
  }

  async generateExcel(excelConfig = {}, datasets = {}) {
    const templatePath = excelConfig.template
      ? this.resolvePath(excelConfig.template)
      : null;

    if (templatePath && path.extname(templatePath).toLowerCase() === ".xlsb") {
      const outputPath = await this.copyOpaqueTemplate(templatePath, excelConfig, datasets);
      return outputPath;
    }

    const workbook = new ExcelJS.Workbook();

    if (templatePath) {
      await workbook.xlsx.readFile(templatePath);
    }

    await this.writeDatasets(workbook, excelConfig, datasets);

    const outputPath = this.resolveOutputPath(excelConfig, templatePath, ".xlsx");
    await fs.promises.mkdir(path.dirname(outputPath), { recursive: true });
    await workbook.xlsx.writeFile(outputPath);

    return outputPath;
  }

  resolvePath(filePath) {
    return path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);
  }

  resolveOutputPath(excelConfig, templatePath, fallbackExt) {
    if (excelConfig.output_path) {
      return this.resolvePath(excelConfig.output_path);
    }

    const ext = templatePath ? path.extname(templatePath) : fallbackExt;
    const baseName = `report-${Date.now()}`;
    return path.join(process.cwd(), "output", `${baseName}${ext}`);
  }

  async copyOpaqueTemplate(templatePath, excelConfig, datasets) {
    const outputPath = this.resolveOutputPath(excelConfig, templatePath, ".xlsb");
    await fs.promises.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.promises.copyFile(templatePath, outputPath);

    if (datasets && Object.keys(datasets).length > 0) {
      this.logger.warn(".xlsb template treated as opaque. Datasets were not written.", {
        template: templatePath,
        output: outputPath,
      });
    }

    return outputPath;
  }

  async writeDatasets(workbook, excelConfig, datasets) {
    const datasetMap = Array.isArray(excelConfig.dataset_map)
      ? excelConfig.dataset_map
      : null;

    if (datasetMap) {
      for (const mapping of datasetMap) {
        const data = datasets[mapping.dataset];
        if (!data) {
          continue;
        }

        const sheetName = mapping.sheet || mapping.dataset;
        const startCell = mapping.start_cell || "A1";
        const worksheet = this.getOrCreateSheet(workbook, sheetName);
        this.writeTable(worksheet, startCell, data, mapping.include_header !== false);
      }

      return;
    }

    for (const [datasetName, data] of Object.entries(datasets)) {
      const worksheet = this.getOrCreateSheet(workbook, datasetName);
      this.writeTable(worksheet, "A1", data, true);
    }
  }

  getOrCreateSheet(workbook, sheetName) {
    let worksheet = workbook.getWorksheet(sheetName);
    if (!worksheet) {
      worksheet = workbook.addWorksheet(sheetName);
    }
    return worksheet;
  }

  writeTable(worksheet, startCell, rows, includeHeader) {
    if (!Array.isArray(rows) || rows.length === 0) {
      return;
    }

    const cell = worksheet.getCell(startCell);
    const startRow = cell.row;
    const startCol = cell.col;

    if (Array.isArray(rows[0])) {
      rows.forEach((row, rowIndex) => {
        row.forEach((value, colIndex) => {
          worksheet.getCell(startRow + rowIndex, startCol + colIndex).value = value;
        });
      });
      return;
    }

    const columns = Object.keys(rows[0]);
    let rowOffset = 0;

    if (includeHeader) {
      columns.forEach((col, colIndex) => {
        worksheet.getCell(startRow, startCol + colIndex).value = col;
      });
      rowOffset = 1;
    }

    rows.forEach((row, rowIndex) => {
      columns.forEach((col, colIndex) => {
        worksheet.getCell(startRow + rowIndex + rowOffset, startCol + colIndex).value = row[col];
      });
    });
  }
}

module.exports = {
  ExcelAdapter,
};
