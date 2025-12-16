import { Request, Response, NextFunction } from 'express';
import redisClient from '@src/util/redis';
import EnvVars from '@src/constants/EnvVars';
import RedisCacheService from '@src/services/RedisCacheService';
import { CACHE_KEYS } from '@src/constants/CacheKeys';
import { logger } from '@src/util/log';

/**
 * Redis 初始化中间件
 * 在应用启动时连接 Redis，并在请求关闭时断开连接
 */
export async function initializeRedis(): Promise<void> {
  try {
    await redisClient.connect();
  } catch (error) {
    logger.warn('Redis初始化失败');
    logger.error(error);

    // 如果Redis是必需的，可以在这里抛出错误停止应用
    // 如果Redis是可选的，只记录错误继续运行
    if (EnvVars.Redis.Enabled) {
      logger.warn('Redis已启用但连接失败，某些功能可能不可用');
    }
  }
}

/**
 * Redis 关闭中间件
 */
export async function closeRedis(): Promise<void> {
  try {
    // 设置一个快速超时，避免在进程终止时等待过久
    await Promise.race([
      redisClient.disconnect(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Redis关闭超时')), 1000)
      )
    ]);
  } catch (error) {
    // 在进程终止时，某些错误是正常的
    if (!String(error).includes('ECONNRESET')) {
      logger.warn('Redis关闭时出错');
      logger.error(error);
    }
  }
}

/**
 * 缓存中间件工厂函数
 * 用于缓存API响应
 */
export function cacheMiddleware(options: {
  keyGenerator?: (req: Request) => string;
  ttl?: number;
  condition?: (req: Request, res: Response) => boolean;
}) {
  const { keyGenerator, ttl, condition } = options;

  return async (req: Request, res: Response, next: NextFunction): Promise<unknown> => {
    const originalJson = res.json.bind(res) as (body?: unknown) => IRes;

    // 如果Redis未启用或条件不满足，跳过缓存
    if (!redisClient.isConnected || (condition && !condition(req, res))) {
      return next();
    }

    // 生成缓存键
    const cacheKey = keyGenerator
      ? keyGenerator(req)
      : `cache:${req.method}:${req.originalUrl}:${JSON.stringify(req.query)}`;

    try {
      // 尝试从缓存获取响应
      const cachedResponse = await RedisCacheService.getObject(cacheKey);

      if (cachedResponse) {
        // 返回缓存的响应
        return originalJson.call(res, cachedResponse);
      }

      res.json = function (data: Record<string, unknown>) {
        // 只缓存成功响应
        if (res.statusCode >= 200 && res.statusCode < 300) {
          RedisCacheService.setObject(cacheKey, data, { ttl }).catch(error => {
            logger.warn('缓存响应失败');
            logger.error(error);
          });
        }
        return originalJson.call(this, data);
      };

      next();
    } catch (error) {
      logger.warn('缓存中间件出错');
      logger.error(error);
      next(); // 出错时继续处理请求
    }
  };
}

/**
 * 限流中间件工厂函数
 */
export function rateLimitMiddleware(options: {
  windowMs?: number; // 时间窗口（毫秒）
  max?: number; // 最大请求数
  keyGenerator?: (req: Request) => string;
  message?: string;
}) {
  const {
    windowMs = 60 * 1000, // 默认1分钟
    max = 10, // 默认10次请求
    keyGenerator = (req) => {
      return `rate_limit:${req.ip}:${req.path}`;
    },
    message = '请求过于频繁，请稍后再试'
  } = options;

  return async (req: Request, res: Response, next: NextFunction): Promise<unknown> => {
    // 如果Redis未启用，跳过限流
    if (!redisClient.isConnected) {
      return next();
    }

    try {
      const key = keyGenerator(req);
      const windowSeconds = Math.ceil(windowMs / 1000);

      // 移除已有的前缀，因为RedisCacheService会自动添加rate_limit前缀
      const identifier = key.replace(/^rate_limit:/, '');
      const allowed = await RedisCacheService.setRateLimit(identifier, max, windowSeconds);

      if (!allowed) {
        return res.error(message, undefined, 429);
      }

      // 添加限流信息到响应头
      const rateLimit = await RedisCacheService.getRateLimit(identifier);
      res.setHeader('X-RateLimit-Limit', max);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, max - rateLimit.count));
      res.setHeader('X-RateLimit-Reset', rateLimit.ttl > 0 ? Date.now() + rateLimit.ttl * 1000 : 0);

      next();
    } catch (error) {
      logger.warn('限流中间件出错');
      logger.error(error);
      next(); // 出错时继续处理请求
    }
  };
}

/**
 * 清除用户缓存的中间件
 * 在用户信息更新时清除相关缓存
 */
export function clearUserCacheMiddleware(req: IReq, res: IRes, next: NextFunction): void {
  const originalJson = res.json;

  res.json = function (body?: unknown): IRes {
    // 如果是成功的用户更新操作，清除相关缓存
    if (res.statusCode >= 200 && res.statusCode < 300) {
      const userId = res.locals.auth.id;

      if (userId) {
        // 清除用户相关的所有缓存
        const userKeys = [
          CACHE_KEYS.USER(Number(userId)),
          CACHE_KEYS.USER_LOGIN(Number(userId)),
          CACHE_KEYS.USER_PERMISSIONS(Number(userId))
        ];

        Promise.all(userKeys.map(key => RedisCacheService.del(key))).catch(error => {
          logger.warn('清除用户缓存失败');
          logger.error(error);
        });
      }
    }

    return originalJson.call(this, body);
  };

  next();
}