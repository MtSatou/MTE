/* eslint-disable indent */
import WebSocket, { WebSocketServer, RawData } from 'ws';
import logger from '@src/util/log';
import HttpStatusCodes from '@src/constants/HttpStatusCodes';
import { stringToJson } from '@src/util/json';
import { v4 as uuidv4 } from 'uuid';
import ConnectionManager from './ConnectionManager';
import { ExtendedWebSocket, MessageType, WSMessage } from './types';
import type { IncomingMessage } from 'http';

/**
 * 获取 WebSocket 连接状态和统计信息
 */
function getStatus(_: IReq, res: IRes) {
  const stats = ConnectionManager.getStats();
  return res.status(HttpStatusCodes.OK).json({
    ...stats,
    message: 'WebSocket 服务运行中',
  });
}

/**
 * WebSocket 消息处理器
 */
function handleConnection(ws: WebSocket, req: IncomingMessage) {
  req;
  // 扩展 WebSocket 对象
  const extWs = ws as ExtendedWebSocket;
  extWs.id = uuidv4();
  extWs.isAlive = true;
  extWs.rooms = new Set();
  extWs.connectedAt = Date.now();
  extWs.lastPing = Date.now();

  // 添加到连接管理器
  ConnectionManager.addClient(extWs);

  // 发送欢迎消息
  ConnectionManager.sendToClient(extWs.id, {
    type: MessageType.SYSTEM,
    data: {
      message: '连接成功',
      clientId: extWs.id,
    },
  });

  logger.info(`新的 WebSocket 连接: ${extWs.id}`);

  // 接收消息
  extWs.on('message', (data: RawData) => {
    try {
      const message = String(data);
      logger.info(`收到消息 [${extWs.id}]: ${message}`);

      // 解析JSON消息
      const parsed = stringToJson(message) as WSMessage;

      // 处理不同类型的消息
      handleMessage(extWs.id, parsed);
    } catch (error) {
      logger.error(error as Error);
      ConnectionManager.sendToClient(extWs.id, {
        type: MessageType.ERROR,
        data: { message: '消息格式错误，需要 JSON 格式' },
      });
    }
  });

  // 处理 pong 响应（心跳）
  extWs.on('pong', () => {
    extWs.isAlive = true;
  });

  // 处理关闭
  extWs.on('close', () => {
    logger.info(`WebSocket 连接关闭: ${extWs.id}`);
    ConnectionManager.removeClient(extWs.id);
  });

  // 处理错误
  extWs.on('error', (error: Error) => {
    logger.error(error);
    ConnectionManager.removeClient(extWs.id);
  });
}

/**
 * 处理不同类型的消息
 */
function handleMessage(clientId: string, message: WSMessage): void {
  switch (message.type) {
    case MessageType.PING:
      // 响应 ping
      ConnectionManager.sendToClient(clientId, {
        type: MessageType.PONG,
        data: { timestamp: new Date().toISOString() },
      });
      break;

    case MessageType.JOIN_ROOM:
      // 加入房间
      if (message.room) {
        ConnectionManager.joinRoom(clientId, message.room);
      }
      break;

    case MessageType.LEAVE_ROOM:
      // 离开房间
      if (message.room) {
        ConnectionManager.leaveRoom(clientId, message.room);
      }
      break;

    case MessageType.ROOM_MESSAGE:
      // 发送房间消息
      if (message.room) {
        const count = ConnectionManager.broadcastToRoom(
          message.room,
          {
            type: MessageType.ROOM_MESSAGE,
            data: message.data,
            from: clientId,
          },
          [clientId] // 排除发送者
        );
        logger.info(`消息已发送到房间 ${message.room}，接收者: ${count}`);
      }
      break;

    case MessageType.BROADCAST: {
      // 广播消息（需要权限控制）
      const count = ConnectionManager.broadcast(
        {
          type: MessageType.BROADCAST,
          data: message.data,
          from: clientId,
        },
        [clientId]
      );
      logger.info(`广播消息已发送，接收者: ${count}`);
      break;
    }

    case MessageType.MESSAGE:
    default:
      // 默认回显消息
      ConnectionManager.sendToClient(clientId, {
        type: MessageType.MESSAGE,
        data: message.data,
      });
      break;
  }
}

/**
 * 广播消息给所有连接的客户端
 */
function broadcast(wss: WebSocketServer, message: WSMessage) {
  ConnectionManager.broadcast({
    ...message,
    type: MessageType.BROADCAST,
  });
}

export default {
  getStatus,
  handleConnection,
  broadcast,
} as const;
