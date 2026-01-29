import { prisma } from '@/lib/prisma';
import { UserRole, UserStatus } from '@prisma/client';
import type { UpdateUserInput, CreateUserInput } from '@/schemas/user.schema';

export interface UserFilters {
  role?: UserRole;
  status?: UserStatus;
  search?: string;
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

    // Create user without password (can be set later or use OTP)
    const user = await prisma.user.create({
      data: {
        email: data.email,
        phone: data.phone,
        firstName: data.firstName,
        lastName: data.lastName,
        role: data.role,
        status: UserStatus.ACTIVE,
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
      },
    });

    return user;
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
