/**
 * Redis 缓存键常量
 * 统一管理所有缓存键名，避免硬编码
 */
export const CACHE_KEYS = {
  // 用户相关
  USER: (userId: number) => `user:${userId}`,
  USER_TOKEN: (token: string) => `token:${token}`,
  USER_LOGIN: (userId: number) => `login:${userId}`,
  USER_PERMISSIONS: (userId: number) => `permissions:${userId}`,
  
  // 验证码相关
  VERIFICATION_CODE: (email: string) => `verification:${email}`,
  
  // API 响应缓存
  API_RESPONSE: (api: string) => `api:${api}`,
  
  // 文件上传相关
  UPLOAD_RECORD: (uploadId: number) => `upload:${uploadId}`,
  
  // 限流相关
  RATE_LIMIT: (identifier: string) => `rate_limit:${identifier}`,
  
  // 会话相关
  SESSION: (sessionId: string) => `session:${sessionId}`,
  
  // 通用模式
  PATTERN: {
    ALL_USERS: '*user:*',
    ALL_TOKENS: '*token:*',
    ALL_USER_RELATED: (userId: number) => `*${userId}*`,
  }
} as const;