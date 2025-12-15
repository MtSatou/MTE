import jwt from 'jsonwebtoken';
import EnvVars from '@src/constants/EnvVars';
import HttpStatusCodes from '@src/constants/HttpStatusCodes';
import { validationResult } from 'express-validator';
import { newUser } from '@src/models/User';
import { IUser } from '@src/types/user';
import TokenUtil, { TokenPayload } from '@src/util/token';
import UserRepo from '@src/repos/modules/userRepo';

/**
 * 获取所有用户。
 */
async function getAll(_: IReq, res: IRes) {
  const users = await UserRepo.getAll();
  return res.status(HttpStatusCodes.OK).json({ users });
}

/**
 * 添加一名用户。
 */
async function register(req: IReq<never, never, IUser>, res: IRes) {
  const errs = validationResult(req);
  if (!errs.isEmpty()) {
    return res.status(HttpStatusCodes.BAD_REQUEST).json({ message: '请输入有效内容' });
  }
  const user = req.body;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(user.email)) {
    res.status(HttpStatusCodes.BAD_REQUEST).json({ message: '邮箱格式不正确' }).end();
  }
  const byEmail = await UserRepo.getOne(user.email);
  if (byEmail) {
    res.status(HttpStatusCodes.BAD_REQUEST).json({ message: '邮箱已存在' }).end();
  }
  const newuser = newUser(user);
  await UserRepo.add(newuser);
  return res.status(HttpStatusCodes.CREATED).json({ message: '注册成功' }).end();
}

/**
 * 更新用户。
 */
async function update(req: IReq<never, never, Partial<IUser>>, res: IRes) {
  const auth = res.locals.auth;
  if (!auth || !auth.id) {
    return res.status(HttpStatusCodes.FORBIDDEN).json({ message: '无效的用户' });
  }

  const user = req.body;
  // 仅允许用户更新自己
  const userId = user.id ?? auth.id;
  if (Number(userId) !== Number(auth.id)) {
    return res.status(HttpStatusCodes.FORBIDDEN).json({ message: '更新失败' });
  }

  const toUpdate: Partial<IUser> = {
    id: Number(auth.id),
    username: user.username,
    avatar: user.avatar,
    password: user.password,
    email: user.email,
    updated: new Date().toLocaleString(),
  } as Partial<IUser>;

  // 删除非法键
  for (const k in toUpdate) {
    const key = k as keyof IUser;
    if (toUpdate[key] === undefined) {
      delete toUpdate[key];
    }
  }
  const actorId = Number(auth.id);
  const exists = await UserRepo.getById(actorId);
  if (!exists) {
    return res.status(HttpStatusCodes.NOT_FOUND).json({ message: '找不到该用户' });

  }

  // 如果传入了 id，确保是更新自己的
  if (toUpdate.id && Number(toUpdate.id) !== Number(actorId)) {
    return res.status(HttpStatusCodes.FORBIDDEN).json({ message: '更新失败' });
  }

  // 检查 username/email 唯一性（若有变更）
  if (toUpdate.username && toUpdate.username !== exists.username) {
    const other = await UserRepo.getByUsername(toUpdate.username);
    if (other && other.id !== actorId) {
      return res.status(HttpStatusCodes.BAD_REQUEST).json({ message: '用户名已存在' });
    }
  }
  if (toUpdate.email && toUpdate.email !== exists.email) {
    const other = await UserRepo.getOne(toUpdate.email);
    if (other && other.id !== actorId) {
      return res.status(HttpStatusCodes.BAD_REQUEST).json({ message: '邮箱已存在' });
    }
  }

  const updatedUser: IUser = {
    ...exists,
    username: toUpdate.username ?? exists.username,
    email: toUpdate.email ?? exists.email,
    password: toUpdate.password ?? exists.password,
    avatar: toUpdate.avatar ?? exists.avatar,
    updated: new Date().toLocaleString(),
  } as IUser;

  await UserRepo.update(updatedUser);
  return res.status(HttpStatusCodes.OK).json({ message: '更新成功' });

}

/**
 * 用户注销。
 */
async function delete_(req: IReq, res: IRes) {
  const errs = validationResult(req);
  if (!errs.isEmpty()) {
    return res.status(HttpStatusCodes.BAD_REQUEST).json({ message: '请输入有效内容' });
  }
  const auth = res.locals.auth;
  if (!auth || !auth.id) {
    return res.status(HttpStatusCodes.FORBIDDEN).json({ message: '注销失败' });
  }

  const persists = await UserRepo.persists(auth.id);
  if (!persists) {
    return res.status(HttpStatusCodes.NOT_FOUND).json({ message: '找不到该用户' });
  }
  await UserRepo.delete(auth.id);
  return res.status(HttpStatusCodes.OK).json({ message: '注销成功' });
}

