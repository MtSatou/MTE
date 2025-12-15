import { testConnection, query } from './mysql';
import logger from '@src/util/log';

// 创建用户表
export async function createUsersTable(): Promise<void> {
  const sql = `
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL UNIQUE,
      password VARCHAR(255) NOT NULL,
      code VARCHAR(255) NULL,
      avatar VARCHAR(255) NULL,
      created DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
      token TEXT NULL,
      tokenExpiresAt BIGINT NULL,
      lastActiveAt BIGINT NULL,
      INDEX idx_email (email),
      INDEX idx_username (username),
      INDEX idx_token (token(255))
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    AUTO_INCREMENT=10000;
  `;

  try {
    await query(sql);
  } catch (error) {
    logger.warn('创建用户表失败:');
    logger.error(error);
    throw error;
  }
}


// 创建验证码表
export async function createVerificationTable(): Promise<void> {
  const sql = `
    CREATE TABLE IF NOT EXISTS verification_codes (
      id INT AUTO_INCREMENT PRIMARY KEY,
      email VARCHAR(255) NOT NULL,
      code VARCHAR(10) NOT NULL,
      createdAt BIGINT NOT NULL,
      expiresAt BIGINT NOT NULL,
      INDEX idx_email (email),
      INDEX idx_expiresAt (expiresAt),
      UNIQUE KEY unique_email (email)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `;

  try {
    await query(sql);
  } catch (error) {
    logger.warn('创建验证码表失败:');
    logger.error(error);
    throw error;
  }
}


// 创建上传文件表
export async function createUploadsTable(): Promise<void> {
  const sql = `
    CREATE TABLE IF NOT EXISTS uploads (
      id INT AUTO_INCREMENT PRIMARY KEY,
      originalName VARCHAR(255) NOT NULL,
      storedName VARCHAR(255) NOT NULL,
      filePath VARCHAR(500) NOT NULL,
      fileSize BIGINT NOT NULL,
      mimeType VARCHAR(100) NOT NULL,
      userId INT NOT NULL,
      uploadTime DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_userId (userId),
      INDEX idx_uploadTime (uploadTime),
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `;

  try {
    await query(sql);
  } catch (error) {
    logger.warn('创建上传文件表失败:');
    logger.error(error);
    throw error;
  }
}

// 初始化数据库
export async function initDatabase(): Promise<void> {
  try {
    // 首先测试连接
    const isConnected = await testConnection();
    if (!isConnected) {
      throw new Error('数据库连接失败');
    }

    await createUsersTable();
    await createVerificationTable();
    await createUploadsTable();
  } catch (error) {
    logger.warn('数据库初始化失败:');
    logger.error(error);
    throw error;
  }
}

export default {
  createUsersTable,
  initDatabase,
};