"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { MapPin, CreditCard, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

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
    name: string;
    price: number;
  };
}

interface Cart {
  items: CartItem[];
  vendor: {
    businessName: string;
  };
}

export default function CheckoutPage() {
  const router = useRouter();
  const [cart, setCart] = useState<Cart | null>(null);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<string>("CARD");
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchCart();
    fetchAddresses();
  }, []);

  const fetchCart = async () => {
    try {
      const response = await fetch("/api/cart");
      if (response.ok) {
        const data = await response.json();
        setCart(data);
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
          const data = await addressResponse.json();
          setAddresses(data);
          const defaultAddr = data.find((addr: Address) => addr.isDefault);
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
          deliveryAddressId: selectedAddress,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        return data;
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
  }, [selectedAddress, cart]);

  const placeOrder = async () => {
    if (!selectedAddress) {
      alert("Please select a delivery address");
      return;
    }

    setProcessing(true);

    try {
      // Initiate payment
      const paymentResponse = await fetch("/api/payments/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: totals.total,
          method: paymentMethod,
        }),
      });

      if (!paymentResponse.ok) {
        throw new Error("Payment initiation failed");
      }

      const paymentData = await paymentResponse.json();

      // For demo purposes, simulate payment verification
      // In production, this would integrate with actual payment gateway
      const verifyResponse = await fetch("/api/payments/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentId: paymentData.id,
          gatewayTransactionId: "demo_" + Date.now(),
        }),
      });

      if (!verifyResponse.ok) {
        throw new Error("Payment verification failed");
      }

      // Create order
      const orderResponse = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deliveryAddressId: selectedAddress,
          paymentId: paymentData.id,
        }),
      });

      if (!orderResponse.ok) {
        throw new Error("Order creation failed");
      }

      const order = await orderResponse.json();

      // Redirect to order confirmation
      router.push(`/orders/${order.id}`);
    } catch (error) {
      console.error("Failed to place order:", error);
      alert("Failed to place order. Please try again.");
    } finally {
      setProcessing(false);
    }
  };

  const formatPrice = (price: number | any) => {
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
          {/* Delivery Address */}
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
              <div className="text-sm text-gray-600">
                From {cart.vendor.businessName}
              </div>
              <div className="text-sm text-gray-600">
                {cart.items.length} item(s)
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
              disabled={!selectedAddress || processing}
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
          </div>
        </div>
      </div>
    </div>
  );
}
