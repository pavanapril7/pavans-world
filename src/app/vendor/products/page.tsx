'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  status: string;
  category: string;
  imageUrl: string;
  createdAt: string;
}

export default function VendorProductsPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [vendorId, setVendorId] = useState<string | null>(null);

  useEffect(() => {
    fetchVendorAndProducts();
  }, []);

  const fetchVendorAndProducts = async () => {
    try {
      // First get the current user's vendor profile
      const sessionRes = await fetch('/api/auth/session');
      if (!sessionRes.ok) {
        throw new Error('Not authenticated');
      }
      const sessionData = await sessionRes.json();
      
      // Get vendor profile
      const vendorRes = await fetch(`/api/users/${sessionData.user.id}`);
      if (!vendorRes.ok) {
        throw new Error('Failed to fetch vendor profile');
      }
      const userData = await vendorRes.json();
      
      if (!userData.data?.vendor) {
        throw new Error('No vendor profile found');
      }
      
      setVendorId(userData.data.vendor.id);
      
      // Fetch products
      const productsRes = await fetch(`/api/vendors/${userData.data.vendor.id}/products`);
      if (!productsRes.ok) {
        throw new Error('Failed to fetch products');
      }
      const productsData = await productsRes.json();
      setProducts(productsData.products || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (productId: string) => {
    if (!confirm('Are you sure you want to delete this product?')) {
      return;
    }

    try {
      const res = await fetch(`/api/vendors/${vendorId}/products/${productId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        throw new Error('Failed to delete product');
      }

      // Refresh products list
      await fetchVendorAndProducts();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete product');
    }
  };

  const toggleAvailability = async (productId: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'AVAILABLE' ? 'OUT_OF_STOCK' : 'AVAILABLE';
      const res = await fetch(`/api/vendors/${vendorId}/products/${productId}/availability`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) {
        throw new Error('Failed to update availability');
      }

      // Refresh products list
      await fetchVendorAndProducts();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update availability');
    }
  };

  if (loading) {
    return (
      <div className="px-4 py-6">
        <p className="text-gray-500">Loading products...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-4 py-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Product Catalog</h1>
        <Link
          href="/vendor/products/new"
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          Add Product
        </Link>
      </div>

      {products.length === 0 ? (
        <div className="bg-white shadow rounded-lg p-6 text-center">
          <p className="text-gray-500 mb-4">No products yet</p>
          <Link
            href="/vendor/products/new"
            className="text-blue-600 hover:text-blue-800"
          >
            Add your first product
          </Link>
        </div>
      ) : (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Product
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Price
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {products.map((product) => (
                <tr key={product.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <button
                        onClick={() => router.push(`/products/${product.id}`)}
                        className="flex-shrink-0 h-10 w-10"
                      >
                        {product.imageUrl ? (
                          <img
                            className="h-10 w-10 rounded object-cover hover:opacity-80 transition-opacity"
                            src={product.imageUrl}
                            alt={product.name}
                          />
                        ) : (
                          <div className="h-10 w-10 rounded bg-gray-200 flex items-center justify-center">
                            <span className="text-gray-400 text-xs">No img</span>
                          </div>
                        )}
                      </button>
                      <div className="ml-4">
                        <button
                          onClick={() => router.push(`/products/${product.id}`)}
                          className="text-sm font-medium text-gray-900 hover:text-blue-600 text-left"
                        >
                          {product.name}
                        </button>
                        <div className="text-sm text-gray-500">
                          {product.description.substring(0, 50)}
                          {product.description.length > 50 ? '...' : ''}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{product.category}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      ₹{Number(product.price).toFixed(2)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        product.status === 'AVAILABLE'
                          ? 'bg-green-100 text-green-800'
                          : product.status === 'OUT_OF_STOCK'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {product.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => toggleAvailability(product.id, product.status)}
                      className="text-blue-600 hover:text-blue-900 mr-4"
                    >
                      {product.status === 'AVAILABLE' ? 'Mark Unavailable' : 'Mark Available'}
                    </button>
                    <Link
                      href={`/vendor/products/${product.id}/edit`}
                      className="text-indigo-600 hover:text-indigo-900 mr-4"
                    >
                      Edit
                    </Link>
                    <button
                      onClick={() => handleDelete(product.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
