import { query } from '@src/repos/mysql';
import { IVerificationCode } from '@src/routes/modules/verification/types';

/** 保存验证码 */
async function save(email: string, code: string, expiresInMinutes: number = 10): Promise<IVerificationCode> {
  const now = Date.now();
  const expiresAt = now + expiresInMinutes * 60 * 1000;

  // 使用 REPLACE INTO 语句，先删除旧记录再插入新记录
  const sql = `
    REPLACE INTO verification_codes (email, code, createdAt, expiresAt)
    VALUES (?, ?, ?, ?)
  `;

  await query(sql, [email, code, now, expiresAt]);

  return {
    email,
    code,
    createdAt: now,
    expiresAt,
  };
}

/** 验证验证码 */
async function verify(email: string, code: string): Promise<boolean> {
  const now = Date.now();

  // 查找验证码记录
  const selectSql = 'SELECT * FROM verification_codes WHERE email = ?';
  const rows = await query(selectSql, [email]) as IVerificationCode[];

  if (rows.length === 0) return false;

  const record = rows[0];

  // 检查是否过期
  if (record.expiresAt < now) {
    // 删除过期记录
    const deleteSql = 'DELETE FROM verification_codes WHERE email = ?';
    await query(deleteSql, [email]);
    return false;
  }

  // 验证码匹配
  if (record.code === code) {
    // 验证成功后删除该验证码
    const deleteSql = 'DELETE FROM verification_codes WHERE email = ?';
    await query(deleteSql, [email]);
    return true;
  }

  return false;
}

/** 清理过期验证码 */
async function cleanExpired(): Promise<number> {
  const now = Date.now();

  // 删除过期的验证码记录
  const deleteSql = 'DELETE FROM verification_codes WHERE expiresAt < ?';
  const result = await query(deleteSql, [now]) as { affectedRows: number };

  // 返回删除的记录数
  return result.affectedRows || 0;
}

export default {
  save,
  verify,
  cleanExpired,
} as const;
