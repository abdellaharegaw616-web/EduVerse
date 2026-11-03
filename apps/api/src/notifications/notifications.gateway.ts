import { Injectable, Logger } from '@nestjs/common';

export interface RealtimeNotificationPayload {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: string;
  actionUrl?: string | null;
  createdAt: Date;
}

@Injectable()
export class NotificationsGateway {
  private readonly logger = new Logger(NotificationsGateway.name);
  private connectedSockets: Map<string, Set<string>> = new Map();
  private deliveryHistory: RealtimeNotificationPayload[] = [];

  /**
   * Registers a client socket session for a user.
   */
  registerClient(userId: string, socketId: string) {
    if (!this.connectedSockets.has(userId)) {
      this.connectedSockets.set(userId, new Set());
    }
    this.connectedSockets.get(userId)!.add(socketId);
    this.logger.debug(`[SOCKET] User ${userId} connected socket ${socketId}`);
  }

  /**
   * Unregisters a client socket session.
   */
  unregisterClient(userId: string, socketId: string) {
    const sockets = this.connectedSockets.get(userId);
    if (sockets) {
      sockets.delete(socketId);
      if (sockets.size === 0) {
        this.connectedSockets.delete(userId);
      }
    }
  }

  /**
   * Emits a real-time event to the user's active sockets if connected.
   */
  emitToUser(userId: string, payload: RealtimeNotificationPayload): boolean {
    this.deliveryHistory.push(payload);
    const sockets = this.connectedSockets.get(userId);
    const isOnline = Boolean(sockets && sockets.size > 0);

    if (isOnline) {
      this.logger.log(
        `[SOCKET BROADCAST] Emitted "notification:new" to user ${userId} (${sockets!.size} active connections)`,
      );
    } else {
      this.logger.debug(`[SOCKET] User ${userId} is offline; real-time event cached`);
    }

    return isOnline;
  }

  getDeliveredEventsForUser(userId: string): RealtimeNotificationPayload[] {
    return this.deliveryHistory.filter((e) => e.userId === userId);
  }

  clearHistory() {
    this.deliveryHistory = [];
    this.connectedSockets.clear();
  }
}

