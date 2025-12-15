// src/types/express.d.ts
import 'express';
import type {
  Request as ExpressRequest,
  Response as ExpressResponse,
  ParamsDictionary,
} from 'express-serve-static-core';

declare global {
  interface Locals {
    auth: {
      id: number;
    };
  }
  /** 全局 Request 类型别名：按需覆盖 Body/Params/Query 的类型 */
  type IReq<
    Q extends ParsedQs = ParsedQs,
    P extends ParamsDictionary = ParamsDictionary,
    B = unknown,
    ResB = unknown,
    L extends Express.Locals = Express.Locals
  > = ExpressRequest<P, ResB, B, Q, L>;

  /**
   * 正确的 Express Response 类型别名（无 any）
   * ResB=响应体，L=locals（默认就是全局合并后的 Express.Locals）
   */
  type IRes<
    ResB = unknown,
    L extends Express.Locals = Locals
  > = ExpressResponse<ResB, L>;
}

// 扩展 Express Response 类型
declare global {
  namespace Express {
    interface Response {
      // 成功响应方法
      success<T = unknown>(data?: T, message?: string, statusCode?: number): Response;
      // 错误响应方法
      error(message: string, error?: unknown, statusCode?: number): Response;
    }
  }
}

export { global };
