class ExecutionContext {
  constructor({ config, adapters, logger }) {
    this.config = config;
    this.adapters = adapters || {};
    this.logger = logger;
    this.sqlResult = null;
    this.rawdata = null;
    this.excelOutput = null;
    this.renderBlocks = [];
    this.mailHtml = "";
  }
}

module.exports = {
  ExecutionContext,
};
