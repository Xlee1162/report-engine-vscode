const { getRenderer } = require("../render/renderer-factory");

class BlockEngine {
  constructor(adapters, logger) {
    this.adapters = adapters || {};
    this.logger = logger;
  }

  async resolve(blocks, context) {
    if (!Array.isArray(blocks)) {
      throw new Error("render_blocks must be an array");
    }

    const resolved = [];

    for (const block of blocks) {
      this.validateBlock(block);
      const renderer = getRenderer(block.render, this.adapters, this.logger);
      const renderResult = await renderer.render(block, context);

      resolved.push({
        id: block.id,
        type: block.type,
        order: block.order,
        htmlContent: renderResult.htmlContent,
        imagePath: renderResult.imagePath,
      });
    }

    return resolved.sort((a, b) => a.order - b.order);
  }

  validateBlock(block) {
    const required = ["id", "type", "render", "order"];
    for (const key of required) {
      if (block[key] === undefined || block[key] === null) {
        throw new Error(`render block missing required field: ${key}`);
      }
    }
  }
}

module.exports = {
  BlockEngine,
};
