/**
 * WebSocket Server Entry Point
 * 
 * Initializes the WebSocket server for real-time communication
 */

import dotenv from 'dotenv';
import WebSocket, { WebSocketServer } from 'ws';
import { ConnectionManager } from './connection-manager';
import { validateToken } from './auth';
import { AuthMessage, AuthSuccessMessage, AuthErrorMessage } from './types';

// Load environment variables
dotenv.config();

const WS_PORT = parseInt(process.env.WS_PORT || '8080');
const WS_HOST = process.env.WS_HOST || '0.0.0.0';

// Initialize connection manager
const connectionManager = new ConnectionManager();

// Create WebSocket server
const wss = new WebSocketServer({
  port: WS_PORT,
  host: WS_HOST,
});

console.log(`WebSocket server starting on ${WS_HOST}:${WS_PORT}...`);

// Track pending authentications (userId -> timeout)
const authTimeouts = new Map<WebSocket, NodeJS.Timeout>();

/**
 * Handle new WebSocket connection
 */
wss.on('connection', (ws: WebSocket) => {
  console.log('New WebSocket connection established');

  let authenticated = false;
  let userId: string | undefined;

  // Set authentication timeout (10 seconds)
  const authTimeout = setTimeout(() => {
    if (!authenticated) {
      console.log('Authentication timeout - closing connection');
      ws.close(4001, 'Authentication timeout');
    }
  }, 10000);

  authTimeouts.set(ws, authTimeout);

  /**
   * Handle incoming messages
   */
  ws.on('message', async (data: Buffer) => {
    try {
      const message = JSON.parse(data.toString());

      // Handle authentication message
      if (message.type === 'auth') {
        const authMessage = message as AuthMessage;

        if (!authMessage.token) {
          const errorResponse: AuthErrorMessage = {
            type: 'auth_error',
            message: 'Token required',
          };
          ws.send(JSON.stringify(errorResponse));
          ws.close(4001, 'Token required');
          return;
        }

        // Validate token
        const authResult = await validateToken(authMessage.token);

        if (!authResult.success || !authResult.userId || !authResult.role) {
          const errorResponse: AuthErrorMessage = {
            type: 'auth_error',
            message: authResult.error || 'Authentication failed',
          };
          ws.send(JSON.stringify(errorResponse));
          ws.close(4001, authResult.error || 'Authentication failed');
          return;
        }

        // Authentication successful
        authenticated = true;
        userId = authResult.userId;

        // Clear authentication timeout
        const timeout = authTimeouts.get(ws);
        if (timeout) {
          clearTimeout(timeout);
          authTimeouts.delete(ws);
        }

        // Add connection to manager
        connectionManager.addConnection(authResult.userId, authResult.role, ws);

        // Send success response
        const successResponse: AuthSuccessMessage = {
          type: 'auth_success',
          userId: authResult.userId,
        };
        ws.send(JSON.stringify(successResponse));

        console.log(`User authenticated: ${authResult.userId} (${authResult.role})`);
        return;
      }

      // All other messages require authentication
      if (!authenticated) {
        const errorResponse: AuthErrorMessage = {
          type: 'auth_error',
          message: 'Not authenticated',
        };
        ws.send(JSON.stringify(errorResponse));
        return;
      }

      // Handle other message types (subscribe, unsubscribe, etc.)
      if (message.type === 'subscribe' && message.orderId && userId) {
        connectionManager.subscribeToOrder(userId, message.orderId);
        ws.send(JSON.stringify({ type: 'subscribed', orderId: message.orderId }));
      } else if (message.type === 'unsubscribe' && message.orderId && userId) {
        connectionManager.unsubscribeFromOrder(userId, message.orderId);
        ws.send(JSON.stringify({ type: 'unsubscribed', orderId: message.orderId }));
      } else if (message.type === 'ping') {
        ws.send(JSON.stringify({ type: 'pong' }));
      }
    } catch (error) {
      console.error('Error processing message:', error);
      const errorResponse: AuthErrorMessage = {
        type: 'auth_error',
        message: 'Invalid message format',
      };
      ws.send(JSON.stringify(errorResponse));
    }
  });

  /**
   * Handle connection close
   */
  ws.on('close', (code: number, reason: Buffer) => {
    console.log(`Connection closed: code=${code}, reason=${reason.toString()}`);

    // Clear authentication timeout if exists
    const timeout = authTimeouts.get(ws);
    if (timeout) {
      clearTimeout(timeout);
      authTimeouts.delete(ws);
    }

    // Remove connection if authenticated
    if (authenticated && userId) {
      // Delay removal to allow for reconnection
      setTimeout(() => {
        if (!connectionManager.isConnected(userId!)) {
          connectionManager.removeConnection(userId!);
        }
      }, 60000); // 60 second cleanup timeout
    }
  });

  /**
   * Handle connection errors
   */
  ws.on('error', (error: Error) => {
    console.error('WebSocket error:', error);
  });
});

/**
 * Handle server errors
 */
wss.on('error', (error: Error) => {
  console.error('WebSocket server error:', error);
});

/**
 * Periodic cleanup of stale connections
 */
setInterval(() => {
  connectionManager.cleanupStaleConnections();
}, 60000); // Every 60 seconds

/**
 * Log server statistics
 */
setInterval(() => {
  console.log(`WebSocket Server Stats:
  - Total connections: ${connectionManager.getConnectionCount()}
  - Customers: ${connectionManager.getConnectionCountByRole('CUSTOMER')}
  - Delivery Partners: ${connectionManager.getConnectionCountByRole('DELIVERY_PARTNER')}
  - Vendors: ${connectionManager.getConnectionCountByRole('VENDOR')}
  - Admins: ${connectionManager.getConnectionCountByRole('SUPER_ADMIN')}
  `);
}, 30000); // Every 30 sec

console.log(`✅ WebSocket server running on ws://${WS_HOST}:${WS_PORT}`);

// Initialize HTTP API server
import { initializeHttpApi } from './http-api';
initializeHttpApi(connectionManager);

// Export for HTTP API to use
export { connectionManager };