/**
 * 登录
 */
async function login(
  req: IReq<never, never, { username: string; password: string }>,
  res: IRes,
) {
  const errs = validationResult(req);
  if (!errs.isEmpty()) {
    return res.status(HttpStatusCodes.BAD_REQUEST).json({ message: '请输入有效内容' });
  }
  const { username, password } = req.body;

  let user = null as IUser | null;
  const asId = Number(username);
  if (!Number.isNaN(asId) && String(asId) === String(username)) {
    user = await UserRepo.getById(asId);
  }
  if (!user) {
    user = await UserRepo.getOne(String(username));
  }
  if (!user) {
    return res.status(HttpStatusCodes.FORBIDDEN).json({ message: '用户名或密码错误' });
  }
  if (user.password !== password) {
    return res.status(HttpStatusCodes.FORBIDDEN).json({ message: '用户名或密码错误' });
  }
  const expMs = Number(EnvVars.Jwt.Exp ?? process.env.COOKIE_EXP ?? 0) || (2 * 60 * 60 * 1000);
  const token = TokenUtil.signToken({ id: user.id, email: user.email }, Math.floor(expMs / 1000));
  const expiresAt = Date.now() + expMs;
  user.token = token;
  user.tokenExpiresAt = expiresAt;
  // 将 token 存储到用户记录中，便于后续使旧 token 失效
  await UserRepo.setToken(user.id, token, expiresAt);
  return res.status(HttpStatusCodes.OK).json({ token, expiresAt, user });
}

/**
 * 校验 token 是否有效
 * 支持 Authorization: Bearer <token> 或 query/body 中的 token 字段
 */
async function validateToken(
  req: IReq<{ token: string }, { token: string }, { token: string }>,
  res: IRes,
) {
  const headerToken = req.headers['authorization']?.startsWith('Bearer ')
    ? req.headers['authorization'].slice(7)
    : (req.headers['authorization'] as string) || '';
  const queryToken = req.query.token;
  const bodyToken = req.body.token;
  const token = headerToken || queryToken || bodyToken;

  if (!token) {
    return res.status(HttpStatusCodes.BAD_REQUEST).json({ valid: false, message: '缺少 token' });
  }

  try {
    const payload = TokenUtil.verifyToken(token);
    // 额外：检查该 token 是否与用户记录中当前 token 匹配（以支持刷新后废弃旧 token）
    const user = await UserRepo.getById(payload.id);
    if (!user) {
      return res.status(HttpStatusCodes.FORBIDDEN).json({ valid: false, message: '无效的Token' });
    }
    if (!user.token || (user.token) !== token) {
      return res.status(HttpStatusCodes.FORBIDDEN).json({ valid: false, message: '无效的Token' });
    }
    return res.status(HttpStatusCodes.OK).json({ valid: true, payload, user });
  } catch (err) {
    return res.status(HttpStatusCodes.FORBIDDEN).json({ valid: false, message: '无效的Token' });
  }
}

/**
 * 刷新当前用户的 token（延长过期时间）
 * 需要 auth 中间件将解析后的 payload 放到 res.locals.auth
 */
async function refreshToken(req: IReq, res: IRes) {
  const auth = res.locals.auth as TokenPayload | undefined;
  if (!auth || !auth.id) {
    return res.status(HttpStatusCodes.FORBIDDEN).json({ message: '无效的用户' });
  }

  // 复制 payload 并移除 iat/exp 等自动字段
  const payload = { ...auth };
  delete payload.iat;
  delete payload.exp;
  delete payload.nbf;

  // 签发新的 token（使用默认过期时间）
  const token = TokenUtil.signToken(payload);

  // 解析 token 获得过期时间（以毫秒为单位）并持久化到用户记录中，废弃旧 token
  const decoded = jwt.decode(token);
  // @ts-expect-error 取值运算
  const expiresAtMs = decoded?.exp ? Number(decoded.exp) * 1000 : null;
  await UserRepo.setToken(Number(auth.id), token, expiresAtMs);

  return res.status(HttpStatusCodes.OK).json({ token, expiresAt: expiresAtMs });
}

export default {
  getAll,
  update,
  delete: delete_,
  register,
  login,
  validateToken,
  refreshToken,
} as const;
