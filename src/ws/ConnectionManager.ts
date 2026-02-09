import WebSocket from 'ws';
import logger from '@src/util/log';
import { ExtendedWebSocket, MessageType, WSMessage, ConnectionStats } from './types';

/**
 * WebSocket 连接管理器
 * 提供心跳检测、房间管理、消息广播等功能
 */
class ConnectionManager {
  private clients: Map<string, ExtendedWebSocket> = new Map();
  private rooms: Map<string, Set<string>> = new Map();
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private startTime: number = Date.now();

  // 配置项
  private readonly HEARTBEAT_INTERVAL = 30000; // 30秒
  private readonly HEARTBEAT_TIMEOUT = 35000;  // 35秒超时

  /**
   * 启动心跳检测
   */
  startHeartbeat(): void {
    if (this.heartbeatInterval) {
      return;
    }

    this.heartbeatInterval = setInterval(() => {
      this.checkHeartbeat();
    }, this.HEARTBEAT_INTERVAL);

    logger.info('心跳检测已启动');
  }

  /**
   * 停止心跳检测
   */
  stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
      logger.info('心跳检测已停止');
    }
  }

  /**
   * 检查所有连接的心跳状态
   */
  private checkHeartbeat(): void {
    const now = Date.now();
    let terminated = 0;

    this.clients.forEach((ws, id) => {
      // 检查是否超时
      if (ws.lastPing && now - ws.lastPing > this.HEARTBEAT_TIMEOUT) {
        logger.warn(`连接 ${id} 心跳超时，断开连接`);
        this.removeClient(id);
        ws.terminate();
        terminated++;
        return;
      }

      // 标记为未响应，发送 ping
      if (ws.readyState === WebSocket.OPEN) {
        ws.isAlive = false;
        ws.ping();
        ws.lastPing = now;
      }
    });

    if (terminated > 0) {
      logger.info(`心跳检测：清理了 ${terminated} 个超时连接，当前连接数: ${this.clients.size}`);
    }
  }

  /**
   * 添加新连接
   */
  addClient(ws: ExtendedWebSocket): void {
    this.clients.set(ws.id, ws);

    // 设置 pong 响应处理
    ws.on('pong', () => {
      ws.isAlive = true;
    });

    logger.info(`新连接添加: ${ws.id}，当前连接数: ${this.clients.size}`);
  }

  /**
   * 移除连接
   */
  removeClient(clientId: string): void {
    const ws = this.clients.get(clientId);
    if (ws) {
      // 从所有房间移除
      ws.rooms.forEach(room => {
        this.leaveRoom(clientId, room);
      });

      this.clients.delete(clientId);
      logger.info(`连接已移除: ${clientId}，当前连接数: ${this.clients.size}`);
    }
  }

  /**
   * 获取指定连接
   */
  getClient(clientId: string): ExtendedWebSocket | undefined {
    return this.clients.get(clientId);
  }

  /**
   * 获取所有连接
   */
  getAllClients(): ExtendedWebSocket[] {
    return Array.from(this.clients.values());
  }

  /**
   * 加入房间
   */
  joinRoom(clientId: string, roomId: string): boolean {
    const ws = this.clients.get(clientId);
    if (!ws) {
      return false;
    }

    // 添加到客户端的房间集合
    ws.rooms.add(roomId);

    // 添加到房间的客户端集合
    if (!this.rooms.has(roomId)) {
      this.rooms.set(roomId, new Set());
    }
    this.rooms.get(roomId)!.add(clientId);

    logger.info(`客户端 ${clientId} 加入房间 ${roomId}`);

    // 通知客户端加入成功
    this.sendToClient(clientId, {
      type: MessageType.SYSTEM,
      data: { message: `已加入房间: ${roomId}` },
      room: roomId,
    });

    return true;
  }

  /**
   * 离开房间
   */
  leaveRoom(clientId: string, roomId: string): boolean {
    const ws = this.clients.get(clientId);
    if (!ws) {
      return false;
    }

    // 从客户端的房间集合移除
    ws.rooms.delete(roomId);

    // 从房间的客户端集合移除
    const room = this.rooms.get(roomId);
    if (room) {
      room.delete(clientId);

      // 如果房间为空，删除房间
      if (room.size === 0) {
        this.rooms.delete(roomId);
        logger.info(`房间 ${roomId} 已清空并移除`);
      }
    }

    logger.info(`客户端 ${clientId} 离开房间 ${roomId}`);

    // 通知客户端离开成功
    this.sendToClient(clientId, {
      type: MessageType.SYSTEM,
      data: { message: `已离开房间: ${roomId}` },
      room: roomId,
    });

    return true;
  }

  /**
   * 发送消息给指定客户端
   */
  sendToClient(clientId: string, message: WSMessage): boolean {
    const ws = this.clients.get(clientId);
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      return false;
    }

    try {
      const data = JSON.stringify({
        ...message,
        timestamp: message.timestamp || new Date().toLocaleString(),
      });
      ws.send(data);
      return true;
    } catch (error) {
      logger.error(error as Error);
      return false;
    }
  }

  /**
   * 广播消息给所有客户端
   */
  broadcast(message: WSMessage, excludeIds: string[] = []): number {
    let count = 0;
    const excludeSet = new Set(excludeIds);

    this.clients.forEach((ws, id) => {
      if (!excludeSet.has(id) && ws.readyState === WebSocket.OPEN) {
        if (this.sendToClient(id, message)) {
          count++;
        }
      }
    });

    return count;
  }

  /**
   * 向指定房间广播消息
   */
  broadcastToRoom(roomId: string, message: WSMessage, excludeIds: string[] = []): number {
    const room = this.rooms.get(roomId);
    if (!room) {
      return 0;
    }

    let count = 0;
    const excludeSet = new Set(excludeIds);

    room.forEach(clientId => {
      if (!excludeSet.has(clientId)) {
        if (this.sendToClient(clientId, { ...message, room: roomId })) {
          count++;
        }
      }
    });

    return count;
  }

  /**
   * 按条件广播消息
   */
  broadcastWhere(
    predicate: (ws: ExtendedWebSocket) => boolean,
    message: WSMessage,
  ): number {
    let count = 0;

    this.clients.forEach((ws, id) => {
      if (ws.readyState === WebSocket.OPEN && predicate(ws)) {
        if (this.sendToClient(id, message)) {
          count++;
        }
      }
    });

    return count;
  }

  /**
   * 获取房间列表
   */
  getRooms(): string[] {
    return Array.from(this.rooms.keys());
  }

  /**
   * 获取房间中的客户端数量
   */
  getRoomSize(roomId: string): number {
    return this.rooms.get(roomId)?.size ?? 0;
  }

  /**
   * 获取连接统计信息
   */
  getStats(): ConnectionStats {
    const rooms: Record<string, number> = {};
    this.rooms.forEach((clients, roomId) => {
      rooms[roomId] = clients.size;
    });

    return {
      total: this.clients.size,
      active: Array.from(this.clients.values()).filter(
        ws => ws.readyState === WebSocket.OPEN
      ).length,
      rooms,
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
    };
  }

  /**
   * 获取客户端所在的房间列表
   */
  getClientRooms(clientId: string): string[] {
    const ws = this.clients.get(clientId);
    return ws ? Array.from(ws.rooms) : [];
  }

  /**
   * 检查客户端是否在指定房间
   */
  isInRoom(clientId: string, roomId: string): boolean {
    const ws = this.clients.get(clientId);
    return ws ? ws.rooms.has(roomId) : false;
  }

  /**
   * 清理所有连接
   */
  cleanup(): void {
    this.stopHeartbeat();

    this.clients.forEach((ws, id) => {
      logger.info(`关闭连接: ${id}`);
      ws.close(1000, '服务器关闭');
    });

    this.clients.clear();
    this.rooms.clear();

    logger.info('连接管理器已清理');
  }
}

export default new ConnectionManager();
