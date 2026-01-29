import { prisma } from '@/lib/prisma';

export interface CreateCategoryInput {
  name: string;
  description: string;
  icon: string;
}

export interface UpdateCategoryInput {
  name?: string;
  description?: string;
  icon?: string;
}

export class CategoryService {
  /**
   * Create a new vendor category
   */
  static async createCategory(data: CreateCategoryInput) {
    // Check if category with same name already exists
    const existing = await prisma.vendorCategory.findUnique({
      where: { name: data.name },
    });

    if (existing) {
      throw new Error('Category with this name already exists');
    }

    return prisma.vendorCategory.create({
      data,
    });
  }

  /**
   * Get category by ID
   */
  static async getCategoryById(id: string) {
    const category = await prisma.vendorCategory.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            vendors: true,
          },
        },
      },
    });

    if (!category) {
      throw new Error('Category not found');
    }

    return category;
  }

  /**
   * List all categories
   */
  static async listCategories() {
    return prisma.vendorCategory.findMany({
      include: {
        _count: {
          select: {
            vendors: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });
  }

  /**
   * Update category
   */
  static async updateCategory(id: string, data: UpdateCategoryInput) {
    const category = await prisma.vendorCategory.findUnique({
      where: { id },
    });

    if (!category) {
      throw new Error('Category not found');
    }

    // If updating name, check for duplicates
    if (data.name && data.name !== category.name) {
      const existing = await prisma.vendorCategory.findUnique({
        where: { name: data.name },
      });

      if (existing) {
        throw new Error('Category with this name already exists');
      }
    }

    return prisma.vendorCategory.update({
      where: { id },
      data,
    });
  }

  /**
   * Delete category
   */
  static async deleteCategory(id: string) {
    const category = await prisma.vendorCategory.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            vendors: true,
          },
        },
      },
    });

    if (!category) {
      throw new Error('Category not found');
    }

    // Prevent deletion if category has vendors
    if (category._count.vendors > 0) {
      throw new Error('Cannot delete category with associated vendors');
    }

    return prisma.vendorCategory.delete({
      where: { id },
    });
  }
}
