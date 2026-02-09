import pino from 'pino';
import pretty from 'pino-pretty';
import baseUrl from './baseUrl';
import path from 'path';
import fs from 'fs';

// 获取日志文件路径: baseUrl + '/log' + 当天日期.txt
const getLogFilePath = (): string => {
  const date = new Date();
  const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
  const logDir = path.join(__dirname, baseUrl, 'logs');
  return path.join(logDir, `${dateStr}.txt`);
};

// 确保日志目录存在
const logFilePath = getLogFilePath();
const logDir = path.dirname(logFilePath);
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

const prettyStream = pretty({
  colorize: true,
  translateTime: 'SYS:standard',
});

// 文件写入流
const fileStream = pino.transport({
  target: 'pino/file',
  options: { destination: logFilePath, mkdir: true },
}) as pretty.PrettyStream;

export const logger = pino(
  {
    level: 'info',
    redact: ['req.headers.authorization', 'password'],
    // 文件输出使用可读时间格式
    timestamp: () => `,"time":"${new Date().toLocaleString()}"`,
  },
  pino.multistream([
    { level: 'info', stream: prettyStream },
    { level: 'info', stream: fileStream },
  ]),
);

export default {
  info: (msg: string) => logger.info({}, msg),
  warn: (msg: string) => logger.warn({}, msg),
  error: (e: unknown, msg = 'error') =>
    logger.error(e instanceof Error ? { err: e } : { err: msg }),
};
