const DAY_MS = 24 * 60 * 60 * 1000;

class SqlExecutor {
  constructor(dbAdapter, logger) {
    this.dbAdapter = dbAdapter;
    this.logger = logger;
  }

  async execute(sqlConfig, reportConfig) {
    if (!sqlConfig || !sqlConfig.stored_procedure) {
      throw new Error("sql.stored_procedure is required");
    }

    if (sqlConfig.mock_result) {
      this.logger.warn("Using mock SQL result", { report_id: reportConfig.report_id });
      return sqlConfig.mock_result;
    }

    if (!this.dbAdapter || typeof this.dbAdapter.callStoredProcedure !== "function") {
      throw new Error("db adapter with callStoredProcedure is required");
    }

    const params = this.resolveParams(sqlConfig.params || {});
    this.logger.info("Executing stored procedure", {
      stored_procedure: sqlConfig.stored_procedure,
      params,
    });

    return this.dbAdapter.callStoredProcedure(sqlConfig.stored_procedure, params);
  }

  resolveParams(params) {
    const now = new Date();
    const resolved = {};

    for (const [key, value] of Object.entries(params)) {
      if (typeof value === "string") {
        resolved[key] = this.resolveDateToken(value, now);
      } else {
        resolved[key] = value;
      }
    }

    return resolved;
  }

  resolveDateToken(value, now) {
    if (value === "{{date}}") {
      return this.formatDate(now);
    }

    const match = value.match(/^\{\{date-(\d+)\}\}$/);
    if (match) {
      const days = Number(match[1]);
      const date = new Date(now.getTime() - days * DAY_MS);
      return this.formatDate(date);
    }

    return value;
  }

  formatDate(date) {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }
}

module.exports = {
  SqlExecutor,
};
