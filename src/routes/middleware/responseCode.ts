import { NextFunction, Response } from 'express';
import HttpStatusCodes from '@src/constants/HttpStatusCodes';

// 定义统一的响应格式
interface StandardResponse<T = unknown> {
  code: number;
  data?: T;
  message: string;
  error?: T;
}

/**
 * 统一响应格式中间件：将所有响应统一为 {code, data, message, error} 格式
 * 
 * 响应格式规范：
 * - 成功响应：{ code: HTTP状态码, data: 业务数据, message: "成功信息" }
 * - 错误响应：{ code: HTTP状态码, message: "错误信息", error: "详细错误信息" }
 */
export default function responseCodeMiddleware(req: IReq, res: IRes, next: NextFunction): void {
  // 挂载便捷响应方法到 res 对象
  res.success = function <T = unknown>(
    data?: T,
    message: string = '操作成功',
    statusCode: number = HttpStatusCodes.OK
  ): Response {
    const responseData: StandardResponse<T> = {
      code: statusCode,
      data,
      message,
    };
    return this.status(statusCode).json(responseData);
  };

  res.error = function <T = unknown>(
    message: string,
    error?: T,
    statusCode: number = HttpStatusCodes.BAD_REQUEST
  ): Response {
    const response: StandardResponse<T> = {
      code: statusCode,
      message,
    };

    if (error !== undefined && error !== null) {
      response.error = error;
    }

    return this.status(statusCode).json(response);
  };

  return next();
}
