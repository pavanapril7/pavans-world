'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Image from 'next/image';
import { ArrowLeft, Edit, Store, Tag, Package, DollarSign, Plus, Minus, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Product {
  id: string;
  name: string;
  description: string;
  price: string | number;
  imageUrl: string;
  status: string;
  category: string;
  vendor: {
    id: string;
    businessName: string;
    status: string;
    user: {
      id: string;
    };
  };
  createdAt: string;
  updatedAt: string;
}

interface Session {
  user: {
    id: string;
    role: string;
  };
}

export default function ProductDetailPage() {
  const router = useRouter();
  const params = useParams();
  const productId = params.productId as string;
  
  const [product, setProduct] = useState<Product | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [canEdit, setCanEdit] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [addingToCart, setAddingToCart] = useState(false);

  useEffect(() => {
    fetchSession();
    fetchProduct();
  }, [productId]);

  const fetchSession = async () => {
    try {
      const response = await fetch('/api/auth/session');
      if (response.ok) {
        const data = await response.json();
        setSession(data);
      }
    } catch (error) {
      console.error('Failed to fetch session:', error);
    }
  };

  const fetchProduct = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/products/${productId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch product');
      }

      const data = await response.json();
      setProduct(data);
    } catch (error) {
      console.error('Error fetching product:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session && product) {
      // Super admin can edit any product
      if (session.user.role === 'SUPER_ADMIN') {
        setCanEdit(true);
      }
      // Vendor can edit their own products
      else if (session.user.role === 'VENDOR' && session.user.id === product.vendor.user.id) {
        setCanEdit(true);
      }
    }
  }, [session, product]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'AVAILABLE':
        return 'bg-green-100 text-green-800';
      case 'OUT_OF_STOCK':
        return 'bg-yellow-100 text-yellow-800';
      case 'DISCONTINUED':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleEdit = () => {
    if (session?.user.role === 'SUPER_ADMIN') {
      // Admin can use the admin edit modal or navigate to admin page
      router.push(`/admin/products?edit=${productId}`);
    } else {
      // Vendor navigates to their edit page
      router.push(`/vendor/products/${productId}/edit`);
    }
  };

  const updateQuantity = (delta: number) => {
    setQuantity((prev) => Math.max(1, prev + delta));
  };

  const addToCart = async () => {
    if (!product) return;

    try {
      setAddingToCart(true);
      const response = await fetch('/api/cart/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: product.id,
          vendorId: product.vendor.id,
          quantity,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Failed to add to cart');
      }

      alert('Added to cart successfully!');
      setQuantity(1);
    } catch (error) {
      console.error('Error adding to cart:', error);
      alert(error instanceof Error ? error.message : 'Failed to add to cart');
    } finally {
      setAddingToCart(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <Package className="w-16 h-16 text-gray-400 mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Product Not Found</h2>
        <p className="text-gray-600 mb-6">The product you're looking for doesn't exist.</p>
        <Button onClick={() => router.back()}>Go Back</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Button
              onClick={() => router.back()}
              variant="outline"
              className="flex items-center"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            
            {canEdit && (
              <Button onClick={handleEdit} className="flex items-center">
                <Edit className="w-4 h-4 mr-2" />
                Edit Product
              </Button>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Product Details */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-8">
          {/* Product Image */}
          <div className="relative aspect-square rounded-lg overflow-hidden bg-gray-100">
            <Image
              src={product.imageUrl}
              alt={product.name}
              fill
              className="object-cover"
            />
          </div>

          {/* Product Info */}
          <div className="space-y-6">
            <div>
              <div className="flex items-start justify-between mb-2">
                <h1 className="text-3xl font-bold text-gray-900">{product.name}</h1>
                <span
                  className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(
                    product.status
                  )}`}
                >
                  {product.status.replace('_', ' ')}
                </span>
              </div>
              <p className="text-gray-600 text-lg">{product.description}</p>
            </div>

            <div className="border-t border-gray-200 pt-6">
              <div className="flex items-center text-4xl font-bold text-gray-900 mb-6">
                <DollarSign className="w-8 h-8" />
                {Number(product.price).toFixed(2)}
              </div>

              <div className="space-y-4">
                <div className="flex items-center text-gray-700">
                  <Tag className="w-5 h-5 mr-3 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">Category</p>
                    <p className="font-medium">{product.category}</p>
                  </div>
                </div>

                <div className="flex items-center text-gray-700">
                  <Store className="w-5 h-5 mr-3 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">Vendor</p>
                    <button
                      onClick={() => router.push(`/vendors/${product.vendor.id}`)}
                      className="font-medium text-blue-600 hover:text-blue-800"
                    >
                      {product.vendor.businessName}
                    </button>
                  </div>
                </div>

                <div className="flex items-center text-gray-700">
                  <Package className="w-5 h-5 mr-3 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">Product ID</p>
                    <p className="font-mono text-sm">{product.id}</p>
                  </div>
                </div>
              </div>
            </div>

            {product.status === 'AVAILABLE' && (
              <div className="border-t border-gray-200 pt-6">
                <div className="space-y-4">
                  <div className="flex items-center space-x-4">
                    <label className="text-sm font-medium text-gray-700">
                      Quantity:
                    </label>
                    <div className="flex items-center border border-gray-300 rounded-lg">
                      <button
                        onClick={() => updateQuantity(-1)}
                        className="p-2 hover:bg-gray-100 transition-colors"
                        disabled={quantity <= 1}
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="px-6 py-2 border-x border-gray-300 font-medium">
                        {quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(1)}
                        className="p-2 hover:bg-gray-100 transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <Button
                    onClick={addToCart}
                    disabled={addingToCart}
                    className="w-full"
                    size="lg"
                  >
                    <ShoppingCart className="w-5 h-5 mr-2" />
                    {addingToCart ? 'Adding...' : 'Add to Cart'}
                  </Button>

                  <Button
                    onClick={() => router.push(`/vendors/${product.vendor.id}`)}
                    variant="outline"
                    className="w-full"
                    size="lg"
                  >
                    View More from {product.vendor.businessName}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Additional Info */}
        <div className="border-t border-gray-200 bg-gray-50 px-8 py-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
            <div>
              <p className="text-gray-500">Created</p>
              <p className="font-medium text-gray-900">
                {new Date(product.createdAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
            </div>
            <div>
              <p className="text-gray-500">Last Updated</p>
              <p className="font-medium text-gray-900">
                {new Date(product.updatedAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
            </div>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}
