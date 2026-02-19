/**
 * Connection Manager
 * 
 * Manages WebSocket connections, subscriptions, and message routing
 */

import { UserRole } from '@prisma/client';
import { ConnectionInfo, WebSocketEvent } from './types';
import WebSocket from 'ws';

export class ConnectionManager {
  private connections: Map<string, ConnectionInfo>;
  private orderSubscriptions: Map<string, Set<string>>;

  constructor() {
    this.connections = new Map();
    this.orderSubscriptions = new Map();
  }

  /**
   * Add authenticated connection
   */
  addConnection(userId: string, role: UserRole, ws: WebSocket): void {
    // Remove existing connection if any
    if (this.connections.has(userId)) {
      const existing = this.connections.get(userId);
      if (existing && existing.ws.readyState === WebSocket.OPEN) {
        existing.ws.close(1000, 'New connection established');
      }
    }

    // Store new connection
    this.connections.set(userId, {
      userId,
      role,
      ws,
      connectedAt: new Date(),
    });

    console.log(`Connection added: userId=${userId}, role=${role}, total=${this.connections.size}`);
  }

  /**
   * Remove connection
   */
  removeConnection(userId: string): void {
    const connection = this.connections.get(userId);
    
    if (connection) {
      // Close WebSocket if still open
      if (connection.ws.readyState === WebSocket.OPEN) {
        connection.ws.close(1000, 'Connection removed');
      }

      // Remove from connections
      this.connections.delete(userId);

      // Remove from all order subscriptions
      for (const [orderId, subscribers] of this.orderSubscriptions.entries()) {
        subscribers.delete(userId);
        // Clean up empty subscription sets
        if (subscribers.size === 0) {
          this.orderSubscriptions.delete(orderId);
        }
      }

      console.log(`Connection removed: userId=${userId}, total=${this.connections.size}`);
    }
  }

  /**
   * Subscribe user to order updates
   */
  subscribeToOrder(userId: string, orderId: string): void {
    if (!this.orderSubscriptions.has(orderId)) {
      this.orderSubscriptions.set(orderId, new Set());
    }

    this.orderSubscriptions.get(orderId)!.add(userId);
    console.log(`User ${userId} subscribed to order ${orderId}`);
  }

  /**
   * Unsubscribe user from order updates
   */
  unsubscribeFromOrder(userId: string, orderId: string): void {
    const subscribers = this.orderSubscriptions.get(orderId);
    if (subscribers) {
      subscribers.delete(userId);
      if (subscribers.size === 0) {
        this.orderSubscriptions.delete(orderId);
      }
      console.log(`User ${userId} unsubscribed from order ${orderId}`);
    }
  }

  /**
   * Get all subscribers for an order
   */
  getOrderSubscribers(orderId: string): string[] {
    const subscribers = this.orderSubscriptions.get(orderId);
    return subscribers ? Array.from(subscribers) : [];
  }

  /**
   * Send event to specific user
   */
  sendToUser(userId: string, event: WebSocketEvent): void {
    const connection = this.connections.get(userId);

    if (!connection) {
      console.warn(`Cannot send event: user ${userId} not connected`);
      return;
    }

    if (connection.ws.readyState !== WebSocket.OPEN) {
      console.warn(`Cannot send event: connection for user ${userId} not open`);
      return;
    }

    try {
      connection.ws.send(JSON.stringify(event));
      console.log(`Event sent to user ${userId}: ${event.type}`);
    } catch (error) {
      console.error(`Error sending event to user ${userId}:`, error);
      // Remove dead connection
      this.removeConnection(userId);
    }
  }

  /**
   * Send event to multiple users
   */
  sendToUsers(userIds: string[], event: WebSocketEvent): void {
    for (const userId of userIds) {
      this.sendToUser(userId, event);
    }
  }

  /**
   * Broadcast to all delivery partners
   */
  broadcastToDeliveryPartners(event: WebSocketEvent): void {
    const deliveryPartnerIds: string[] = [];

    for (const [userId, connection] of this.connections.entries()) {
      if (connection.role === UserRole.DELIVERY_PARTNER) {
        deliveryPartnerIds.push(userId);
      }
    }

    console.log(`Broadcasting to ${deliveryPartnerIds.length} delivery partners`);
    this.sendToUsers(deliveryPartnerIds, event);
  }

  /**
   * Get connection count
   */
  getConnectionCount(): number {
    return this.connections.size;
  }

  /**
   * Get connection count by role
   */
  getConnectionCountByRole(role: UserRole): number {
    let count = 0;
    for (const connection of this.connections.values()) {
      if (connection.role === role) {
        count++;
      }
    }
    return count;
  }

  /**
   * Check if user is connected
   */
  isConnected(userId: string): boolean {
    const connection = this.connections.get(userId);
    return connection !== undefined && connection.ws.readyState === WebSocket.OPEN;
  }

  /**
   * Clean up stale connections
   * Called periodically to remove connections that are no longer open
   */
  cleanupStaleConnections(): void {
    const staleUserIds: string[] = [];

    for (const [userId, connection] of this.connections.entries()) {
      if (connection.ws.readyState !== WebSocket.OPEN) {
        staleUserIds.push(userId);
      }
    }

    for (const userId of staleUserIds) {
      this.removeConnection(userId);
    }

    if (staleUserIds.length > 0) {
      console.log(`Cleaned up ${staleUserIds.length} stale connections`);
    }
  }
}
