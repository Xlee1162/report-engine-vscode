const { ExecutionContext } = require("./context");
const { loadConfig } = require("../config/config-loader");
const { SqlExecutor } = require("../sql/sql-executor");
const { RawdataManager } = require("../rawdata/rawdata-manager");
const { ExcelGenerator } = require("../excel/excel-generator");
const { BlockEngine } = require("./block-engine");
const { MailRenderer } = require("../mail/mail-renderer");
const { MailSender } = require("../mail/mail-sender");

async function runReport({ configPath, adapters, logger }) {
  const config = await loadConfig(configPath);
  const context = new ExecutionContext({ config, adapters, logger });

  logger.info("Report started", { report_id: config.report_id });

  const sqlExecutor = new SqlExecutor(adapters.db, logger);
  context.sqlResult = await sqlExecutor.execute(config.sql, config);

  const rawdataManager = new RawdataManager(adapters.rawdataStorage, logger);
  context.rawdata = await rawdataManager.merge(context.sqlResult, config.data_scope);

  const excelGenerator = new ExcelGenerator(adapters.excel, logger);
  context.excelOutput = await excelGenerator.generate({
    excelConfig: config.excel,
    datasets: context.rawdata,
  });

  const blockEngine = new BlockEngine(adapters, logger);
  context.renderBlocks = await blockEngine.resolve(config.render_blocks, context);

  const mailRenderer = new MailRenderer(logger);
  context.mailHtml = await mailRenderer.render(config.mail, context.renderBlocks);

  const mailSender = new MailSender(adapters.mail, logger);
  await mailSender.send({
    mailConfig: config.mail,
    html: context.mailHtml,
    attachments: config.mail.attach_excel && context.excelOutput ? [context.excelOutput] : [],
  });

  logger.info("Report completed", { report_id: config.report_id });

  return context;
}

module.exports = {
  runReport,
};
