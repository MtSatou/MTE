import { createClient } from 'redis';
import type { RedisClientType } from 'redis';
import EnvVars from '@src/constants/EnvVars';
import { logger } from './log';

class RedisClient {
  private client: RedisClientType;
  private connecting?: Promise<void>;

  constructor() {
    this.client = createClient({
      socket: {
        host: EnvVars.Redis.Host,
        port: EnvVars.Redis.Port,
        reconnectStrategy: (retries) => {
          logger.warn(`Redis重连中，第 ${retries} 次，3000ms 后重试`);
          return 3000;
        },
      },
      password: EnvVars.Redis.Password || undefined,
      database: EnvVars.Redis.Database,
    });

    this.client.on('ready', () => {
    });

    this.client.on('error', (err) => {
      logger.warn('Redis 出现错误');
      logger.error(err);
    });
  }

  /**
   * 建立 Redis 连接（并发安全）
   */
  public async connect(): Promise<void> {
    if (!EnvVars.Redis.Enabled) {
      return;
    }

    if (this.client.isOpen) {
      return;
    }

    if (!this.connecting) {
      this.connecting = this.client.connect()
        .then(() => {
          logger.info('Redis 连接成功');
        })
        .catch((err) => {
          logger.warn('Redis连接失败');
          logger.error(err);
          throw err;
        })
        .finally(() => {
          this.connecting = undefined;
        });
    }

    await this.connecting;
  }

  /**
   * 断开 Redis 连接
   */
  public async disconnect(): Promise<void> {
    if (this.client.isOpen) {
      try {
        // 使用更短的超时时间，避免在进程终止时等待过久
        await Promise.race([
          this.client.quit(),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('断开连接超时')), 1000)
          )
        ]);
        logger.info('Redis连接已断开');
      } catch (error) {
        if (!String(error).includes('ECONNRESET')) {
          logger.warn('Redis断开连接失败');
          logger.error(error);
        }
      }
    }
  }

  /**
   * 获取客户端（内部使用）
   */
  private getClient(): RedisClientType {
    if (!this.client.isOpen) {
      throw new Error('Redis客户端未连接');
    }
    return this.client;
  }

  /**
   * 添加键前缀
   */
  private addPrefix(key: string): string {
    return `${EnvVars.Redis.KeyPrefix}${key}`;
  }

  /* ======================= 基础 KV ======================= */

  public async set(key: string, value: string, ttl?: number): Promise<void> {
    const client = this.getClient();
    const prefixedKey = this.addPrefix(key);

    if (ttl) {
      await client.setEx(prefixedKey, ttl, value);
    } else {
      await client.set(prefixedKey, value);
    }
  }

  public async get(key: string): Promise<string | null> {
    const client = this.getClient();
    return client.get(this.addPrefix(key));
  }

  public async del(key: string): Promise<void> {
    const client = this.getClient();
    await client.del(this.addPrefix(key));
  }

  public async exists(key: string): Promise<boolean> {
    const client = this.getClient();
    return (await client.exists(this.addPrefix(key))) > 0;
  }

  public async expire(key: string, seconds: number): Promise<void> {
    const client = this.getClient();
    await client.expire(this.addPrefix(key), seconds);
  }

  public async ttl(key: string): Promise<number> {
    const client = this.getClient();
    return client.ttl(this.addPrefix(key));
  }

  /* ======================= JSON ======================= */

  public async setObject(key: string, value: unknown, ttl?: number): Promise<void> {
    await this.set(key, JSON.stringify(value), ttl);
  }

  public async getObject<T = unknown>(key: string): Promise<T | null> {
    const value = await this.get(key);
    if (!value) return null;

    try {
      return JSON.parse(value) as T;
    } catch (err) {
      logger.warn('Redis JSON解析失败');
      logger.error(err);
      return null;
    }
  }

  /* ======================= Hash ======================= */

  public async hSet(key: string, field: string, value: string): Promise<void> {
    const client = this.getClient();
    await client.hSet(this.addPrefix(key), field, value);
  }

  public async hGet(key: string, field: string): Promise<string | undefined> {
    const client = this.getClient();
    return client.hGet(this.addPrefix(key), field);
  }

  public async hGetAll(key: string): Promise<Record<string, string>> {
    const client = this.getClient();
    return client.hGetAll(this.addPrefix(key));
  }

  public async hDel(key: string, ...fields: string[]): Promise<void> {
    const client = this.getClient();
    await client.hDel(this.addPrefix(key), fields);
  }

  /* ======================= List ======================= */

  public async lPush(key: string, ...values: string[]): Promise<void> {
    const client = this.getClient();
    await client.lPush(this.addPrefix(key), values);
  }

  public async rPush(key: string, ...values: string[]): Promise<void> {
    const client = this.getClient();
    await client.rPush(this.addPrefix(key), values);
  }

  public async lPop(key: string): Promise<string | null> {
    const client = this.getClient();
    return client.lPop(this.addPrefix(key));
  }

  public async rPop(key: string): Promise<string | null> {
    const client = this.getClient();
    return client.rPop(this.addPrefix(key));
  }

  /* ======================= Set ======================= */

  public async sAdd(key: string, ...members: string[]): Promise<void> {
    const client = this.getClient();
    await client.sAdd(this.addPrefix(key), members);
  }

  public async sRem(key: string, ...members: string[]): Promise<void> {
    const client = this.getClient();
    await client.sRem(this.addPrefix(key), members);
  }

  public async sMembers(key: string): Promise<string[]> {
    const client = this.getClient();
    return client.sMembers(this.addPrefix(key));
  }

  public async sIsMember(key: string, member: string): Promise<boolean> {
    const client = this.getClient();
    return client.sIsMember(this.addPrefix(key), member);
  }

  /* ======================= 工具 ======================= */

  public async keys(pattern: string): Promise<string[]> {
    const client = this.getClient();
    return client.keys(this.addPrefix(pattern));
  }

  public async flushDb(): Promise<void> {
    const client = this.getClient();
    await client.flushDb();
  }

  /* ======================= 限流 ======================= */

  public async setRateLimit(
    key: string,
    maxRequests: number,
    windowSeconds: number,
  ): Promise<boolean> {
    const client = this.getClient();
    const prefixedKey = this.addPrefix(key);

    const count = await client.incr(prefixedKey);
    if (count === 1) {
      await client.expire(prefixedKey, windowSeconds);
    }
    return count <= maxRequests;
  }

  public async getRateLimit(
    key: string,
  ): Promise<{ count: number; ttl: number }> {
    const client = this.getClient();
    const prefixedKey = this.addPrefix(key);

    const [count, ttl] = await Promise.all([
      client.get(prefixedKey),
      client.ttl(prefixedKey),
    ]);

    return {
      count: Number(count ?? 0),
      ttl: ttl > 0 ? ttl : 0,
    };
  }

  public get isConnected(): boolean {
    return EnvVars.Redis.Enabled && this.client.isOpen;
  }
}

/* ======================= 单例导出 ======================= */

const redisClient = new RedisClient();
export default redisClient;