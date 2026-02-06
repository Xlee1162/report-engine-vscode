class MailRenderer {
  constructor(logger) {
    this.logger = logger;
  }

  async render(mailConfig, renderBlocks) {
    const blocks = [...renderBlocks].sort((a, b) => a.order - b.order);
    const htmlFragments = blocks.map((block) => this.renderBlock(block));

    return `
      <html>
        <body>
          <h2>${mailConfig.subject || "Report"}</h2>
          ${htmlFragments.join("\n")}
        </body>
      </html>
    `;
  }

  renderBlock(block) {
    if (block.htmlContent) {
      return `<div style="margin-bottom: 16px;">${block.htmlContent}</div>`;
    }

    if (block.imagePath) {
      return `
        <div style="margin-bottom: 16px;">
          <img src="${block.imagePath}" alt="${block.id}" style="max-width: 100%;" />
        </div>
      `;
    }

    return `<div><em>Empty block: ${block.id}</em></div>`;
  }
}

module.exports = {
  MailRenderer,
};
