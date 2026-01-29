# Payment Processing Module

This module provides comprehensive payment processing functionality for the multi-vendor marketplace platform.

## Components

### 1. PaymentService (`payment.service.ts`)

Handles core payment operations including initiation, verification, and status tracking.

**Key Methods:**

- `calculateCheckoutTotal(subtotal, deliveryFee, taxRate)` - Calculate order total with tax
- `initiatePayment(orderId, method, amount)` - Start a payment transaction
- `verifyPayment(paymentId, gatewayTransactionId, gatewayResponse)` - Verify payment completion
- `getPaymentById(paymentId)` - Retrieve payment details
- `getPaymentByOrderId(orderId)` - Get payment for an order
- `updatePaymentStatus(paymentId, status)` - Update payment status
- `markPaymentFailed(paymentId, error)` - Mark payment as failed

**Example Usage:**

```typescript
import { PaymentService } from '@/services/payment.service';
import { PaymentMethod } from '@prisma/client';

const paymentService = new PaymentService();

// Calculate checkout total
const total = paymentService.calculateCheckoutTotal(100, 20, 0.05);
// Returns: { subtotal: 100, tax: 5, deliveryFee: 20, total: 125 }

// Initiate payment
const payment = await paymentService.initiatePayment(
  orderId,
  PaymentMethod.UPI,
  125
);

// Verify payment
const verifiedPayment = await paymentService.verifyPayment(
  payment.id,
  gatewayTransactionId,
  { verified: true }
);
```

### 2. RefundService (`refund.service.ts`)

Handles refund processing for cancelled or rejected orders.

**Key Methods:**

- `processRefund(paymentId, reason, amount?)` - Process a refund
- `getRefundById(refundId)` - Retrieve refund details
- `getRefundByPaymentId(paymentId)` - Get refund for a payment
- `updateRefundStatus(refundId, status)` - Update refund status

**Example Usage:**

```typescript
import { RefundService } from '@/services/refund.service';

const refundService = new RefundService();

// Process full refund
const refund = await refundService.processRefund(
  paymentId,
  'Order cancelled by customer'
);

// Process partial refund
const partialRefund = await refundService.processRefund(
  paymentId,
  'Partial order cancellation',
  50.00
);
```

### 3. PaymentGatewayAdapter (`payment-gateway.adapter.ts`)

Provides a unified interface for payment gateway integrations (Razorpay/Stripe).

**Note:** Currently uses mock implementations for development. In production, replace with actual gateway SDK integrations.

**Key Methods:**

- `initiatePayment(amount, method, orderId)` - Initiate gateway payment
- `verifyPayment(transactionId, orderId)` - Verify gateway payment
- `processRefund(transactionId, amount)` - Process gateway refund

## API Routes

### POST `/api/payments/initiate`

Initiate a payment for an order.

**Request Body:**
```json
{
  "orderId": "uuid",
  "method": "UPI" | "CARD" | "NET_BANKING" | "CASH_ON_DELIVERY",
  "amount": 125.00
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "payment-uuid",
    "orderId": "order-uuid",
    "amount": "125.00",
    "method": "UPI",
    "status": "PROCESSING",
    "gatewayTransactionId": "rzp_xxx"
  }
}
```

### POST `/api/payments/verify`

Verify a payment transaction.

**Request Body:**
```json
{
  "paymentId": "uuid",
  "gatewayTransactionId": "rzp_xxx",
  "gatewayResponse": { }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "payment-uuid",
    "status": "COMPLETED"
  }
}
```

### POST `/api/payments/refund`

Process a refund for a payment.

**Request Body:**
```json
{
  "paymentId": "uuid",
  "reason": "Order cancelled by customer",
  "amount": 125.00
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "refund-uuid",
    "paymentId": "payment-uuid",
    "amount": "125.00",
    "reason": "Order cancelled by customer",
    "status": "COMPLETED"
  }
}
```

### GET `/api/payments/[orderId]`

Get payment status by order ID.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "payment-uuid",
    "orderId": "order-uuid",
    "amount": "125.00",
    "method": "UPI",
    "status": "COMPLETED",
    "order": { },
    "refund": null
  }
}
```

### POST `/api/payments/calculate-total`

Calculate checkout total including tax and delivery fee.

**Request Body:**
```json
{
  "subtotal": 100.00,
  "deliveryFee": 20.00,
  "taxRate": 0.05
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "subtotal": 100.00,
    "tax": 5.00,
    "deliveryFee": 20.00,
    "total": 125.00
  }
}
```

## Payment Flow

### Standard Payment Flow

1. **Calculate Total**: Calculate order total with tax and delivery fee
2. **Initiate Payment**: Create payment record and initiate gateway transaction
3. **Customer Payment**: Customer completes payment on gateway
4. **Verify Payment**: Verify payment with gateway and update status
5. **Order Confirmation**: Confirm order and notify vendor

### Cash on Delivery Flow

1. **Calculate Total**: Calculate order total
2. **Initiate Payment**: Create payment record with COD method
3. **Order Confirmation**: Confirm order immediately
4. **Delivery**: Delivery partner collects payment
5. **Verify Payment**: Mark payment as completed after delivery

### Refund Flow

1. **Order Cancellation**: Order is cancelled or rejected
2. **Process Refund**: Create refund record and initiate gateway refund
3. **Update Payment**: Mark payment as refunded
4. **Customer Notification**: Notify customer of refund

## Payment Methods

- **CARD**: Credit/Debit card payments
- **UPI**: UPI payments (PhonePe, Google Pay, etc.)
- **NET_BANKING**: Net banking payments
- **CASH_ON_DELIVERY**: Cash payment on delivery

## Payment Status

- **PENDING**: Payment initiated but not processed
- **PROCESSING**: Payment being processed by gateway
- **COMPLETED**: Payment successfully completed
- **FAILED**: Payment failed
- **REFUNDED**: Payment refunded to customer

## Error Handling

All payment operations include comprehensive error handling:

- **Validation Errors**: Invalid input data (400 Bad Request)
- **Not Found**: Payment or order not found (404 Not Found)
- **Business Logic Errors**: Duplicate payments, invalid refunds (400 Bad Request)
- **Gateway Errors**: Payment gateway failures (502 Bad Gateway)
- **Server Errors**: Unexpected errors (500 Internal Server Error)

## Testing

The module includes comprehensive tests:

- **Unit Tests**: Test individual service methods
- **Integration Tests**: Test complete payment flows
- **Gateway Tests**: Test payment gateway adapter

Run tests:
```bash
npm test -- --testPathPatterns=payment
```

## Production Deployment

### Required Configuration

1. **Payment Gateway Setup**:
   - Sign up for Razorpay or Stripe account
   - Get API keys and secrets
   - Configure webhook endpoints

2. **Environment Variables**:
   ```env
   PAYMENT_GATEWAY=razorpay
   RAZORPAY_KEY_ID=your_key_id
   RAZORPAY_KEY_SECRET=your_key_secret
   ```

3. **Replace Mock Implementation**:
   - Update `PaymentGatewayAdapter` with actual SDK integration
   - Implement proper signature verification
   - Add webhook handlers for payment notifications

### Security Considerations

- Never log payment details or card information
- Use HTTPS for all payment communications
- Implement rate limiting on payment endpoints
- Validate payment signatures from gateway
- Store minimal payment data (use gateway tokenization)
- Implement idempotency for payment operations
- Add audit logging for all payment transactions

## Future Enhancements

- Support for additional payment gateways
- Recurring payments/subscriptions
- Split payments for multi-vendor orders
- Payment analytics and reporting
- Fraud detection integration
- International payment support
