/**
 * SMS Service
 * Handles sending SMS notifications via Twilio or similar gateway
 */

export interface SMSConfig {
  accountSid?: string;
  authToken?: string;
  fromNumber?: string;
}

export interface SMSMessage {
  to: string;
  body: string;
}

export interface SMSResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export class SMSService {
  private config: SMSConfig;
  private isConfigured: boolean;

  constructor(config?: SMSConfig) {
    this.config = config || {
      accountSid: process.env.TWILIO_ACCOUNT_SID,
      authToken: process.env.TWILIO_AUTH_TOKEN,
      fromNumber: process.env.TWILIO_FROM_NUMBER,
    };

    this.isConfigured = !!(
      this.config.accountSid &&
      this.config.authToken &&
      this.config.fromNumber
    );
  }

  /**
   * Send an SMS message
   */
  async sendSMS(message: SMSMessage): Promise<SMSResult> {
    try {
      // If SMS is not configured, log and return success (for development)
      if (!this.isConfigured) {
        console.log('[SMS Service] SMS not configured. Message would be sent:', {
          to: message.to,
          body: message.body,
        });
        return {
          success: true,
          messageId: `mock-${Date.now()}`,
        };
      }

      // In production, integrate with Twilio or similar service
      // Example Twilio integration:
      // const client = require('twilio')(this.config.accountSid, this.config.authToken);
      // const result = await client.messages.create({
      //   body: message.body,
      //   from: this.config.fromNumber,
      //   to: message.to
      // });
      // return { success: true, messageId: result.sid };

      // For now, return mock success
      console.log('[SMS Service] Sending SMS:', {
        to: message.to,
        body: message.body,
      });

      return {
        success: true,
        messageId: `sms-${Date.now()}`,
      };
    } catch (error) {
      console.error('[SMS Service] Error sending SMS:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Send OTP via SMS
   */
  async sendOTP(phone: string, code: string): Promise<SMSResult> {
    const message: SMSMessage = {
      to: phone,
      body: `Your verification code is: ${code}. This code will expire in 10 minutes.`,
    };

    return this.sendSMS(message);
  }

  /**
   * Send order placed notification
   */
  async sendOrderPlacedNotification(
    phone: string,
    orderNumber: string,
    vendorName: string
  ): Promise<SMSResult> {
    const message: SMSMessage = {
      to: phone,
      body: `Your order ${orderNumber} has been placed with ${vendorName}. We'll notify you when it's accepted.`,
    };

    return this.sendSMS(message);
  }

  /**
   * Send order status update notification
   */
  async sendOrderStatusNotification(
    phone: string,
    orderNumber: string,
    status: string
  ): Promise<SMSResult> {
    const statusMessages: Record<string, string> = {
      ACCEPTED: 'has been accepted and is being prepared',
      READY_FOR_PICKUP: 'is ready for pickup',
      PICKED_UP: 'has been picked up by the delivery partner',
      IN_TRANSIT: 'is on the way to you',
      DELIVERED: 'has been delivered',
      CANCELLED: 'has been cancelled',
      REJECTED: 'has been rejected',
    };

    const statusMessage = statusMessages[status] || 'status has been updated';

    const message: SMSMessage = {
      to: phone,
      body: `Your order ${orderNumber} ${statusMessage}.`,
    };

    return this.sendSMS(message);
  }

  /**
   * Send delivery assignment notification to delivery partner
   */
  async sendDeliveryAssignmentNotification(
    phone: string,
    orderNumber: string
  ): Promise<SMSResult> {
    const message: SMSMessage = {
      to: phone,
      body: `New delivery request available for order ${orderNumber}. Check your app for details.`,
    };

    return this.sendSMS(message);
  }
}

// Export singleton instance
export const smsService = new SMSService();
