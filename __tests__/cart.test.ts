import { CartService } from '@/services/cart.service';
import { prisma } from '@/lib/prisma';
import { UserRole, UserStatus, VendorStatus, ProductStatus } from '@prisma/client';

describe('Cart Service', () => {
  let testCustomer: any;
  let testVendor: any;
  let testProduct: any;
  let testServiceArea: unknown;
  let testCategory: unknown;

  beforeAll(async () => {
    // Create test service area
    testServiceArea = await prisma.serviceArea.create({
      data: {
        name: 'Test Area',
        city: 'Test City',
        state: 'Test State',
        pincodes: ['560001'],
        status: 'ACTIVE',
      },
    });

    // Create test category
    testCategory = await prisma.vendorCategory.create({
      data: {
        name: 'Test Category Cart',
        description: 'Test category for cart tests',
        icon: 'test-icon',
      },
    });

    // Create test customer
    testCustomer = await prisma.user.create({
      data: {
        email: 'cart-customer@test.com',
        phone: '+919876543210',
        firstName: 'Cart',
        lastName: 'Customer',
        role: UserRole.CUSTOMER,
        status: UserStatus.ACTIVE,
      },
    });

    // Create test vendor user
    const vendorUser = await prisma.user.create({
      data: {
        email: 'cart-vendor@test.com',
        phone: '+919876543211',
        firstName: 'Cart',
        lastName: 'Vendor',
        role: UserRole.VENDOR,
        status: UserStatus.ACTIVE,
      },
    });

    // Create test vendor
    testVendor = await prisma.vendor.create({
      data: {
        userId: vendorUser.id,
        businessName: 'Test Cart Vendor',
        categoryId: testCategory.id,
        description: 'Test vendor for cart',
        serviceAreaId: testServiceArea.id,
        status: VendorStatus.ACTIVE,
      },
    });

    // Create test product
    testProduct = await prisma.product.create({
      data: {
        vendorId: testVendor.id,
        name: 'Test Cart Product',
        description: 'Test product for cart',
        price: 100.50,
        imageUrl: 'https://example.com/image.jpg',
        category: 'Test',
        status: ProductStatus.AVAILABLE,
      },
    });
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.cartItem.deleteMany({
      where: { cart: { customerId: testCustomer.id } },
    });
    await prisma.cart.deleteMany({
      where: { customerId: testCustomer.id },
    });
    await prisma.product.deleteMany({
      where: { vendorId: testVendor.id },
    });
    await prisma.vendor.deleteMany({
      where: { id: testVendor.id },
    });
    await prisma.user.deleteMany({
      where: {
        OR: [
          { id: testCustomer.id },
          { email: 'cart-vendor@test.com' },
        ],
      },
    });
    await prisma.vendorCategory.deleteMany({
      where: { id: testCategory.id },
    });
    await prisma.serviceArea.deleteMany({
      where: { id: testServiceArea.id },
    });
  });

  describe('addToCart', () => {
    beforeEach(async () => {
      // Clear cart before each test
      const existingCart = await CartService.getActiveCart(testCustomer.id);
      if (existingCart) {
        await CartService.clearCart(testCustomer.id, testVendor.id);
      }
    });

    it('should add item to cart successfully', async () => {
      const cart = await CartService.addToCart({
        customerId: testCustomer.id,
        productId: testProduct.id,
        quantity: 2,
      });

      expect(cart).toBeDefined();
      expect(cart?.items).toHaveLength(1);
      expect(cart?.items[0].quantity).toBe(2);
      expect(cart?.items[0].productId).toBe(testProduct.id);
    });

    it('should update quantity if item already exists', async () => {
      // Add item first time
      await CartService.addToCart({
        customerId: testCustomer.id,
        productId: testProduct.id,
        quantity: 1,
      });

      // Add same item again
      const cart = await CartService.addToCart({
        customerId: testCustomer.id,
        productId: testProduct.id,
        quantity: 2,
      });

      expect(cart).toBeDefined();
      expect(cart?.items).toHaveLength(1);
      expect(cart?.items[0].quantity).toBe(3); // 1 + 2
    });

    it('should throw error for invalid quantity', async () => {
      await expect(
        CartService.addToCart({
          customerId: testCustomer.id,
          productId: testProduct.id,
          quantity: 0,
        })
      ).rejects.toThrow('Quantity must be greater than 0');
    });

    it('should throw error for non-existent product', async () => {
      await expect(
        CartService.addToCart({
          customerId: testCustomer.id,
          productId: '00000000-0000-0000-0000-000000000000',
          quantity: 1,
        })
      ).rejects.toThrow('Product not found');
    });
  });

  describe('calculateCartTotal', () => {
    it('should calculate cart total correctly', async () => {
      // Clear cart first
      const existingCart = await CartService.getActiveCart(testCustomer.id);
      if (existingCart) {
        await CartService.clearCart(testCustomer.id, testVendor.id);
      }

      // Add item to cart
      const cart = await CartService.addToCart({
        customerId: testCustomer.id,
        productId: testProduct.id,
        quantity: 2,
      });

      expect(cart).toBeDefined();
      const total = CartService.calculateCartTotal(cart!);
      
      // 2 items * 100.50 = 201.00
      expect(total).toBe(201.00);
    });
  });

  describe('getActiveCart', () => {
    it('should return active cart', async () => {
      const cart = await CartService.getActiveCart(testCustomer.id);
      expect(cart).toBeDefined();
      expect(cart?.customerId).toBe(testCustomer.id);
    });

    it('should return null if no cart exists', async () => {
      // Create a new customer with no cart using a unique phone number
      const uniquePhone = `+9198765432${Date.now().toString().slice(-2)}`;
      const newCustomer = await prisma.user.create({
        data: {
          email: `nocart-${Date.now()}@test.com`,
          phone: uniquePhone,
          firstName: 'No',
          lastName: 'Cart',
          role: UserRole.CUSTOMER,
          status: UserStatus.ACTIVE,
        },
      });

      const cart = await CartService.getActiveCart(newCustomer.id);
      expect(cart).toBeNull();

      // Clean up
      await prisma.user.delete({ where: { id: newCustomer.id } });
    });
  });

  describe('removeCartItem', () => {
    it('should remove item from cart', async () => {
      // Clear cart first
      const existingCart = await CartService.getActiveCart(testCustomer.id);
      if (existingCart) {
        await CartService.clearCart(testCustomer.id, testVendor.id);
      }

      // Add item
      const cart = await CartService.addToCart({
        customerId: testCustomer.id,
        productId: testProduct.id,
        quantity: 1,
      });

      expect(cart?.items).toHaveLength(1);
      const itemId = cart!.items[0].id;

      // Remove item
      const updatedCart = await CartService.removeCartItem(
        testCustomer.id,
        itemId
      );

      // Cart should be deleted when empty
      expect(updatedCart).toBeNull();
    });
  });

  describe('validateCart', () => {
    it('should validate cart successfully', async () => {
      // Clear cart first
      const existingCart = await CartService.getActiveCart(testCustomer.id);
      if (existingCart) {
        await CartService.clearCart(testCustomer.id, testVendor.id);
      }

      // Add item
      const cart = await CartService.addToCart({
        customerId: testCustomer.id,
        productId: testProduct.id,
        quantity: 1,
      });

      const validation = await CartService.validateCart(cart!.id);
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });
  });
});
