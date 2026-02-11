'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle, Loader2, MessageSquare, Truck, XCircle } from 'lucide-react';
import { OrderStatus } from '@prisma/client';

interface OrderActionsProps {
  order: {
    id: string;
    orderNumber: string;
    status: OrderStatus;
    deliveryPartnerId?: string | null;
    payment: {
      status: string;
    } | null;
  };
  onActionComplete: () => void;
}

interface DeliveryPartner {
  id: string;
  user: {
    firstName: string;
    lastName: string;
    phone: string;
  };
  vehicleType: string | null;
  status: string;
}

export default function OrderActions({ order, onActionComplete }: OrderActionsProps) {
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showNoteDialog, setShowNoteDialog] = useState(false);
  const [showReassignDialog, setShowReassignDialog] = useState(false);
  
  const [cancelReason, setCancelReason] = useState('');
  const [notifyCustomer, setNotifyCustomer] = useState(true);
  const [noteContent, setNoteContent] = useState('');
  const [selectedDeliveryPartnerId, setSelectedDeliveryPartnerId] = useState('');
  
  const [deliveryPartners, setDeliveryPartners] = useState<DeliveryPartner[]>([]);
  const [loadingPartners, setLoadingPartners] = useState(false);
  
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Fetch delivery partners when reassign dialog opens
  useEffect(() => {
    if (showReassignDialog) {
      fetchDeliveryPartners();
    }
  }, [showReassignDialog]);

  const fetchDeliveryPartners = async () => {
    try {
      setLoadingPartners(true);
      // Fetch actual delivery partners, not just users
      const response = await fetch('/api/users?role=DELIVERY_PARTNER&includeDeliveryPartner=true');
      
      if (!response.ok) {
        throw new Error('Failed to fetch delivery partners');
      }

      const data = await response.json();
      // API returns { success: true, data: users[] }
      const users = Array.isArray(data.data) ? data.data : [];
      
      // Transform the user data to match our interface
      // Filter out users without delivery partner profiles and map to delivery partner ID
      const partners = users
        .filter((user: { deliveryPartner?: unknown }) => user.deliveryPartner) // Only include users with delivery partner profiles
        .map((user: { 
          deliveryPartner: { id: string; vehicleType: string; status: string }; 
          firstName: string; 
          lastName: string; 
          phone: string;
        }) => ({
          id: user.deliveryPartner.id, // Use deliveryPartner.id, not user.id
          user: {
            firstName: user.firstName,
            lastName: user.lastName,
            phone: user.phone,
          },
          vehicleType: user.deliveryPartner.vehicleType,
          status: user.deliveryPartner.status,
        }));
      
      setDeliveryPartners(partners);
    } catch (err) {
      console.error('Error fetching delivery partners:', err);
      setError('Failed to load delivery partners');
    } finally {
      setLoadingPartners(false);
    }
  };

  const handleCancelOrder = async () => {
    if (!cancelReason.trim()) {
      setError('Please provide a cancellation reason');
      return;
    }

    try {
      setProcessing(true);
      setError(null);

      const response = await fetch(`/api/admin/orders/${order.id}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reason: cancelReason,
          notifyCustomer,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to cancel order');
      }

      setSuccess('Order cancelled successfully');
      setShowCancelDialog(false);
      setCancelReason('');
      
      // Notify parent to refresh
      setTimeout(() => {
        onActionComplete();
      }, 1500);
    } catch (err) {
      console.error('Error cancelling order:', err);
      setError(err instanceof Error ? err.message : 'Failed to cancel order');
    } finally {
      setProcessing(false);
    }
  };

  const handleAddNote = async () => {
    if (!noteContent.trim()) {
      setError('Please enter a note');
      return;
    }

    try {
      setProcessing(true);
      setError(null);

      const response = await fetch(`/api/admin/orders/${order.id}/notes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: noteContent,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to add note');
      }

      setSuccess('Note added successfully');
      setShowNoteDialog(false);
      setNoteContent('');
      
      // Notify parent to refresh
      setTimeout(() => {
        onActionComplete();
      }, 1500);
    } catch (err) {
      console.error('Error adding note:', err);
      setError(err instanceof Error ? err.message : 'Failed to add note');
    } finally {
      setProcessing(false);
    }
  };

  const handleReassignDelivery = async () => {
    if (!selectedDeliveryPartnerId) {
      setError('Please select a delivery partner');
      return;
    }

    try {
      setProcessing(true);
      setError(null);

      const response = await fetch(`/api/admin/orders/${order.id}/reassign-delivery`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          deliveryPartnerId: selectedDeliveryPartnerId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to reassign delivery partner');
      }

      setSuccess('Delivery partner reassigned successfully');
      setShowReassignDialog(false);
      setSelectedDeliveryPartnerId('');
      
      // Notify parent to refresh
      setTimeout(() => {
        onActionComplete();
      }, 1500);
    } catch (err) {
      console.error('Error reassigning delivery partner:', err);
      setError(err instanceof Error ? err.message : 'Failed to reassign delivery partner');
    } finally {
      setProcessing(false);
    }
  };

  const canCancelOrder = () => {
    // Orders can be cancelled if not already delivered or cancelled
    const nonCancellableStatuses: OrderStatus[] = [OrderStatus.DELIVERED, OrderStatus.CANCELLED];
    return !nonCancellableStatuses.includes(order.status);
  };

  const canReassignDelivery = () => {
    // Can reassign if order has a delivery partner or is in delivery-related status
    const reassignableStatuses: OrderStatus[] = [
      OrderStatus.READY_FOR_PICKUP,
      OrderStatus.ASSIGNED_TO_DELIVERY,
      OrderStatus.PICKED_UP,
      OrderStatus.IN_TRANSIT,
    ];
    return reassignableStatuses.includes(order.status);
  };

  return (
    <div className="space-y-4">
      {/* Success Message */}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start space-x-3">
          <AlertCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          <p className="text-green-800 text-sm">{success}</p>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3">
        <Button
          onClick={() => setShowNoteDialog(true)}
          variant="outline"
          className="flex items-center space-x-2"
        >
          <MessageSquare className="w-4 h-4" />
          <span>Add Note</span>
        </Button>

        {canReassignDelivery() && (
          <Button
            onClick={() => setShowReassignDialog(true)}
            variant="outline"
            className="flex items-center space-x-2"
          >
            <Truck className="w-4 h-4" />
            <span>Reassign Delivery</span>
          </Button>
        )}

        {canCancelOrder() && (
          <Button
            onClick={() => setShowCancelDialog(true)}
            variant="destructive"
            className="flex items-center space-x-2"
          >
            <XCircle className="w-4 h-4" />
            <span>Cancel Order</span>
          </Button>
        )}
      </div>

      {/* Cancel Order Dialog */}
      {showCancelDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Cancel Order</h3>
            <p className="text-sm text-gray-600 mb-4">
              Are you sure you want to cancel order {order.orderNumber}? This action cannot be undone.
              {order.payment?.status === 'COMPLETED' && (
                <span className="block mt-2 text-orange-600 font-medium">
                  A refund will be initiated automatically.
                </span>
              )}
            </p>

            <div className="space-y-4">
              <div>
                <label htmlFor="cancelReason" className="block text-sm font-medium text-gray-700 mb-1">
                  Cancellation Reason *
                </label>
                <textarea
                  id="cancelReason"
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Enter reason for cancellation..."
                  maxLength={500}
                  disabled={processing}
                />
                <p className="text-xs text-gray-500 mt-1">{cancelReason.length}/500 characters</p>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="notifyCustomer"
                  checked={notifyCustomer}
                  onChange={(e) => setNotifyCustomer(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  disabled={processing}
                />
                <label htmlFor="notifyCustomer" className="ml-2 text-sm text-gray-700">
                  Notify customer about cancellation
                </label>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <Button
                onClick={() => {
                  setShowCancelDialog(false);
                  setCancelReason('');
                  setError(null);
                }}
                variant="outline"
                disabled={processing}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCancelOrder}
                variant="destructive"
                disabled={processing || !cancelReason.trim()}
              >
                {processing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Cancelling...
                  </>
                ) : (
                  'Confirm Cancellation'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Add Note Dialog */}
      {showNoteDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Add Admin Note</h3>
            <p className="text-sm text-gray-600 mb-4">
              Add a note to order {order.orderNumber}. This will be visible in the order history.
            </p>

            <div>
              <label htmlFor="noteContent" className="block text-sm font-medium text-gray-700 mb-1">
                Note *
              </label>
              <textarea
                id="noteContent"
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={4}
                placeholder="Enter your note..."
                maxLength={1000}
                disabled={processing}
              />
              <p className="text-xs text-gray-500 mt-1">{noteContent.length}/1000 characters</p>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <Button
                onClick={() => {
                  setShowNoteDialog(false);
                  setNoteContent('');
                  setError(null);
                }}
                variant="outline"
                disabled={processing}
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddNote}
                disabled={processing || !noteContent.trim()}
              >
                {processing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Adding...
                  </>
                ) : (
                  'Add Note'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Reassign Delivery Partner Dialog */}
      {showReassignDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Reassign Delivery Partner</h3>
            <p className="text-sm text-gray-600 mb-4">
              Select a new delivery partner for order {order.orderNumber}.
              {order.deliveryPartnerId && (
                <span className="block mt-2 text-orange-600 font-medium">
                  This will notify both the current and new delivery partners.
                </span>
              )}
            </p>

            <div>
              <label htmlFor="deliveryPartner" className="block text-sm font-medium text-gray-700 mb-1">
                Delivery Partner *
              </label>
              {loadingPartners ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                  <span className="ml-2 text-sm text-gray-600">Loading delivery partners...</span>
                </div>
              ) : (
                <select
                  id="deliveryPartner"
                  value={selectedDeliveryPartnerId}
                  onChange={(e) => setSelectedDeliveryPartnerId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={processing}
                >
                  <option value="">Select a delivery partner</option>
                  {deliveryPartners.map((partner) => (
                    <option key={partner.id} value={partner.id}>
                      {partner.user.firstName} {partner.user.lastName} - {partner.user.phone}
                      {partner.vehicleType && ` (${partner.vehicleType})`}
                    </option>
                  ))}
                </select>
              )}
              {deliveryPartners.length === 0 && !loadingPartners && (
                <p className="text-sm text-gray-500 mt-2">No delivery partners available</p>
              )}
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <Button
                onClick={() => {
                  setShowReassignDialog(false);
                  setSelectedDeliveryPartnerId('');
                  setError(null);
                }}
                variant="outline"
                disabled={processing}
              >
                Cancel
              </Button>
              <Button
                onClick={handleReassignDelivery}
                disabled={processing || !selectedDeliveryPartnerId || loadingPartners}
              >
                {processing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Reassigning...
                  </>
                ) : (
                  'Reassign'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
