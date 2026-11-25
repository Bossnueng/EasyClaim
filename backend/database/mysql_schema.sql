-- =====================================================================
-- bev-claim : โครงสร้างตาราง MySQL 8 / MariaDB 10.5+
--
-- แปลงจาก SSMS Generate Scripts ของ SQL Server [EasyClaim_Dev] (26/11/2026)
-- ตรงกับต้นฉบับทุกตาราง: ชื่อ/ลำดับคอลัมน์, ชนิด, NULL, DEFAULT, PRIMARY KEY, UNIQUE, FOREIGN KEY
--
--   SQL Server                     MySQL
--   [int] IDENTITY(1,1)       →    INT AUTO_INCREMENT
--   [nvarchar](n)/[varchar](n)→    VARCHAR(n)  (utf8mb4 รองรับภาษาไทย)
--   [bit]                     →    TINYINT(1)
--   [decimal](18,2)           →    DECIMAL(18,2)
--   [date] / [datetime]       →    DATE / DATETIME
--   DEFAULT (getdate())       →    DEFAULT CURRENT_TIMESTAMP
--
-- วิธีรันใน MySQL Workbench
--   1) เปิดไฟล์นี้ (File > Open SQL Script)
--   2) ถ้าต้องการชื่อ database อื่น ให้แก้ทั้งบรรทัด CREATE DATABASE และ USE ด้านล่าง
--   3) กดปุ่ม ⚡ (Execute) ที่รันทั้งไฟล์ (Ctrl+Shift+Enter)
--
-- รันซ้ำได้ — CREATE TABLE IF NOT EXISTS ไม่ลบ/ไม่แก้ตารางที่มีอยู่แล้ว
-- ถ้าต้องการสร้างใหม่ทั้งหมด ให้เปิดคอมเมนต์ส่วน "ลบตารางเดิม" (ข้อมูลจะหายทั้งหมด)
--
-- ⚠️ ชื่อตาราง Delivery ต้องเป็น D ตัวใหญ่ (MySQL บน Linux แยกตัวพิมพ์ใหญ่/เล็ก และโค้ดใช้ Delivery)
-- =====================================================================

-- สร้าง database ให้เองถ้ายังไม่มี (เครื่อง dev) — ถ้ามีอยู่แล้วจะข้ามไป
-- บน server ที่ user ไม่มีสิทธิ์ CREATE DATABASE ให้คอมเมนต์บรรทัดนี้ออก
CREATE DATABASE IF NOT EXISTS bevclaim_uat CHARACTER SET utf8mb4;
USE bevclaim_uat;

SET NAMES utf8mb4;

-- ---------------------------------------------------------------------
-- ลบตารางเดิม (ปิดไว้ — เปิดเฉพาะตอนต้องการสร้างใหม่ทั้งหมด)
-- ---------------------------------------------------------------------
-- SET FOREIGN_KEY_CHECKS = 0;
-- DROP TABLE IF EXISTS claim_images, claim_items, claim_approves, claim_status_logs, claims,
--                      user_agents, users, agents, items, roles, Delivery,
--                      warehouse_signature_history, warehouse_signatures;
-- SET FOREIGN_KEY_CHECKS = 1;

