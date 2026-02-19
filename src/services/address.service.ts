import { prisma } from '@/lib/prisma';
import type { CreateAddressInput, UpdateAddressInput } from '@/schemas/user.schema';
import type { AddressWithCoordinates, UpdateAddressWithCoordinates } from '@/schemas/geolocation.schema';
import { GeoLocationService } from './geolocation.service';

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
   * Supports both CreateAddressInput and AddressWithCoordinates
   */
  static async createAddress(userId: string, data: CreateAddressInput | AddressWithCoordinates) {
    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Validate coordinates if provided
    if ('latitude' in data && 'longitude' in data && data.latitude !== undefined && data.longitude !== undefined) {
      if (!GeoLocationService.validateCoordinates(data.latitude, data.longitude)) {
        throw new Error('Invalid coordinates provided');
      }
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

    // Create address with optional coordinates
    const address = await prisma.address.create({
      data: {
        userId,
        label: data.label,
        street: data.street,
        landmark: data.landmark || '',
        city: data.city,
        state: data.state,
        pincode: data.pincode,
        latitude: 'latitude' in data ? data.latitude : undefined,
        longitude: 'longitude' in data ? data.longitude : undefined,
        isDefault,
      },
    });

    return address;
  }

  /**
   * Update an address
   * Supports both UpdateAddressInput and UpdateAddressWithCoordinates
   */
  static async updateAddress(addressId: string, userId: string, data: UpdateAddressInput | UpdateAddressWithCoordinates) {
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

    // Validate coordinates if provided
    if ('latitude' in data && 'longitude' in data && data.latitude !== undefined && data.longitude !== undefined) {
      if (!GeoLocationService.validateCoordinates(data.latitude, data.longitude)) {
        throw new Error('Invalid coordinates provided');
      }

      // Validate coordinate-address consistency (within 10km)
      // If address already has coordinates, check distance
      if (existingAddress.latitude && existingAddress.longitude) {
        const distance = await GeoLocationService.calculateDistance(
          existingAddress.latitude,
          existingAddress.longitude,
          data.latitude,
          data.longitude
        );

        if (distance > 10) {
          throw new Error('Coordinates do not match address location (distance exceeds 10km)');
        }
      }
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
        ...('latitude' in data && data.latitude !== undefined && { latitude: data.latitude }),
        ...('longitude' in data && data.longitude !== undefined && { longitude: data.longitude }),
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
