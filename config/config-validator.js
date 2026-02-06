function validateConfig(config) {
  if (!config || typeof config !== "object") {
    throw new Error("config must be an object");
  }

  const requiredTopLevel = ["report_id", "sql", "render_blocks", "mail"];
  for (const key of requiredTopLevel) {
    if (!config[key]) {
      throw new Error(`config missing required field: ${key}`);
    }
  }

  if (!Array.isArray(config.render_blocks)) {
    throw new Error("render_blocks must be an array");
  }

  for (const block of config.render_blocks) {
    if (!block.id || !block.type || !block.render || block.order === undefined) {
      throw new Error(`invalid render block: ${JSON.stringify(block)}`);
    }
  }

  if (!config.mail.to || !Array.isArray(config.mail.to)) {
    throw new Error("mail.to must be an array");
  }

  return true;
}

module.exports = {
  validateConfig,
};
