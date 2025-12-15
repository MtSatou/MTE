import { IUser } from '@src/types/user';

const INVALID_CONSTRUCTOR_PARAM = 'with the appropriate user keys.';

/**
 * 创建新用户默认数据
 */
function new_(
  username?: string,
  email?: string,
  password?: string,
  avatar?: string | null,
  code?: string,
): Omit<IUser, 'id'> {
  return {
    username: (username ?? ''),
    email: (email ?? ''),
    password: (password ?? ''),
    avatar: (avatar ?? null),
    code: code,
    created: new Date().toLocaleString(),
    updated: null,
    token: null,
    tokenExpiresAt: null,
    lastActiveAt: null,
  } as IUser;
}

/**
 * 通过一个符合用户的字段生成一个新用户
 */
function newUser(param: IUser): Omit<IUser, 'id'> {
  if (!isUser(param)) {
    throw new Error(INVALID_CONSTRUCTOR_PARAM);
  }
  const p = param;
  return new_(p.username, p.email, p.password, p.avatar, p.code);
}

/**
 * 查看参数是否满足成为用户的标准。
 */
function isUser(arg: unknown): boolean {
  return (
    !!arg &&
    typeof arg === 'object' &&
    'email' in arg && typeof arg.email === 'string' &&
    'username' in arg && typeof arg.username === 'string' &&
    'password' in arg && typeof arg.password === 'string'
  );
}

export {
  newUser,
  isUser,
};

// **** Export default **** //
export default {
  newUser,
  isUser,
} as const;
