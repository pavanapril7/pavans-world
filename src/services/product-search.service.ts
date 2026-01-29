import { prisma } from '@/lib/prisma';
import { Prisma, ProductStatus } from '@prisma/client';

export interface ProductSearchFilters {
  vendorId?: string;
  status?: ProductStatus;
  category?: string;
  search?: string;
  minPrice?: number;
  maxPrice?: number;
}

export class ProductSearchService {
  /**
   * Search products with advanced filtering
   */
  static async searchProducts(
    filters: ProductSearchFilters = {},
    page = 1,
    limit = 20
  ) {
    const where: Prisma.ProductWhereInput = {};

    // Filter by vendor
    if (filters.vendorId) {
      where.vendorId = filters.vendorId;
    }

    // Filter by status
    if (filters.status) {
      where.status = filters.status;
    }

    // Filter by category
    if (filters.category) {
      where.category = { contains: filters.category, mode: 'insensitive' };
    }

    // Search in name and description
    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
        { category: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    // Price range filter
    if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
      where.price = {};
      if (filters.minPrice !== undefined) {
        where.price.gte = filters.minPrice;
      }
      if (filters.maxPrice !== undefined) {
        where.price.lte = filters.maxPrice;
      }
    }

    const skip = (page - 1) * limit;

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip,
        take: limit,
        include: {
          vendor: {
            select: {
              id: true,
              businessName: true,
              status: true,
              category: true,
              serviceArea: {
                select: {
                  id: true,
                  name: true,
                  status: true,
                },
              },
            },
          },
        },
        orderBy: [
          { status: 'asc' }, // Available products first
          { createdAt: 'desc' },
        ],
      }),
      prisma.product.count({ where }),
    ]);

    return {
      products,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Search products within a specific vendor
   */
  static async searchVendorProducts(
    vendorId: string,
    searchQuery: string,
    page = 1,
    limit = 20
  ) {
    return this.searchProducts(
      {
        vendorId,
        search: searchQuery,
        status: ProductStatus.AVAILABLE, // Only show available products in search
      },
      page,
      limit
    );
  }

  /**
   * Get products by category
   */
  static async getProductsByCategory(
    category: string,
    page = 1,
    limit = 20
  ) {
    return this.searchProducts(
      {
        category,
        status: ProductStatus.AVAILABLE,
      },
      page,
      limit
    );
  }

  /**
   * Get available products for a vendor
   */
  static async getAvailableVendorProducts(
    vendorId: string,
    page = 1,
    limit = 20
  ) {
    return this.searchProducts(
      {
        vendorId,
        status: ProductStatus.AVAILABLE,
      },
      page,
      limit
    );
  }

  /**
   * Get products in a price range
   */
  static async getProductsByPriceRange(
    minPrice: number,
    maxPrice: number,
    page = 1,
    limit = 20
  ) {
    return this.searchProducts(
      {
        minPrice,
        maxPrice,
        status: ProductStatus.AVAILABLE,
      },
      page,
      limit
    );
  }
}
