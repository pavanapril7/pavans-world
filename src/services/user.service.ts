import { prisma } from '@/lib/prisma';
import { UserRole, UserStatus } from '@prisma/client';
import type { UpdateUserInput, CreateUserInput } from '@/schemas/user.schema';

export interface UserFilters {
  role?: UserRole;
  status?: UserStatus;
  search?: string;
  includeDeliveryPartner?: boolean;
}

export class UserService {
  /**
   * Get all users with optional filtering
   */
  static async getUsers(filters?: UserFilters) {
    const where: {
      role?: UserRole;
      status?: UserStatus;
      OR?: Array<{
        email?: { contains: string; mode: 'insensitive' };
        phone?: { contains: string };
        firstName?: { contains: string; mode: 'insensitive' };
        lastName?: { contains: string; mode: 'insensitive' };
      }>;
    } = {};

    if (filters?.role) {
      where.role = filters.role;
    }

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.search) {
      where.OR = [
        { email: { contains: filters.search, mode: 'insensitive' } },
        { phone: { contains: filters.search } },
        { firstName: { contains: filters.search, mode: 'insensitive' } },
        { lastName: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        phone: true,
        firstName: true,
        lastName: true,
        role: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        // Conditionally include delivery partner data
        deliveryPartner: filters?.includeDeliveryPartner ? {
          select: {
            id: true,
            vehicleType: true,
            vehicleNumber: true,
            status: true,
            rating: true,
          }
        } : false,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return users;
  }

  /**
   * Get a single user by ID
   */
  static async getUserById(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        phone: true,
        firstName: true,
        lastName: true,
        role: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        vendor: {
          include: {
            category: true,
            serviceArea: true,
            operatingHours: {
              orderBy: {
                dayOfWeek: 'asc',
              },
            },
          },
        },
        deliveryPartner: {
          include: {
            serviceArea: true,
          },
        },
      },
    });

    if (!user) {
      throw new Error('User not found');
    }

    return user;
  }

  /**
   * Create a new user (admin only)
   */
  static async createUser(data: CreateUserInput) {
    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: data.email },
          { phone: data.phone },
        ],
      },
    });

    if (existingUser) {
      throw new Error('User with this email or phone already exists');
    }

    // Use transaction to create user and role-specific records
    const user = await prisma.$transaction(async (tx) => {
      // Create user without password (can be set later or use OTP)
      const newUser = await tx.user.create({
        data: {
          email: data.email,
          phone: data.phone,
          firstName: data.firstName,
          lastName: data.lastName,
          role: data.role,
          status: UserStatus.ACTIVE,
        },
      });

      // Create role-specific records
      if (data.role === UserRole.DELIVERY_PARTNER) {
        await tx.deliveryPartner.create({
          data: {
            userId: newUser.id,
            status: 'OFFLINE', // Default status
          },
        });
      } else if (data.role === UserRole.VENDOR) {
        // Vendor record requires categoryId and serviceAreaId
        // These should be provided in the create user form for vendors
        // For now, we'll skip auto-creation and require manual setup
        // You can extend CreateUserInput schema to include these fields
      }

      return newUser;
    });

    // Return user with selected fields
    return {
      id: user.id,
      email: user.email,
      phone: user.phone,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      status: user.status,
      createdAt: user.createdAt,
    };
  }

  /**
   * Update user information
   */
  static async updateUser(userId: string, data: UpdateUserInput) {
    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!existingUser) {
      throw new Error('User not found');
    }

    // Check for email/phone conflicts if they're being updated
    if (data.email || data.phone) {
      const conflictUser = await prisma.user.findFirst({
        where: {
          AND: [
            { id: { not: userId } },
            {
              OR: [
                ...(data.email ? [{ email: data.email }] : []),
                ...(data.phone ? [{ phone: data.phone }] : []),
              ],
            },
          ],
        },
      });

      if (conflictUser) {
        throw new Error('User with this email or phone already exists');
      }
    }

    // Update user
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(data.email && { email: data.email }),
        ...(data.phone && { phone: data.phone }),
        ...(data.firstName && { firstName: data.firstName }),
        ...(data.lastName && { lastName: data.lastName }),
      },
      select: {
        id: true,
        email: true,
        phone: true,
        firstName: true,
        lastName: true,
        role: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return user;
  }

  /**
   * Deactivate a user
   */
  static async deactivateUser(userId: string) {
    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!existingUser) {
      throw new Error('User not found');
    }

    // Update user status to INACTIVE
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        status: UserStatus.INACTIVE,
      },
      select: {
        id: true,
        email: true,
        phone: true,
        firstName: true,
        lastName: true,
        role: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Invalidate all active sessions for this user
    await prisma.session.deleteMany({
      where: { userId },
    });

    return user;
  }
}
