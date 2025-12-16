import redisClient from '@src/util/redis';
import EnvVars from '@src/constants/EnvVars';

export interface CacheOptions {
  ttl?: number; // 过期时间（秒）
}

/**
 * Redis 缓存服务
 * 提供基础的 key-value 缓存操作
 */
export class RedisCacheService {
  private static instance: RedisCacheService;

  public static getInstance(): RedisCacheService {
    if (!RedisCacheService.instance) {
      RedisCacheService.instance = new RedisCacheService();
    }
    return RedisCacheService.instance;
  }

  /**
   * 检查 Redis 是否可用
   */
  public isAvailable(): boolean {
    return redisClient.isConnected;
  }

  /**
   * 设置字符串缓存
   */
  public async set(key: string, value: string, options?: CacheOptions): Promise<void> {
    if (!this.isAvailable()) return;

    const ttl = options?.ttl || EnvVars.Redis.TTL;
    await redisClient.set(key, value, ttl);
  }

  /**
   * 获取字符串缓存
   */
  public async get(key: string): Promise<string | null> {
    if (!this.isAvailable()) return null;

    return await redisClient.get(key);
  }

  /**
   * 设置对象缓存（JSON序列化）
   */
  public async setObject(key: string, value: unknown, options?: CacheOptions): Promise<void> {
    if (!this.isAvailable()) return;

    const ttl = options?.ttl || EnvVars.Redis.TTL;
    await redisClient.setObject(key, value as Record<string, unknown>, ttl);
  }

  /**
   * 获取对象缓存（JSON反序列化）
   */
  public async getObject<T = unknown>(key: string): Promise<T | null> {
    if (!this.isAvailable()) return null;

    return await redisClient.getObject<T>(key);
  }

  /**
   * 删除缓存
   */
  public async del(key: string): Promise<void> {
    if (!this.isAvailable()) return;

    await redisClient.del(key);
  }

  /**
   * 判断键是否存在
   */
  public async exists(key: string): Promise<boolean> {
    if (!this.isAvailable()) return false;

    return await redisClient.exists(key);
  }

  /**
   * 设置过期时间
   */
  public async expire(key: string, ttl: number): Promise<void> {
    if (!this.isAvailable()) return;

    await redisClient.expire(key, ttl);
  }

  /**
   * 获取剩余过期时间
   */
  public async ttl(key: string): Promise<number> {
    if (!this.isAvailable()) return -1;

    return await redisClient.ttl(key);
  }

  /**
   * 设置限流
   */
  public async setRateLimit(
    identifier: string,
    limit: number,
    windowSeconds: number,
  ): Promise<boolean> {
    if (!this.isAvailable()) {
      return true; // 如果Redis不可用，则不限制
    }

    const key = `rate_limit:${identifier}`;
    const current = await redisClient.get(key);

    if (!current) {
      await redisClient.set(key, '1', windowSeconds);
      return true;
    }

    const count = parseInt(current);
    if (count >= limit) {
      return false;
    }

    await redisClient.set(key, String(count + 1));
    return true;
  }

  /**
   * 获取限流状态
   */
  public async getRateLimit(identifier: string): Promise<{ count: number; ttl: number }> {
    if (!this.isAvailable()) return { count: 0, ttl: -1 };

    const key = `rate_limit:${identifier}`;
    const count = await redisClient.get(key);
    const ttl = await redisClient.ttl(key);

    return {
      count: count ? parseInt(count) : 0,
      ttl: ttl
    };
  }

  /**
   * 批量删除（支持模式匹配）
   */
  public async delPattern(pattern: string): Promise<void> {
    if (!this.isAvailable()) return;

    const keys = await redisClient.keys(pattern);
    if (keys.length > 0) {
      for (const key of keys) {
        await redisClient.del(key);
      }
    }
  }
}

// 导出单例实例
export default RedisCacheService.getInstance();