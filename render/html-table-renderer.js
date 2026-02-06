class HtmlTableRenderer {
  constructor(adapters, logger) {
    this.adapters = adapters || {};
    this.logger = logger;
  }

  async render(block, context) {
    const data = this.resolveData(block, context);
    const htmlContent = this.buildTableHtml(data);

    return { htmlContent };
  }

  resolveData(block, context) {
    if (block.data) {
      return block.data;
    }

    if (context.sqlResult && context.sqlResult[block.id]) {
      return context.sqlResult[block.id];
    }

    return [];
  }

  buildTableHtml(rows) {
    if (!Array.isArray(rows) || rows.length === 0) {
      return "<div><em>No data</em></div>";
    }

    const columns = Object.keys(rows[0]);
    const header = columns.map((col) => `<th>${col}</th>`).join("");
    const body = rows
      .map((row) => `<tr>${columns.map((col) => `<td>${row[col]}</td>`).join("")}</tr>`)
      .join("");

    return `
      <table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse; font-family: Arial, sans-serif; font-size: 12px;">
        <thead><tr>${header}</tr></thead>
        <tbody>${body}</tbody>
      </table>
    `;
  }
}

module.exports = {
  HtmlTableRenderer,
};
