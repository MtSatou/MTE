/**
 * Environments variables declared here.
 */

/* eslint-disable node/no-process-env */


export default {
  NodeEnv: (process.env.NODE_ENV ?? ''),
  Port: (process.env.PORT ?? 0),
  CookieProps: {
    Key: 'ExpressGeneratorTs',
    Secret: (process.env.COOKIE_SECRET ?? ''),
    // Casing to match express cookie options
    Options: {
      httpOnly: true,
      signed: true,
      path: (process.env.COOKIE_PATH ?? ''),
      maxAge: Number(process.env.COOKIE_EXP ?? 0),
      domain: (process.env.COOKIE_DOMAIN ?? ''),
      secure: (process.env.SECURE_COOKIE === 'true'),
    },
  },
  Jwt: {
    Secret: (process.env.JWT_SECRET ?? ''),
    Exp: (process.env.COOKIE_EXP ?? ''), // exp at the same time as the cookie
  },
  // API 根路由（例如 '/api'）。将根路径放到配置中，便于部署时修改前缀
  ApiBase: (process.env.API_BASE ?? '/api'),
  // 邮件配置
  Email: {
    Host: (process.env.EMAIL_HOST ?? 'smtp.gmail.com'),
    Port: Number(process.env.EMAIL_PORT ?? 587),
    Secure: (process.env.EMAIL_SECURE === 'true'),
    User: (process.env.EMAIL_USER ?? ''),
    Pass: (process.env.EMAIL_PASS ?? ''),
    From: (process.env.EMAIL_FROM ?? ''),
  },
  // MySQL数据库配置
  Database: {
    Host: (process.env.DB_HOST ?? 'localhost'),
    Port: Number(process.env.DB_PORT ?? 3306),
    User: (process.env.DB_USER ?? 'root'),
    Password: (process.env.DB_PASSWORD ?? ''),
    Database: (process.env.DB_NAME ?? 'mtexpress'),
    Charset: (process.env.DB_CHARSET ?? 'utf8mb4'),
    Timezone: (process.env.DB_TIMEZONE ?? '+08:00'),
    ConnectionLimit: Number(process.env.DB_CONNECTION_LIMIT ?? 10),
  },
} as const;
