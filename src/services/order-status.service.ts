import { OrderStatus } from '@prisma/client';

/**
 * Service for managing order status transitions and validations
 */
export class OrderStatusService {
  /**
   * Valid status transitions map
   * Key: current status, Value: array of allowed next statuses
   */
  private static readonly VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
    [OrderStatus.PENDING]: [OrderStatus.ACCEPTED, OrderStatus.REJECTED, OrderStatus.CANCELLED],
    [OrderStatus.ACCEPTED]: [OrderStatus.PREPARING, OrderStatus.CANCELLED],
    [OrderStatus.PREPARING]: [OrderStatus.READY_FOR_PICKUP, OrderStatus.CANCELLED],
    [OrderStatus.READY_FOR_PICKUP]: [OrderStatus.ASSIGNED_TO_DELIVERY, OrderStatus.CANCELLED],
    [OrderStatus.ASSIGNED_TO_DELIVERY]: [OrderStatus.PICKED_UP, OrderStatus.CANCELLED],
    [OrderStatus.PICKED_UP]: [OrderStatus.IN_TRANSIT],
    [OrderStatus.IN_TRANSIT]: [OrderStatus.DELIVERED],
    [OrderStatus.DELIVERED]: [], // Terminal state
    [OrderStatus.CANCELLED]: [], // Terminal state
    [OrderStatus.REJECTED]: [], // Terminal state
  };

  /**
   * Check if a status transition is valid
   */
  static isValidTransition(currentStatus: OrderStatus, newStatus: OrderStatus): boolean {
    const allowedTransitions = this.VALID_TRANSITIONS[currentStatus];
    return allowedTransitions.includes(newStatus);
  }

  /**
   * Get allowed next statuses for current status
   */
  static getAllowedNextStatuses(currentStatus: OrderStatus): OrderStatus[] {
    return this.VALID_TRANSITIONS[currentStatus];
  }

  /**
   * Validate status transition and throw error if invalid
   */
  static validateTransition(currentStatus: OrderStatus, newStatus: OrderStatus): void {
    if (!this.isValidTransition(currentStatus, newStatus)) {
      throw new Error(
        `Invalid status transition from ${currentStatus} to ${newStatus}. ` +
        `Allowed transitions: ${this.getAllowedNextStatuses(currentStatus).join(', ')}`
      );
    }
  }

  /**
   * Check if status is terminal (no further transitions allowed)
   */
  static isTerminalStatus(status: OrderStatus): boolean {
    return this.VALID_TRANSITIONS[status].length === 0;
  }

  /**
   * Get human-readable status description
   */
  static getStatusDescription(status: OrderStatus): string {
    const descriptions: Record<OrderStatus, string> = {
      [OrderStatus.PENDING]: 'Order placed, awaiting vendor confirmation',
      [OrderStatus.ACCEPTED]: 'Order accepted by vendor',
      [OrderStatus.PREPARING]: 'Order is being prepared',
      [OrderStatus.READY_FOR_PICKUP]: 'Order is ready for pickup',
      [OrderStatus.ASSIGNED_TO_DELIVERY]: 'Delivery partner assigned',
      [OrderStatus.PICKED_UP]: 'Order picked up by delivery partner',
      [OrderStatus.IN_TRANSIT]: 'Order is on the way',
      [OrderStatus.DELIVERED]: 'Order delivered successfully',
      [OrderStatus.CANCELLED]: 'Order cancelled',
      [OrderStatus.REJECTED]: 'Order rejected by vendor',
    };

    return descriptions[status];
  }

  /**
   * Get status category (active, completed, failed)
   */
  static getStatusCategory(status: OrderStatus): 'active' | 'completed' | 'failed' {
    if (status === OrderStatus.DELIVERED) {
      return 'completed';
    }

    if (status === OrderStatus.CANCELLED || status === OrderStatus.REJECTED) {
      return 'failed';
    }

    return 'active';
  }

  /**
   * Check if customer can cancel order in current status
   */
  static canCustomerCancel(status: OrderStatus): boolean {
    const cancellableStatuses: OrderStatus[] = [
      OrderStatus.PENDING,
      OrderStatus.ACCEPTED,
      OrderStatus.PREPARING,
    ];
    return cancellableStatuses.includes(status);
  }

  /**
   * Check if vendor can accept/reject order in current status
   */
  static canVendorAcceptReject(status: OrderStatus): boolean {
    return status === OrderStatus.PENDING;
  }

  /**
   * Check if vendor can mark order as ready in current status
   */
  static canVendorMarkReady(status: OrderStatus): boolean {
    const readyStatuses: OrderStatus[] = [OrderStatus.ACCEPTED, OrderStatus.PREPARING];
    return readyStatuses.includes(status);
  }

  /**
   * Check if delivery partner can accept order in current status
   */
  static canDeliveryPartnerAccept(status: OrderStatus): boolean {
    return status === OrderStatus.READY_FOR_PICKUP;
  }

  /**
   * Check if delivery partner can update status
   */
  static canDeliveryPartnerUpdate(status: OrderStatus): boolean {
    const updateableStatuses: OrderStatus[] = [
      OrderStatus.ASSIGNED_TO_DELIVERY,
      OrderStatus.PICKED_UP,
      OrderStatus.IN_TRANSIT,
    ];
    return updateableStatuses.includes(status);
  }
}
