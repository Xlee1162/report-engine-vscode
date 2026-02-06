const path = require("path");
const fs = require("fs");
const ExcelJS = require("exceljs");
const sharp = require("sharp");

class SnapshotAdapter {
  constructor(logger) {
    this.logger = logger;
  }

  async renderRangeAsImage({ sheet, range, outputPath, excelPath }) {
    if (!excelPath) {
      throw new Error("excelPath is required for snapshot rendering");
    }

    if (!range) {
      throw new Error("range is required for snapshot rendering");
    }

    const ext = path.extname(excelPath).toLowerCase();
    if (ext === ".xlsb") {
      return this.writePlaceholder(outputPath, "XLSB snapshot not supported");
    }

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(excelPath);

    const worksheet = workbook.getWorksheet(sheet);
    if (!worksheet) {
      throw new Error(`Worksheet not found: ${sheet}`);
    }

    const { startRow, endRow, startCol, endCol } = this.parseRange(range);
    const rows = [];
    for (let r = startRow; r <= endRow; r += 1) {
      const row = [];
      for (let c = startCol; c <= endCol; c += 1) {
        const cellValue = worksheet.getCell(r, c).value;
        row.push(this.formatCellValue(cellValue));
      }
      rows.push(row);
    }

    const svg = this.buildTableSvg(rows);
    await fs.promises.mkdir(path.dirname(outputPath), { recursive: true });
    await sharp(Buffer.from(svg)).png().toFile(outputPath);

    return outputPath;
  }

  parseRange(range) {
    const match = range.match(/^([A-Z]+)(\d+):([A-Z]+)(\d+)$/i);
    if (!match) {
      throw new Error(`Invalid range: ${range}`);
    }

    const startCol = this.columnToNumber(match[1]);
    const startRow = Number(match[2]);
    const endCol = this.columnToNumber(match[3]);
    const endRow = Number(match[4]);

    return { startRow, endRow, startCol, endCol };
  }

  columnToNumber(column) {
    let result = 0;
    const letters = column.toUpperCase();
    for (let i = 0; i < letters.length; i += 1) {
      result = result * 26 + (letters.charCodeAt(i) - 64);
    }
    return result;
  }

  formatCellValue(value) {
    if (value === null || value === undefined) {
      return "";
    }

    if (typeof value === "object") {
      if (value.text) {
        return value.text;
      }
      if (value.richText) {
        return value.richText.map((part) => part.text).join("");
      }
      if (value.result !== undefined) {
        return String(value.result);
      }
      if (value instanceof Date) {
        return value.toISOString().slice(0, 10);
      }
    }

    return String(value);
  }

  buildTableSvg(rows) {
    const cellWidth = 140;
    const cellHeight = 28;
    const rowsCount = rows.length || 1;
    const colsCount = rows[0] ? rows[0].length : 1;
    const width = colsCount * cellWidth + 2;
    const height = rowsCount * cellHeight + 2;

    let svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
  <rect width="100%" height="100%" fill="#ffffff" />
`;

    rows.forEach((row, rIndex) => {
      row.forEach((value, cIndex) => {
        const x = cIndex * cellWidth + 1;
        const y = rIndex * cellHeight + 1;
        svg += `  <rect x="${x}" y="${y}" width="${cellWidth}" height="${cellHeight}" fill="#ffffff" stroke="#d0d0d0" />\n`;
        svg += `  <text x="${x + 6}" y="${y + 18}" font-family="Arial, sans-serif" font-size="12" fill="#222">${this.escapeXml(value)}</text>\n`;
      });
    });

    svg += "</svg>";
    return svg;
  }

  escapeXml(text) {
    return String(text)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&apos;");
  }

  async writePlaceholder(outputPath, message) {
    const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="640" height="120">
  <rect width="100%" height="100%" fill="#fff4f4" stroke="#ffb3b3" />
  <text x="20" y="60" font-family="Arial, sans-serif" font-size="14" fill="#cc0000">${this.escapeXml(message)}</text>
</svg>`;
    await fs.promises.mkdir(path.dirname(outputPath), { recursive: true });
    await sharp(Buffer.from(svg)).png().toFile(outputPath);
    this.logger.warn(message, { outputPath });
    return outputPath;
  }
}

module.exports = {
  SnapshotAdapter,
};
