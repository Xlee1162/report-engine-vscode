-- Database & Schema
IF DB_ID(N'report_engine') IS NULL
BEGIN
  CREATE DATABASE report_engine;
END
GO

USE report_engine;
GO

IF NOT EXISTS (SELECT 1 FROM sys.schemas WHERE name = N'dbo')
BEGIN
  EXEC('CREATE SCHEMA dbo');
END
GO

-- Table: ReportConfig (framework-level only)
IF OBJECT_ID(N'dbo.ReportConfig', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.ReportConfig (
    report_code        NVARCHAR(100) NOT NULL PRIMARY KEY,
    report_name        NVARCHAR(200) NULL,
    schedule_cron      NVARCHAR(100) NULL,
    timezone           NVARCHAR(100) NULL,
    data_scope_json    NVARCHAR(MAX) NULL,
    render_blocks_json NVARCHAR(MAX) NULL,
    mail_json          NVARCHAR(MAX) NULL,
    sql_meta_json      NVARCHAR(MAX) NULL,
    is_active          BIT NOT NULL DEFAULT(1),
    created_at         DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_at         DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
  );
END
GO

-- Table: ReportRunLog
IF OBJECT_ID(N'dbo.ReportRunLog', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.ReportRunLog (
    run_id       UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
    report_code  NVARCHAR(100) NOT NULL,
    start_time   DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    end_time     DATETIME2 NULL,
    status       NVARCHAR(50) NOT NULL,
    message      NVARCHAR(MAX) NULL,
    created_at   DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
  );

  CREATE INDEX IX_ReportRunLog_ReportCode_StartTime ON dbo.ReportRunLog(report_code, start_time DESC);
END
GO

-- Table: RawdataCache
IF OBJECT_ID(N'dbo.RawdataCache', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.RawdataCache (
    cache_id      BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    report_code   NVARCHAR(100) NOT NULL,
    dataset_name  NVARCHAR(120) NOT NULL,
    data_date     DATE NOT NULL,
    payload_json  NVARCHAR(MAX) NOT NULL,
    updated_at    DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
  );

  CREATE UNIQUE INDEX UX_RawdataCache_Report_Dataset_Date ON dbo.RawdataCache(report_code, dataset_name, data_date);
END
GO

-- Table: SnapshotMeta (optional)
IF OBJECT_ID(N'dbo.SnapshotMeta', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.SnapshotMeta (
    snapshot_id  BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    report_code  NVARCHAR(100) NOT NULL,
    block_id     NVARCHAR(120) NOT NULL,
    image_path   NVARCHAR(400) NOT NULL,
    run_id       UNIQUEIDENTIFIER NULL,
    created_at   DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
  );

  CREATE INDEX IX_SnapshotMeta_ReportCode_BlockId ON dbo.SnapshotMeta(report_code, block_id);
END
GO

-- Stored Procedure: sp_GetReportConfig
CREATE OR ALTER PROCEDURE dbo.sp_GetReportConfig
  @report_code NVARCHAR(100)
AS
BEGIN
  SET NOCOUNT ON;

  SELECT
    report_code,
    report_name,
    schedule_cron,
    timezone,
    data_scope_json,
    render_blocks_json,
    mail_json,
    sql_meta_json,
    is_active,
    created_at,
    updated_at
  FROM dbo.ReportConfig
  WHERE report_code = @report_code AND is_active = 1;
END
GO

-- Stored Procedure: sp_GetRawdataDelta
CREATE OR ALTER PROCEDURE dbo.sp_GetRawdataDelta
  @report_code NVARCHAR(100),
  @from_date   DATE,
  @to_date     DATE
AS
BEGIN
  SET NOCOUNT ON;

  SELECT
    report_code,
    dataset_name,
    data_date,
    payload_json
  FROM dbo.RawdataCache
  WHERE report_code = @report_code
    AND data_date BETWEEN @from_date AND @to_date
  ORDER BY data_date ASC;
END
GO

-- Stored Procedure: sp_MergeRawdataCache
CREATE OR ALTER PROCEDURE dbo.sp_MergeRawdataCache
  @report_code  NVARCHAR(100),
  @dataset_name NVARCHAR(120),
  @data_date    DATE,
  @payload_json NVARCHAR(MAX),
  @lookback_days INT = NULL
AS
BEGIN
  SET NOCOUNT ON;

  MERGE dbo.RawdataCache AS target
  USING (SELECT @report_code AS report_code, @dataset_name AS dataset_name, @data_date AS data_date) AS source
  ON target.report_code = source.report_code
     AND target.dataset_name = source.dataset_name
     AND target.data_date = source.data_date
  WHEN MATCHED THEN
    UPDATE SET payload_json = @payload_json, updated_at = SYSUTCDATETIME()
  WHEN NOT MATCHED THEN
    INSERT (report_code, dataset_name, data_date, payload_json)
    VALUES (@report_code, @dataset_name, @data_date, @payload_json);

  IF @lookback_days IS NOT NULL
  BEGIN
    DELETE FROM dbo.RawdataCache
    WHERE report_code = @report_code
      AND dataset_name = @dataset_name
      AND data_date < DATEADD(DAY, -@lookback_days, CAST(SYSUTCDATETIME() AS DATE));
  END
END
GO

-- Stored Procedure: sp_LogReportRun
CREATE OR ALTER PROCEDURE dbo.sp_LogReportRun
  @report_code NVARCHAR(100),
  @status      NVARCHAR(50),
  @message     NVARCHAR(MAX) = NULL,
  @run_id      UNIQUEIDENTIFIER = NULL
AS
BEGIN
  SET NOCOUNT ON;

  IF @run_id IS NULL
  BEGIN
    INSERT INTO dbo.ReportRunLog(report_code, status, message)
    VALUES (@report_code, @status, @message);
  END
  ELSE
  BEGIN
    UPDATE dbo.ReportRunLog
    SET status = @status,
        message = @message,
        end_time = SYSUTCDATETIME()
    WHERE run_id = @run_id;
  END
END
GO

-- Stored Procedure: sp_GetDatasetForReport
CREATE OR ALTER PROCEDURE dbo.sp_GetDatasetForReport
  @report_code NVARCHAR(100),
  @run_date    DATE
AS
BEGIN
  SET NOCOUNT ON;

  SELECT
    report_code,
    dataset_name,
    data_date,
    payload_json
  FROM dbo.RawdataCache
  WHERE report_code = @report_code
    AND data_date = @run_date;
END
GO
