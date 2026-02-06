const { HtmlTableRenderer } = require("./html-table-renderer");
const { ImageRenderer } = require("./image-renderer");

function getRenderer(renderType, adapters, logger) {
  switch (renderType) {
    case "html":
      return new HtmlTableRenderer(adapters, logger);
    case "image":
      return new ImageRenderer(adapters, logger);
    default:
      throw new Error(`Unsupported render type: ${renderType}`);
  }
}

module.exports = {
  getRenderer,
};
