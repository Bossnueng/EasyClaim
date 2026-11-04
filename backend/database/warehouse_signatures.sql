IF OBJECT_ID(N'[dbo].[warehouse_signatures]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[warehouse_signatures] (
        signature_id   INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        warehouse      NVARCHAR(100) NOT NULL,
        reviewer_name  NVARCHAR(100) NULL,
        image_path     NVARCHAR(255) NOT NULL,
        updated_by     INT NULL,
        updated_at     DATETIME NOT NULL CONSTRAINT DF_warehouse_signatures_updated_at DEFAULT GETDATE()
    );
    CREATE UNIQUE INDEX UX_warehouse_signatures_warehouse
        ON [dbo].[warehouse_signatures] (warehouse);
END
GO

IF OBJECT_ID(N'[dbo].[warehouse_signature_history]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[warehouse_signature_history] (
        history_id     INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        warehouse      NVARCHAR(100) NOT NULL,
        reviewer_name  NVARCHAR(100) NULL,
        image_path     NVARCHAR(255) NULL,
        effective_from DATETIME NOT NULL CONSTRAINT DF_warehouse_signature_history_effective_from DEFAULT GETDATE(),
        created_by     INT NULL
    );
    CREATE INDEX IX_warehouse_signature_history_warehouse
        ON [dbo].[warehouse_signature_history] (warehouse, effective_from);
END
GO

INSERT INTO [dbo].[warehouse_signature_history] (warehouse, reviewer_name, image_path, effective_from, created_by)
SELECT s.warehouse, s.reviewer_name, s.image_path, s.updated_at, s.updated_by
FROM [dbo].[warehouse_signatures] s
WHERE NOT EXISTS (
    SELECT 1 FROM [dbo].[warehouse_signature_history] h WHERE h.warehouse = s.warehouse
);
GO
