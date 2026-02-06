const path = require("path");
const fs = require("fs");

class ImageRenderer {
  constructor(adapters, logger) {
    this.adapters = adapters || {};
    this.logger = logger;
  }

  async render(block, context) {
    if (this.adapters.snapshot && typeof this.adapters.snapshot.renderRangeAsImage === "function") {
      const outputDir = path.join(process.cwd(), "output");
      await fs.promises.mkdir(outputDir, { recursive: true });
      const imagePath = path.join(outputDir, `${block.id}-${Date.now()}.png`);
      await this.adapters.snapshot.renderRangeAsImage({
        sheet: block.sheet,
        range: block.range,
        outputPath: imagePath,
        excelPath: context.excelOutput,
      });

      return { imagePath };
    }

    this.logger.warn("Snapshot adapter not configured", { block: block.id });
    return { htmlContent: "<div><em>Image renderer not configured</em></div>" };
  }
}

module.exports = {
  ImageRenderer,
};