-- ---------------------------------------------------------------------
-- ตาราง (เรียงตามลำดับ FOREIGN KEY: ตารางแม่ก่อนตารางลูก)
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS agents (
    agent_id           INT           NOT NULL AUTO_INCREMENT,
    agent_code         VARCHAR(50)   NOT NULL,
    agent_name         VARCHAR(255)  NOT NULL,
    status             TINYINT(1)    NOT NULL DEFAULT 1,
    created_at         DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    teams_webhook_url  VARCHAR(255)  NULL,
    PRIMARY KEY (agent_id),
    UNIQUE KEY UQ_agents_agent_code (agent_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS users (
    user_id        INT           NOT NULL AUTO_INCREMENT,
    username       VARCHAR(50)   NOT NULL,
    password_hash  VARCHAR(255)  NOT NULL,
    full_name      VARCHAR(200)  NOT NULL,
    email          VARCHAR(150)  NULL,
    phone          VARCHAR(20)   NULL,
    role_id        INT           NOT NULL,
    status         VARCHAR(20)   NOT NULL DEFAULT 'ACTIVE',
    last_login     DATETIME      NULL,
    created_at     DATETIME      NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at     DATETIME      NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id),
    UNIQUE KEY UQ_users_username (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS claims (
    claim_id                INT           NOT NULL AUTO_INCREMENT,
    claim_no                VARCHAR(50)   NOT NULL,
    agent_id                INT           NULL,
    claim_date              DATE          NULL,
    current_status          VARCHAR(50)   NULL,
    driver_receive_date     DATETIME      NULL,
    warehouse_receive_date  DATETIME      NULL,
    approve_date            DATETIME      NULL,
    delivery_date           DATETIME      NULL,
    receive_finish_date     DATETIME      NULL,
    created_by              INT           NULL,
    created_at              DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at              DATETIME      NULL,
    warehouse               VARCHAR(100)  NULL,
    truckname               VARCHAR(10)   NULL,
    shipment                VARCHAR(50)   NULL,
    PRIMARY KEY (claim_id),
    UNIQUE KEY UQ_claims_claim_no (claim_no)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS claim_approves (
    approve_id      INT           NOT NULL AUTO_INCREMENT,
    claim_id        INT           NOT NULL,
    approve_by      INT           NOT NULL,
    approve_status  TINYINT(1)    NOT NULL,
    approve_remark  VARCHAR(500)  NULL,
    approve_date    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (approve_id),
    CONSTRAINT FK_ClaimApproves_Users FOREIGN KEY (approve_by) REFERENCES users (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS claim_items (
    claim_item_id  INT            NOT NULL AUTO_INCREMENT,
    claim_id       INT            NOT NULL,
    item_id        INT            NOT NULL,
    lot_no         VARCHAR(100)   NULL,
    mfg_date       DATE           NULL,
    expire_date    DATE           NULL,
    qty            DECIMAL(18,2)  NOT NULL DEFAULT 0,
    qtychang       DECIMAL(18,2)  NULL,
    remark         VARCHAR(500)   NULL,
    created_at     DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at     DATETIME       NULL,
    qtyreceived    INT            NULL,
    PRIMARY KEY (claim_item_id),
    CONSTRAINT FK_claim_items_claims FOREIGN KEY (claim_id) REFERENCES claims (claim_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS claim_images (
    image_id       INT           NOT NULL AUTO_INCREMENT,
    claim_item_id  INT           NOT NULL,
    image_path     VARCHAR(500)  NOT NULL,
    image_type     VARCHAR(50)   NULL,
    created_at     DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    claim_id       INT           NULL,
    PRIMARY KEY (image_id),
    CONSTRAINT FK_claim_images_claim_items FOREIGN KEY (claim_item_id) REFERENCES claim_items (claim_item_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS claim_status_logs (
    log_id       INT           NOT NULL AUTO_INCREMENT,
    claim_id     INT           NOT NULL,
    status       INT           NOT NULL,
    remark       VARCHAR(500)  NULL,
    update_by    INT           NOT NULL,
    update_date  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (log_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS Delivery (
    delivery_id      INT           NOT NULL AUTO_INCREMENT,
    claim_id         INT           NOT NULL,
    driver_id        INT           NOT NULL,
    delivery_status  INT           NOT NULL,
    receive_date     DATETIME      NULL,
    created_at       DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    truck_plate      VARCHAR(10)   NULL,
    img_parth        VARCHAR(100)  NULL,
    PRIMARY KEY (delivery_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS items (
    item_id     INT           NOT NULL AUTO_INCREMENT,
    item_code   VARCHAR(50)   NOT NULL,
    item_name   VARCHAR(255)  NOT NULL,
    status      TINYINT(1)    NOT NULL DEFAULT 1,
    created_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (item_id),
    UNIQUE KEY UQ_items_item_code (item_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS roles (
    role_id      INT           NOT NULL AUTO_INCREMENT,
    role_name    VARCHAR(50)   NULL,
    description  VARCHAR(255)  NULL,
    PRIMARY KEY (role_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS user_agents (
    user_id   INT  NOT NULL,
    agent_id  INT  NOT NULL,
    PRIMARY KEY (user_id, agent_id),
    CONSTRAINT FK_user_agents_agent FOREIGN KEY (agent_id) REFERENCES agents (agent_id),
    CONSTRAINT FK_user_agents_user  FOREIGN KEY (user_id)  REFERENCES users (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS warehouse_signature_history (
    history_id      INT           NOT NULL AUTO_INCREMENT,
    warehouse       VARCHAR(100)  NOT NULL,
    reviewer_name   VARCHAR(100)  NULL,
    image_path      VARCHAR(255)  NULL,
    effective_from  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by      INT           NULL,
    PRIMARY KEY (history_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS warehouse_signatures (
    signature_id   INT           NOT NULL AUTO_INCREMENT,
    warehouse      VARCHAR(100)  NOT NULL,
    reviewer_name  VARCHAR(100)  NULL,
    image_path     VARCHAR(255)  NOT NULL,
    updated_by     INT           NULL,
    updated_at     DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (signature_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
