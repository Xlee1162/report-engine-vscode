const path = require("path");
const { runReport } = require("./core/pipeline");
const { Logger } = require("./logger/logger");
const { MssqlAdapter } = require("./db/mssql-adapter");
const { ExcelAdapter } = require("./excel/excel-adapter");
const { SnapshotAdapter } = require("./render/snapshot-adapter");

async function main() {
  const configPath = process.argv[2] || path.join(__dirname, "config", "example-report.json");
  const logger = new Logger();

  const dbConfig = {
    server: process.env.DB_HOST,
    port: process.env.DB_PORT ? Number(process.env.DB_PORT) : undefined,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    options: {
      encrypt: process.env.DB_ENCRYPT === "true",
      trustServerCertificate: process.env.DB_TRUST_CERT === "true",
    },
  };

  const dbAdapter = dbConfig.server
    ? new MssqlAdapter(dbConfig, logger)
    : null;

  const adapters = {
    db: dbAdapter,
    rawdataStorage: null,
    excel: new ExcelAdapter(logger),
    snapshot: new SnapshotAdapter(logger),
    mail: null,
  };

  try {
    await runReport({ configPath, adapters, logger });
  } finally {
    if (dbAdapter) {
      await dbAdapter.close();
    }
  }
}

main().catch((error) => {
  console.error("Report execution failed", error);
  process.exit(1);
});
