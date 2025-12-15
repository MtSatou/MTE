export interface IVerificationCode {
  email: string;
  code: string;
  createdAt: number; // 时间戳（毫秒）
  expiresAt: number; // 过期时间戳（毫秒）
}
