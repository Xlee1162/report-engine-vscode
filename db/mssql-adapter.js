const sql = require("mssql");

class MssqlAdapter {
  constructor(config, logger) {
    this.config = config;
    this.logger = logger;
    this.pool = null;
  }

  async connect() {
    if (this.pool) {
      return this.pool;
    }

    this.pool = await sql.connect(this.config);
    return this.pool;
  }

  async callStoredProcedure(procName, params = {}) {
    if (!procName) {
      throw new Error("Stored procedure name is required");
    }

    const pool = await this.connect();
    const request = pool.request();

    for (const [key, value] of Object.entries(params)) {
      request.input(key, value);
    }

    const result = await request.execute(procName);
    return result.recordsets.length === 1 ? result.recordsets[0] : result.recordsets;
  }

  async close() {
    if (this.pool) {
      await this.pool.close();
      this.pool = null;
    }
  }
}

module.exports = {
  MssqlAdapter,
};
