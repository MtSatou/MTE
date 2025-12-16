import mysql from 'mysql2/promise';
import EnvVars from '@src/constants/EnvVars';
import logger from '@src/util/log';
import { initDatabase } from '../repos/database';

// MySQL连接池
const pool = mysql.createPool({
  host: EnvVars.Database.Host,
  port: EnvVars.Database.Port,
  user: EnvVars.Database.User,
  password: EnvVars.Database.Password,
  database: EnvVars.Database.Database,
  charset: EnvVars.Database.Charset,
  timezone: EnvVars.Database.Timezone,
  connectionLimit: EnvVars.Database.ConnectionLimit,
});

// 测试数据库连接
export async function testConnection(): Promise<boolean> {
  try {
    const connection = await pool.getConnection();
    await connection.ping();
    connection.release();
    return true;
  } catch (error) {
    logger.warn('数据库连接测试失败:');
    logger.error(error);
    return false;
  }
}

// 执行查询
export async function query<T>(sql: string, params?: T): Promise<mysql.QueryResult> {
  try {
    const [rows] = await pool.execute(sql, params);
    return rows;
  } catch (error) {
    logger.warn('数据库查询失败:');
    logger.error(error);
    throw error;
  }
}

// 获取连接池实例
export function getPool(): mysql.Pool {
  return pool;
}

// 关闭连接池
export async function closePool(): Promise<void> {
  try {
    await pool.end();
  } catch (error) {
    logger.warn('数据库关闭失败:');
    logger.error(error);
    throw error;
  }
}


export async function initializeDatabase() {
  try {
    const isConnected = await testConnection();
    if (isConnected) {
      logger.info('MySQL 连接成功');
      await initDatabase();
    } else {
      logger.error('MySQL 数据库连接失败');
      throw new Error('MySQL 数据库连接失败');
    }
  } catch (error) {
    logger.error(error);
    throw error;
  }
}

export default {
  pool,
  testConnection,
  query,
  getPool,
  closePool,
  initializeDatabase
};