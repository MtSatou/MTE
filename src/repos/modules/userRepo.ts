import { IUser } from '@src/types/user';
import { query } from '../mysql';

/**
 * 获取指定email用户
 */
async function getOne(email: string): Promise<IUser | null> {
  const sql = 'SELECT * FROM users WHERE email = ?';
  const rows = await query(sql, [email]) as IUser[];
  return rows.length > 0 ? rows[0] : null;
}

/**
 * 通过 id 获取用户
 */
async function getById(id: number): Promise<IUser | null> {
  const sql = 'SELECT * FROM users WHERE id = ?';
  const rows = await query(sql, [id]) as IUser[];
  return rows.length > 0 ? rows[0] : null;
}

/**
 * 通过 username 获取用户
 */
async function getByUsername(username: string): Promise<IUser | null> {
  const sql = 'SELECT * FROM users WHERE username = ?';
  const rows = await query(sql, [username]) as IUser[];
  return rows.length > 0 ? rows[0] : null;
}

/**
 * 寻找指定id用户是否存在
 */
async function persists(id: number): Promise<boolean> {
  const sql = 'SELECT COUNT(*) as count FROM users WHERE id = ?';
  const rows = await query(sql, [id]) as { count: number }[];
  return rows[0].count > 0;
}

/**
 * 获取所有用户
 */
async function getAll(): Promise<IUser[]> {
  const sql = 'SELECT * FROM users ORDER BY created DESC';
  return await query(sql) as IUser[];
}

/**
 * 添加一名用户
 */
async function add(user: Omit<IUser, 'id'>): Promise<void> {
  const sql = `
    INSERT INTO users (username, email, password, code, avatar, created, updated, token, tokenExpiresAt, lastActiveAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  await query(sql, [
    user.username,
    user.email,
    user.password,
    user.code || null,
    user.avatar || null,
    user.created || new Date().toISOString().slice(0, 19).replace('T', ' '),
    user.updated || null,
    user.token || null,
    user.tokenExpiresAt || null,
    user.lastActiveAt || null,
  ]);
}

/**
 * 更新用户
 */
async function update(user: IUser): Promise<void> {
  const sql = `
    UPDATE users SET 
      username = ?, 
      email = ?, 
      password = ?, 
      avatar = ?, 
      updated = ?
    WHERE id = ?
  `;
  await query(sql, [
    user.username,
    user.email,
    user.password,
    user.avatar,
    user.updated || new Date().toISOString().slice(0, 19).replace('T', ' '),
    user.id,
  ]);
}

/**
 * 设置用户当前有效 token 与到期时间（毫秒）
 */
async function setToken(
  id: number,
  token: string | null,
  tokenExpiresAt: number | null,
): Promise<void> {
  const sql = `
    UPDATE users SET 
      token = ?, 
      tokenExpiresAt = ?, 
      updated = ?
    WHERE id = ?
  `;
  await query(sql, [
    token,
    tokenExpiresAt,
    new Date().toISOString().slice(0, 19).replace('T', ' '),
    id,
  ]);
}

/**
 * 删除用户
 */
async function delete_(id: number): Promise<void> {
  const sql = 'DELETE FROM users WHERE id = ?';
  await query(sql, [id]);
}





// **** Export default **** //

export default {
  getOne,
  getById,
  getByUsername,
  persists,
  getAll,
  add,
  update,
  setToken,
  delete: delete_,
} as const;
