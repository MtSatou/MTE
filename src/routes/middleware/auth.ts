import { Request, Response, NextFunction } from 'express';
import HttpStatusCodes from '@src/constants/HttpStatusCodes';
import TokenUtil from '@src/util/token';
import UserRepo from '@src/repos/modules/userRepo';

/**
 * 支持从 Authorization: Bearer <token> 获取 token 并验证
 * 验证成功后把解析后的 payload 放到 res.locals.auth
 */
export default async function auth(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ')
    ? authHeader.slice(7)
    : authHeader || '';
  if (!token) {
    // 返回 403 (FORBIDDEN) 表示没有权限/认证失败
    return res.status(HttpStatusCodes.FORBIDDEN).json({ message: '无效的Token' });
  }

  try {
    const payload = TokenUtil.verifyToken(token);
    // 校验签名与过期通过后，再比对持久化的 token（用于在刷新后废弃旧 token）
    const user = await UserRepo.getById(payload.id);
    if (!user) {
      return res.status(HttpStatusCodes.FORBIDDEN).json({ message: '无效的Token' });
    }
    // 如果用户记录中没有当前 token 或与传入不一致，则认为 token 已被废弃
    if (!(user.token) || (user.token) !== token) {
      return res.status(HttpStatusCodes.FORBIDDEN).json({ message: '无效的Token' });
    }

    // 放入当前响应的 locals 中，供后续中间件和路由使用
    res.locals.auth = payload;
    return next();
  } catch (err) {
    // token 不合法或过期 -> 403
    return res.status(HttpStatusCodes.FORBIDDEN).json({ message: '无效的Token' });
  }
}
