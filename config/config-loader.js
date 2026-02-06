const fs = require("fs");
const path = require("path");
const { validateConfig } = require("./config-validator");

async function loadConfig(configPath) {
  const absolutePath = path.isAbsolute(configPath)
    ? configPath
    : path.join(process.cwd(), configPath);

  const raw = await fs.promises.readFile(absolutePath, "utf-8");
  const config = JSON.parse(raw);

  validateConfig(config);

  return config;
}

module.exports = {
  loadConfig,
};
