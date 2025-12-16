/**
 * 初始化应用实例
 */

import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import path from 'path';
import helmet from 'helmet';
import express, { Request, Response, NextFunction } from 'express';
import logger from '@src/util/log';
import { isDev } from '@src/util/baseUrl';
import { globalLimiter } from '@src/util/rate-limit';
import { initializeDatabase, closePool } from './util/mysql';
import { closeRedis, initializeRedis } from './routes/middleware/redis';

import 'express-async-errors';

import BaseRouter from '@src/routes';
import EnvVars from '@src/constants/EnvVars';
import responseCode from '@src/routes/middleware/responseCode';
import HttpStatusCodes from '@src/constants/HttpStatusCodes';

import { NodeEnvs } from '@src/constants/misc';
import { RouteError } from '@src/other/classes';

const app = express();
app.set('trust proxy', 1);

// 添加中间件
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser(EnvVars.CookieProps.Secret));
app.use(globalLimiter);

// 全局响应包装（在路由注册之前生效）
app.use(responseCode);

// 显示开发期间在控制台中调用的路由
if (EnvVars.NodeEnv === NodeEnvs.Dev.valueOf()) {
  app.use(morgan('dev'));
}

// 安全
if (EnvVars.NodeEnv === NodeEnvs.Production.valueOf()) {
  app.use(helmet());
}

// 注册接口
app.use(EnvVars.ApiBase, BaseRouter);

// 添加错误处理程序
app.use((
  err: Error,
  _: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction,
) => {
  if (EnvVars.NodeEnv !== NodeEnvs.Test.valueOf()) {
    logger.error(err);
  }
  let status = HttpStatusCodes.BAD_REQUEST;
  if (err instanceof RouteError) {
    status = err.status;
  }
  return res.status(status).json({ error: err.message });
});


// 设置静态目录，可直接通过访问端口/文件 (js and css).
const staticDir = path.join(__dirname, 'public');
app.use(express.static(staticDir));

// 设置上传文件的静态访问目录
const uploadsDir = path.join(__dirname, isDev ? '../uploads' : 'uploads');
app.use('/uploads', express.static(uploadsDir));

// 访问 /重定向
// app.get('/', (_: Request, res: Response) => {
//   return res.redirect('/users');
// });

export default app;



// ---- 初始化数据库 ---- //
// 初始化数据库连接
initializeDatabase().catch((error) => {
  logger.info('数据库初始化失败:');
  logger.error(error);
});

// 初始化 Redis 连接（如果启用）
initializeRedis().catch(error => {
  logger.info('Redis初始化失败:');
  logger.error(error);
});


// 应用关闭时清理连接
async function gracefulShutdown(): Promise<void> {
  try {
    // 并行关闭所有连接，设置总体超时
    await Promise.race([
      Promise.all([
        closeRedis(),
        closePool(),
      ]),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('关闭超时')), 1500)
      )
    ]);

    logger.info('Redis 连接已关闭');
    logger.info('MySql 连接已关闭');
  } finally {
    // eslint-disable-next-line 
    process.exit(0);
  }
}

// 处理各种终止信号
process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);
// 处理未捕获的异常
process.on('uncaughtException', gracefulShutdown);
process.on('unhandledRejection', gracefulShutdown);
