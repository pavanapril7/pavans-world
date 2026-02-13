"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { MapPin, CreditCard, Loader2, Calendar, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import MealSlotSelector from "./components/MealSlotSelector";
import DeliveryWindowSelector from "./components/DeliveryWindowSelector";
import FulfillmentMethodSelector from "./components/FulfillmentMethodSelector";

interface Address {
  id: string;
  label: string;
  street: string;
  landmark: string;
  city: string;
  state: string;
  pincode: string;
  isDefault: boolean;
}

interface CartItem {
  id: string;
  quantity: number;
  product: {
    id: string;
    name: string;
    price: number;
  };
}

interface Cart {
  items: CartItem[];
  vendor: {
    id: string;
    businessName: string;
  };
  vendorId: string;
}

interface MealSlot {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  cutoffTime: string;
  isActive: boolean;
  isAvailable?: boolean;
}

interface FulfillmentConfig {
  eatInEnabled: boolean;
  pickupEnabled: boolean;
  deliveryEnabled: boolean;
}

type FulfillmentMethod = 'EAT_IN' | 'PICKUP' | 'DELIVERY';

export default function CheckoutPage() {
  const router = useRouter();
  const [cart, setCart] = useState<Cart | null>(null);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<string>("CARD");
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  
  // Meal slot and delivery window state
  const [mealSlots, setMealSlots] = useState<MealSlot[]>([]);
  const [selectedMealSlot, setSelectedMealSlot] = useState<string | null>(null);
  const [selectedDeliveryWindow, setSelectedDeliveryWindow] = useState<{
    start: string;
    end: string;
  } | null>(null);
  const [loadingMealSlots, setLoadingMealSlots] = useState(false);
  
  // Fulfillment method state
  const [fulfillmentConfig, setFulfillmentConfig] = useState<FulfillmentConfig | null>(null);
  const [fulfillmentMethod, setFulfillmentMethod] = useState<FulfillmentMethod>('DELIVERY');
  const [loadingFulfillment, setLoadingFulfillment] = useState(false);

  useEffect(() => {
    fetchCart();
    fetchAddresses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (cart?.vendorId) {
      fetchMealSlots();
      fetchFulfillmentConfig();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cart?.vendorId]);

  const fetchCart = async () => {
    try {
      const response = await fetch("/api/cart");
      if (response.ok) {
        const result = await response.json();
        setCart(result.data);
      } else {
        router.push("/cart");
      }
    } catch (error) {
      console.error("Failed to fetch cart:", error);
    }
  };

  const fetchAddresses = async () => {
    try {
      setLoading(true);
      // Assuming we have a way to get current user ID
      const response = await fetch("/api/auth/session");
      if (response.ok) {
        const session = await response.json();
        const addressResponse = await fetch(
          `/api/users/${session.user.id}/addresses`
        );
        if (addressResponse.ok) {
          const result = await addressResponse.json();
          const addressList = result.data || [];
          setAddresses(addressList);
          const defaultAddr = addressList.find((addr: Address) => addr.isDefault);
          if (defaultAddr) {
            setSelectedAddress(defaultAddr.id);
          }
        }
      }
    } catch (error) {
      console.error("Failed to fetch addresses:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMealSlots = async () => {
    if (!cart?.vendorId) return;

    setLoadingMealSlots(true);
    try {
      const response = await fetch(
        `/api/vendors/${cart.vendorId}/meal-slots?available=true`
      );
      if (response.ok) {
        const data = await response.json();
        // API returns array directly, not wrapped in object
        const slots = Array.isArray(data) ? data : (data.mealSlots || []);
        
        // Check availability based on current time and cutoff
        const now = new Date();
        const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        
        const slotsWithAvailability = slots.map((slot: MealSlot) => ({
          ...slot,
          isAvailable: slot.cutoffTime > currentTime,
        }));
        
        setMealSlots(slotsWithAvailability);
      }
    } catch (error) {
      console.error("Failed to fetch meal slots:", error);
    } finally {
      setLoadingMealSlots(false);
    }
  };

  const fetchFulfillmentConfig = async () => {
    if (!cart?.vendorId) return;

    setLoadingFulfillment(true);
    try {
      const response = await fetch(
        `/api/vendors/${cart.vendorId}/fulfillment-config`
      );
      if (response.ok) {
        const data = await response.json();
        setFulfillmentConfig(data);
        
        // Set default fulfillment method based on what's enabled
        if (data.deliveryEnabled) {
          setFulfillmentMethod('DELIVERY');
        } else if (data.pickupEnabled) {
          setFulfillmentMethod('PICKUP');
        } else if (data.eatInEnabled) {
          setFulfillmentMethod('EAT_IN');
        }
      }
    } catch (error) {
      console.error("Failed to fetch fulfillment config:", error);
    } finally {
      setLoadingFulfillment(false);
    }
  };

  const calculateSubtotal = () => {
    if (!cart) return 0;
    return cart.items.reduce(
      (total, item) => total + item.product.price * item.quantity,
      0
    );
  };

  const calculateTotal = async () => {
    try {
      const response = await fetch("/api/payments/calculate-total", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subtotal: calculateSubtotal(),
          deliveryFee: 50, // Default delivery fee
          taxRate: 0.05, // 5% tax rate
        }),
      });

      if (response.ok) {
        const result = await response.json();
        return result.data;
      }
    } catch (error) {
      console.error("Failed to calculate total:", error);
    }

    return {
      subtotal: calculateSubtotal(),
      deliveryFee: 50,
      tax: calculateSubtotal() * 0.05,
      total: calculateSubtotal() + 50 + calculateSubtotal() * 0.05,
    };
  };

  const [totals, setTotals] = useState({
    subtotal: 0,
    deliveryFee: 0,
    tax: 0,
    total: 0,
  });

  useEffect(() => {
    if (selectedAddress && cart) {
      calculateTotal().then(setTotals);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAddress, cart]);

  const placeOrder = async () => {
    // Validate fulfillment method and address
    if (fulfillmentMethod === 'DELIVERY' && !selectedAddress) {
      alert("Please select a delivery address");
      return;
    }

    if (!cart || !cart.items || cart.items.length === 0) {
      alert("Your cart is empty");
      return;
    }

    if (!selectedMealSlot) {
      alert("Please select a meal slot");
      return;
    }

    setProcessing(true);

    try {
      // Prepare order items from cart
      const orderItems = cart.items.map((item) => ({
        productId: item.product.id,
        quantity: item.quantity,
      }));

      // Create order with meal slot, delivery window, and fulfillment method
      const orderData: any = {
        items: orderItems,
        subtotal: totals.subtotal,
        deliveryFee: totals.deliveryFee,
        tax: totals.tax,
        total: totals.total,
        mealSlotId: selectedMealSlot,
        fulfillmentMethod: fulfillmentMethod,
      };

      // Only add delivery address if fulfillment method is DELIVERY
      if (fulfillmentMethod === 'DELIVERY') {
        orderData.deliveryAddressId = selectedAddress;
      }

      // Add delivery window if selected
      if (selectedDeliveryWindow) {
        orderData.preferredDeliveryStart = selectedDeliveryWindow.start;
        orderData.preferredDeliveryEnd = selectedDeliveryWindow.end;
      }

      const orderResponse = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderData),
      });

      if (!orderResponse.ok) {
        const errorData = await orderResponse.json();
        throw new Error(errorData.error?.message || "Order creation failed");
      }

      const order = await orderResponse.json();

      // Initiate payment with the order ID
      const paymentResponse = await fetch("/api/payments/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: order.id,
          amount: totals.total,
          method: paymentMethod,
        }),
      });

      if (!paymentResponse.ok) {
        const errorData = await paymentResponse.json();
        throw new Error(errorData.error?.message || "Payment initiation failed");
      }

      const paymentResult = await paymentResponse.json();
      const payment = paymentResult.data || paymentResult;

      // For demo purposes, simulate payment verification
      // In production, this would integrate with actual payment gateway
      const verifyResponse = await fetch("/api/payments/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentId: payment.id,
          gatewayTransactionId: "demo_" + Date.now(),
        }),
      });

      if (!verifyResponse.ok) {
        const errorData = await verifyResponse.json();
        throw new Error(errorData.error?.message || "Payment verification failed");
      }

      // Clear the cart after successful order
      if (cart?.vendorId) {
        try {
          await fetch(`/api/cart?vendorId=${cart.vendorId}`, {
            method: "DELETE",
          });
          
          // Dispatch cart updated event to update the cart badge
          window.dispatchEvent(new Event('cartUpdated'));
        } catch (error) {
          console.error("Failed to clear cart:", error);
          // Don't fail the order if cart clearing fails
        }
      }

      // Redirect to order confirmation
      router.push(`/orders/${order.id}`);
    } catch (error) {
      console.error("Failed to place order:", error);
      alert(error instanceof Error ? error.message : "Failed to place order. Please try again.");
    } finally {
      setProcessing(false);
    }
  };

  const formatPrice = (price: number) => {
    return `₹${Number(price).toFixed(2)}`;
  };

  if (loading || !cart) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Checkout</h1>
        <p className="text-gray-600 mt-2">Complete your order</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Checkout Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Fulfillment Method Selection */}
          {cart?.vendorId && (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center space-x-2 mb-4">
                <Truck className="w-5 h-5 text-blue-600" />
                <h2 className="text-xl font-bold text-gray-900">
                  Fulfillment Method
                </h2>
              </div>

              <FulfillmentMethodSelector
                config={fulfillmentConfig}
                selectedMethod={fulfillmentMethod}
                onSelectMethod={setFulfillmentMethod}
                loading={loadingFulfillment}
              />
            </div>
          )}

          {/* Meal Slot Selection */}
          {cart?.vendorId && (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center space-x-2 mb-4">
                <Calendar className="w-5 h-5 text-blue-600" />
                <h2 className="text-xl font-bold text-gray-900">
                  Select Meal Slot
                </h2>
              </div>

              <MealSlotSelector
                vendorId={cart.vendorId}
                mealSlots={mealSlots}
                selectedSlotId={selectedMealSlot}
                onSelectSlot={setSelectedMealSlot}
                loading={loadingMealSlots}
              />

              {selectedMealSlot && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <DeliveryWindowSelector
                    vendorId={cart.vendorId}
                    mealSlotId={selectedMealSlot}
                    selectedWindow={selectedDeliveryWindow}
                    onSelectWindow={setSelectedDeliveryWindow}
                  />
                </div>
              )}
            </div>
          )}

          {/* Delivery Address */}
          {fulfillmentMethod === 'DELIVERY' && (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center space-x-2 mb-4">
                <MapPin className="w-5 h-5 text-blue-600" />
                <h2 className="text-xl font-bold text-gray-900">
                  Delivery Address
                </h2>
              </div>

              {addresses.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-600 mb-4">No addresses found</p>
                  <Button onClick={() => router.push("/profile/addresses")}>
                    Add Address
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {addresses.map((address) => (
                    <label
                      key={address.id}
                      className={`block p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                        selectedAddress === address.id
                          ? "border-blue-600 bg-blue-50"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <input
                        type="radio"
                        name="address"
                        value={address.id}
                        checked={selectedAddress === address.id}
                        onChange={(e) => setSelectedAddress(e.target.value)}
                        className="sr-only"
                      />
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="font-semibold text-gray-900">
                            {address.label}
                            {address.isDefault && (
                              <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                                Default
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-gray-600 mt-1">
                            {address.street}, {address.landmark}
                            <br />
                            {address.city}, {address.state} - {address.pincode}
                          </div>
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Payment Method */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center space-x-2 mb-4">
              <CreditCard className="w-5 h-5 text-blue-600" />
              <h2 className="text-xl font-bold text-gray-900">
                Payment Method
              </h2>
            </div>

            <div className="space-y-3">
              {["CARD", "UPI", "NET_BANKING", "CASH_ON_DELIVERY"].map(
                (method) => (
                  <label
                    key={method}
                    className={`block p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                      paymentMethod === method
                        ? "border-blue-600 bg-blue-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <input
                      type="radio"
                      name="payment"
                      value={method}
                      checked={paymentMethod === method}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="sr-only"
                    />
                    <div className="font-medium text-gray-900">
                      {method.replace(/_/g, " ")}
                    </div>
                  </label>
                )
              )}
            </div>
          </div>
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg border border-gray-200 p-6 sticky top-24">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Order Summary
            </h2>

            <div className="space-y-2 mb-4">
              {cart.vendor && (
                <div className="text-sm text-gray-600">
                  From {cart.vendor.businessName}
                </div>
              )}
              <div className="text-sm text-gray-600">
                {cart.items?.length || 0} item(s)
              </div>
            </div>

            <div className="space-y-3 mb-6">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span>
                <span>{formatPrice(totals.subtotal)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Delivery Fee</span>
                <span>{formatPrice(totals.deliveryFee)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Tax</span>
                <span>{formatPrice(totals.tax)}</span>
              </div>
              <div className="border-t border-gray-200 pt-3">
                <div className="flex justify-between text-lg font-bold text-gray-900">
                  <span>Total</span>
                  <span>{formatPrice(totals.total)}</span>
                </div>
              </div>
            </div>

            <Button
              onClick={placeOrder}
              className="w-full"
              size="lg"
              disabled={
                !selectedMealSlot ||
                (fulfillmentMethod === 'DELIVERY' && !selectedAddress) ||
                processing
              }
            >
              {processing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                "Place Order"
              )}
            </Button>

            {!selectedMealSlot && (
              <p className="text-xs text-center text-amber-600 mt-2">
                Please select a meal slot to continue
              </p>
            )}
            {fulfillmentMethod === 'DELIVERY' && !selectedAddress && selectedMealSlot && (
              <p className="text-xs text-center text-amber-600 mt-2">
                Please select a delivery address to continue
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
