import { prisma } from '@/lib/prisma';
import type { CreateAddressInput, UpdateAddressInput } from '@/schemas/user.schema';

export class AddressService {
  /**
   * Get all addresses for a user
   */
  static async getUserAddresses(userId: string) {
    const addresses = await prisma.address.findMany({
      where: { userId },
      orderBy: [
        { isDefault: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    return addresses;
  }

  /**
   * Get a single address by ID
   */
  static async getAddressById(addressId: string, userId: string) {
    const address = await prisma.address.findFirst({
      where: {
        id: addressId,
        userId,
      },
    });

    if (!address) {
      throw new Error('Address not found');
    }

    return address;
  }

  /**
   * Create a new address for a user
   */
  static async createAddress(userId: string, data: CreateAddressInput) {
    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    // If this is set as default, unset other default addresses
    if (data.isDefault) {
      await prisma.address.updateMany({
        where: {
          userId,
          isDefault: true,
        },
        data: {
          isDefault: false,
        },
      });
    }

    // If this is the first address, make it default
    const existingAddressCount = await prisma.address.count({
      where: { userId },
    });

    const isDefault = data.isDefault || existingAddressCount === 0;

    // Create address
    const address = await prisma.address.create({
      data: {
        userId,
        label: data.label,
        street: data.street,
        landmark: data.landmark || '',
        city: data.city,
        state: data.state,
        pincode: data.pincode,
        isDefault,
      },
    });

    return address;
  }

  /**
   * Update an address
   */
  static async updateAddress(addressId: string, userId: string, data: UpdateAddressInput) {
    // Check if address exists and belongs to user
    const existingAddress = await prisma.address.findFirst({
      where: {
        id: addressId,
        userId,
      },
    });

    if (!existingAddress) {
      throw new Error('Address not found');
    }

    // If setting as default, unset other default addresses
    if (data.isDefault) {
      await prisma.address.updateMany({
        where: {
          userId,
          isDefault: true,
          id: { not: addressId },
        },
        data: {
          isDefault: false,
        },
      });
    }

    // Update address
    const address = await prisma.address.update({
      where: { id: addressId },
      data: {
        ...(data.label && { label: data.label }),
        ...(data.street && { street: data.street }),
        ...(data.landmark !== undefined && { landmark: data.landmark }),
        ...(data.city && { city: data.city }),
        ...(data.state && { state: data.state }),
        ...(data.pincode && { pincode: data.pincode }),
        ...(data.isDefault !== undefined && { isDefault: data.isDefault }),
      },
    });

    return address;
  }

  /**
   * Delete an address
   */
  static async deleteAddress(addressId: string, userId: string) {
    // Check if address exists and belongs to user
    const existingAddress = await prisma.address.findFirst({
      where: {
        id: addressId,
        userId,
      },
    });

    if (!existingAddress) {
      throw new Error('Address not found');
    }

    // Delete address
    await prisma.address.delete({
      where: { id: addressId },
    });

    // If this was the default address, set another address as default
    if (existingAddress.isDefault) {
      const nextAddress = await prisma.address.findFirst({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      });

      if (nextAddress) {
        await prisma.address.update({
          where: { id: nextAddress.id },
          data: { isDefault: true },
        });
      }
    }

    return { message: 'Address deleted successfully' };
  }
}
