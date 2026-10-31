-- หมายเหตุ: backend จะสร้างตารางนี้ให้อัตโนมัติเมื่อเริ่มทำงาน (signatureController.ensureSignatureTable)
--          ไฟล์นี้มีไว้สำหรับสร้างด้วยตนเองผ่าน SSMS ได้เช่นกัน (รันซ้ำได้ ไม่สร้างซ้ำ)
IF OBJECT_ID(N'[EasyClaim_Dev].[dbo].[warehouse_signatures]', N'U') IS NULL
BEGIN
    CREATE TABLE [EasyClaim_Dev].[dbo].[warehouse_signatures] (
        signature_id   INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        warehouse      NVARCHAR(100) NOT NULL,
        reviewer_name  NVARCHAR(100) NULL,
        image_path     NVARCHAR(255) NOT NULL,
        updated_by     INT NULL,
        updated_at     DATETIME NOT NULL CONSTRAINT DF_warehouse_signatures_updated_at DEFAULT GETDATE()
    );
    CREATE UNIQUE INDEX UX_warehouse_signatures_warehouse
        ON [EasyClaim_Dev].[dbo].[warehouse_signatures] (warehouse);
END
GO
