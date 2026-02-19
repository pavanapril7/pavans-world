import { UserRole } from '@prisma/client';

/**
 * WebSocket event types
 */
export type WebSocketEventType =
  | 'location_update'
  | 'delivery_assigned'
  | 'order_ready'
  | 'delivery_completed'
  | 'notification_cancelled';

/**
 * Base WebSocket event interface
 */
export interface BaseWebSocketEvent {
  type: WebSocketEventType;
  eventId: string;
}

/**
 * Location update event
 * Sent to customers tracking their delivery
 */
export interface LocationUpdateEvent extends BaseWebSocketEvent {
  type: 'location_update';
  deliveryId: string;
  latitude: number;
  longitude: number;
  eta: number; // minutes
  timestamp: string; // ISO
}

/**
 * Delivery assigned event
 * Sent to delivery partners when a new delivery opportunity is available
 */
export interface DeliveryAssignedEvent extends BaseWebSocketEvent {
  type: 'delivery_assigned';
  orderId: string;
  vendorLocation: {
    latitude: number;
    longitude: number;
  };
  deliveryAddress: {
    latitude: number;
    longitude: number;
    address: string;
  };
  estimatedDistanceKm: number;
  paymentAmount: number;
  expiresAt: string; // ISO timestamp
}

/**
 * Order ready event
 * Sent to delivery partners when an order is ready for pickup
 */
export interface OrderReadyEvent extends BaseWebSocketEvent {
  type: 'order_ready';
  orderId: string;
  vendorLocation: {
    latitude: number;
    longitude: number;
  };
  expiresAt: string;
}

/**
 * Delivery completed event
 * Sent to customers when their delivery is completed
 */
export interface DeliveryCompletedEvent extends BaseWebSocketEvent {
  type: 'delivery_completed';
  deliveryId: string;
  completedAt: string;
}

/**
 * Notification cancelled event
 * Sent to delivery partners when a notification is cancelled
 */
export interface NotificationCancelledEvent extends BaseWebSocketEvent {
  type: 'notification_cancelled';
  orderId: string;
  reason: 'accepted_by_other' | 'cancelled';
}

/**
 * Union type of all WebSocket events
 */
export type WebSocketEvent =
  | LocationUpdateEvent
  | DeliveryAssignedEvent
  | OrderReadyEvent
  | DeliveryCompletedEvent
  | NotificationCancelledEvent;

/**
 * Authentication message from client
 */
export interface AuthMessage {
  type: 'auth';
  token: string;
}

/**
 * Authentication success response
 */
export interface AuthSuccessMessage {
  type: 'auth_success';
  userId: string;
}

/**
 * Authentication error response
 */
export interface AuthErrorMessage {
  type: 'auth_error';
  message: string;
}

/**
 * Connection info stored for each client
 */
export interface ConnectionInfo {
  userId: string;
  role: UserRole;
  ws: any; // WebSocket instance
  connectedAt: Date;
}

/**
 * HTTP API request types
 */
export interface TriggerLocationUpdateRequest {
  deliveryId: string;
  latitude: number;
  longitude: number;
  eta: number;
}

export interface TriggerDeliveryAssignedRequest {
  deliveryPartnerIds: string[];
  orderId: string;
  vendorLocation: {
    latitude: number;
    longitude: number;
  };
  deliveryAddress: {
    latitude: number;
    longitude: number;
    address: string;
  };
  estimatedDistanceKm: number;
  paymentAmount: number;
}

export interface TriggerNotificationCancelledRequest {
  deliveryPartnerIds: string[];
  orderId: string;
  reason: 'accepted_by_other' | 'cancelled';
}
