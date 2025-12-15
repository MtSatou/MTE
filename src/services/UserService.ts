import UserRepo from '@src/repos/modules/user/UserRepo';
import { IUser } from '@src/types/user';
import { RouteError } from '@src/other/classes';
import { newUser } from '@src/models/User';
import HttpStatusCodes from '@src/constants/HttpStatusCodes';
import TokenUtil from '@src/util/token';
import EnvVars from '@src/constants/EnvVars';

export const USER_NOT_FOUND_ERR = 'User not found';

/**
 * 获取所有用户
 */
function getAll(): Promise<IUser[]> {
  return UserRepo.getAll();
}

/**
 * 添加一个用户
 */
async function addOne(user: IUser): Promise<void> {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(user.email)) {
    throw new RouteError(HttpStatusCodes.BAD_REQUEST, '邮箱格式不正确');
  }
  const byEmail = await UserRepo.getOne(user.email);
  if (byEmail) {
    throw new RouteError(HttpStatusCodes.BAD_REQUEST, '邮箱已存在');
  }
  const newuser = newUser(user);
  return UserRepo.add(newuser);
}

/**
 * 更新用户：仅允许用户自身更新
 */
async function updateOne(actorId: number, partial: Partial<IUser>): Promise<void> {
  const exists = await UserRepo.getById(actorId);
  if (!exists) {
    throw new RouteError(HttpStatusCodes.NOT_FOUND, USER_NOT_FOUND_ERR);
  }

  // 如果传入了 id，确保是更新自己的
  if (partial.id && Number(partial.id) !== Number(actorId)) {
    throw new RouteError(HttpStatusCodes.FORBIDDEN, '更新失败');
  }

  // 检查 username/email 唯一性（若有变更）
  if (partial.username && partial.username !== exists.username) {
    const other = await UserRepo.getByUsername(partial.username);
    if (other && other.id !== actorId) {
      throw new RouteError(HttpStatusCodes.BAD_REQUEST, '用户名已存在');
    }
  }
  if (partial.email && partial.email !== exists.email) {
    const other = await UserRepo.getOne(partial.email);
    if (other && other.id !== actorId) {
      throw new RouteError(HttpStatusCodes.BAD_REQUEST, '邮箱已存在');
    }
  }

  const updatedUser: IUser = {
    ...exists,
    username: partial.username ?? exists.username,
    email: partial.email ?? exists.email,
    password: partial.password ?? exists.password,
    avatar: partial.avatar ?? exists.avatar,
    updated: new Date().toLocaleString(),
  } as IUser;

  return UserRepo.update(updatedUser);
}

/**
 * 登录逻辑：返回 token 与 expiresAt 以及用户信息
 */
async function login(username: string, password: string) {
  // username 可以是 id 或 email
  let user = null as IUser | null;
  const asId = Number(username);
  if (!Number.isNaN(asId) && String(asId) === String(username)) {
    user = await UserRepo.getById(asId);
  }
  if (!user) {
    user = await UserRepo.getOne(String(username));
  }
  if (!user) {
    throw new RouteError(HttpStatusCodes.FORBIDDEN, '用户名或密码错误');
  }
  if (user.password !== password) {
    throw new RouteError(HttpStatusCodes.FORBIDDEN, '用户名或密码错误');
  }
  const expMs = Number(EnvVars.Jwt.Exp ?? process.env.COOKIE_EXP ?? 0) || (2 * 60 * 60 * 1000);
  const token = TokenUtil.signToken({ id: user.id, email: user.email }, Math.floor(expMs / 1000));
  const expiresAt = Date.now() + expMs;
  user.token = token;
  user.tokenExpiresAt = expiresAt;

  // 将 token 存储到用户记录中，便于后续使旧 token 失效
  await UserRepo.setToken(user.id, token, expiresAt);
  return { token, expiresAt, user };
}

/**
 * 通过id删除用户
 */
async function _delete(id: number): Promise<void> {
  const persists = await UserRepo.persists(id);
  if (!persists) {
    throw new RouteError(
      HttpStatusCodes.NOT_FOUND,
      USER_NOT_FOUND_ERR,
    );
  }
  return UserRepo.delete(id);
}

export default {
  getAll,
  addOne,
  updateOne,
  delete: _delete,
  login,
} as const;
