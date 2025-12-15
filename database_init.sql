-- MTExpress 数据库初始化脚本

-- 创建开发环境数据库
CREATE DATABASE IF NOT EXISTS mtexpress_dev 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

-- 创建生产环境数据库
CREATE DATABASE IF NOT EXISTS mtexpress_prod 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

-- 使用开发环境数据库
USE mtexpress_dev;

-- 用户表将通过应用自动创建，这里只是展示结构
-- CREATE TABLE users (
--   id INT AUTO_INCREMENT PRIMARY KEY,
--   username VARCHAR(255) NOT NULL UNIQUE,
--   email VARCHAR(255) NOT NULL UNIQUE,
--   password VARCHAR(255) NOT NULL,
--   code VARCHAR(255) NULL,
--   avatar VARCHAR(255) NULL,
--   created DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
--   updated DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
--   token TEXT NULL,
--   tokenExpiresAt BIGINT NULL,
--   lastActiveAt BIGINT NULL,
--   INDEX idx_email (email),
--   INDEX idx_username (username),
--   INDEX idx_token (token(255))
-- ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 上传文件表将通过应用自动创建，这里只是展示结构
-- CREATE TABLE uploads (
--   id INT AUTO_INCREMENT PRIMARY KEY,
--   originalName VARCHAR(255) NOT NULL,
--   storedName VARCHAR(255) NOT NULL,
--   filePath VARCHAR(500) NOT NULL,
--   fileSize BIGINT NOT NULL,
--   mimeType VARCHAR(100) NOT NULL,
--   userId INT NOT NULL,
--   uploadTime DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
--   INDEX idx_userId (userId),
--   INDEX idx_uploadTime (uploadTime),
--   FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
-- ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 验证码表将通过应用自动创建，这里只是展示结构
-- CREATE TABLE verifications (
--   id INT AUTO_INCREMENT PRIMARY KEY,
--   email VARCHAR(255) NOT NULL,
--   code VARCHAR(10) NOT NULL,
--   expiresAt BIGINT NOT NULL,
--   createdAt BIGINT NOT NULL,
--   isUsed BOOLEAN DEFAULT FALSE,
--   UNIQUE KEY unique_email_active (email, isUsed),
--   INDEX idx_email (email),
--   INDEX idx_expiresAt (expiresAt)
-- ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

