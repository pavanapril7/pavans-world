import { prisma } from '@/lib/prisma';
import { Prisma, ProductStatus } from '@prisma/client';

export interface CreateProductInput {
  vendorId: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  category: string;
  status?: ProductStatus;
}

export interface UpdateProductInput {
  name?: string;
  description?: string;
  price?: number;
  imageUrl?: string;
  category?: string;
  status?: ProductStatus;
}

export interface ProductFilters {
  status?: ProductStatus;
  category?: string;
  search?: string;
  minPrice?: number;
  maxPrice?: number;
}

export class ProductService {
  /**
   * Format price in INR with 2 decimal places
   */
  static formatPrice(price: number | Prisma.Decimal): string {
    const numPrice = typeof price === 'number' ? price : Number(price);
    return `₹${numPrice.toFixed(2)}`;
  }

  /**
   * Create a new product
   */
  static async createProduct(data: CreateProductInput) {
    // Verify vendor exists and is active
    const vendor = await prisma.vendor.findUnique({
      where: { id: data.vendorId },
    });

    if (!vendor) {
      throw new Error('Vendor not found');
    }

    if (vendor.status !== 'ACTIVE') {
      throw new Error('Vendor must be active to create products');
    }

    return prisma.product.create({
      data: {
        vendorId: data.vendorId,
        name: data.name,
        description: data.description,
        price: data.price,
        imageUrl: data.imageUrl,
        category: data.category,
        status: data.status || ProductStatus.AVAILABLE,
      },
      include: {
        vendor: {
          select: {
            id: true,
            businessName: true,
            status: true,
          },
        },
      },
    });
  }

  /**
   * Get product by ID
   */
  static async getProductById(id: string) {
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        vendor: {
          select: {
            id: true,
            businessName: true,
            status: true,
            category: true,
          },
        },
      },
    });

    if (!product) {
      throw new Error('Product not found');
    }

    return product;
  }

  /**
   * List products for a vendor with filters
   */
  static async listVendorProducts(
    vendorId: string,
    filters: ProductFilters = {},
    page = 1,
    limit = 20
  ) {
    // Verify vendor exists
    const vendor = await prisma.vendor.findUnique({
      where: { id: vendorId },
    });

    if (!vendor) {
      throw new Error('Vendor not found');
    }

    const where: Prisma.ProductWhereInput = {
      vendorId,
    };

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.category) {
      where.category = { contains: filters.category, mode: 'insensitive' };
    }

    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

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
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
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
   * Update product
   */
  static async updateProduct(id: string, vendorId: string, data: UpdateProductInput) {
    // Verify product exists and belongs to vendor
    const product = await prisma.product.findUnique({
      where: { id },
    });

    if (!product) {
      throw new Error('Product not found');
    }

    if (product.vendorId !== vendorId) {
      throw new Error('Product does not belong to this vendor');
    }

    return prisma.product.update({
      where: { id },
      data,
      include: {
        vendor: {
          select: {
            id: true,
            businessName: true,
            status: true,
          },
        },
      },
    });
  }

  /**
   * Update product availability
   */
  static async updateProductAvailability(
    id: string,
    vendorId: string,
    status: ProductStatus
  ) {
    // Verify product exists and belongs to vendor
    const product = await prisma.product.findUnique({
      where: { id },
    });

    if (!product) {
      throw new Error('Product not found');
    }

    if (product.vendorId !== vendorId) {
      throw new Error('Product does not belong to this vendor');
    }

    return prisma.product.update({
      where: { id },
      data: { status },
      include: {
        vendor: {
          select: {
            id: true,
            businessName: true,
            status: true,
          },
        },
      },
    });
  }

  /**
   * Delete product (soft delete by marking as DISCONTINUED)
   */
  static async deleteProduct(id: string, vendorId: string) {
    // Verify product exists and belongs to vendor
    const product = await prisma.product.findUnique({
      where: { id },
    });

    if (!product) {
      throw new Error('Product not found');
    }

    if (product.vendorId !== vendorId) {
      throw new Error('Product does not belong to this vendor');
    }

    // Soft delete by marking as DISCONTINUED
    return prisma.product.update({
      where: { id },
      data: { status: ProductStatus.DISCONTINUED },
      include: {
        vendor: {
          select: {
            id: true,
            businessName: true,
            status: true,
          },
        },
      },
    });
  }

  /**
   * Check if product is available for ordering
   */
  static async isProductAvailable(productId: string): Promise<boolean> {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        vendor: true,
      },
    });

    if (!product) {
      return false;
    }

    // Product must be AVAILABLE and vendor must be ACTIVE
    return (
      product.status === ProductStatus.AVAILABLE &&
      product.vendor.status === 'ACTIVE'
    );
  }
}
