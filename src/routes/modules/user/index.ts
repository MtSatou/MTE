import { Router } from 'express';
import UserRoutes from './UserRoutes';
import auth from '@src/routes/middleware/auth';
import { body } from 'express-validator';

// 模块自身的基础路由（挂载点由 src/routes/index.ts 注册）
export const Base = '/users';

const userRouter = Router();

/**
 * 添加一名用户。
 * /users/register
 */
userRouter.post(
  '/register',
  body('email').isString().notEmpty(),
  body('username').isInt().notEmpty(),
  body('password').isString().notEmpty(),
  UserRoutes.register,
);

/**
 * 更新用户。
 * /users/update
 */
userRouter.put(
  '/update',
  auth,
  UserRoutes.update,
);

/**
 * 删除登录用户。
 * /users/delete
 */
userRouter.delete(
  '/delete',
  auth,
  UserRoutes.delete,
);

/**
 * 用户登录，无需auth
 * /users/login
 */
userRouter.post(
  '/login',
  body('username').isString().notEmpty(),
  body('password').isString().notEmpty(),
  UserRoutes.login,
);

/**
 * 校验 token 是否有效（支持 Authorization header / query / body）
 * GET /users/validate-token?token=... 或 POST /users/validate-token { token }
 */
userRouter.get(
  '/validate-token',
  auth,
  UserRoutes.validateToken,
);

userRouter.post(
  '/validate-token',
  auth,
  UserRoutes.validateToken,
);

/**
 * 刷新当前用户 token（需要认证）
 */
userRouter.post(
  '/refresh-token',
  auth,
  UserRoutes.refreshToken,
);

export default userRouter;