export interface IUser {
  // 系统自增 id，从 10000 开始
  id: number;
  username: string;
  email: string;
  /** 登录密码 */
  password: string;
  // 可选密码/验证码字段（register 时传入）
  code?: string;
  // 头像
  avatar?: string | null;
  // 创建/更新时间
  created: Date | string;
  updated?: Date | string | null;
  token: string | null;
  tokenExpiresAt: number | null;
  // 最后一次活跃时间（ms 时间戳）
  lastActiveAt?: number | null;
}
