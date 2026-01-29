import { UserSchema, ProductSchema, type User, type Product } from '@/schemas/user.schema';

describe('Zod Schema Setup', () => {
  describe('UserSchema', () => {
    it('should accept valid user with all fields', () => {
      const validUser = {
        email: 'test@example.com',
        phone: '+919876543210',
        firstName: 'John',
        lastName: 'Doe',
        role: 'CUSTOMER' as const,
        passwordHash: 'hashedpassword123',
      };

      const result = UserSchema.safeParse(validUser);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.email).toBe(validUser.email);
        expect(result.data.firstName).toBe(validUser.firstName);
        expect(result.data.lastName).toBe(validUser.lastName);
      }
    });

    it('should accept valid user without optional passwordHash field', () => {
      const validUser = {
        email: 'test@example.com',
        phone: '+919876543210',
        firstName: 'Jane',
        lastName: 'Smith',
        role: 'VENDOR' as const,
      };

      const result = UserSchema.safeParse(validUser);
      expect(result.success).toBe(true);
    });

    it('should reject user with invalid email', () => {
      const invalidUser = {
        email: 'not-an-email',
        phone: '+919876543210',
        firstName: 'John',
        lastName: 'Doe',
        role: 'CUSTOMER' as const,
      };

      const result = UserSchema.safeParse(invalidUser);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some(issue => issue.path.includes('email'))).toBe(true);
      }
    });

    it('should reject user with firstName too short', () => {
      const invalidUser = {
        email: 'test@example.com',
        phone: '+919876543210',
        firstName: 'J',
        lastName: 'Doe',
        role: 'CUSTOMER' as const,
      };

      const result = UserSchema.safeParse(invalidUser);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some(issue => issue.path.includes('firstName'))).toBe(true);
      }
    });

    it('should reject user with phone too short', () => {
      const invalidUser = {
        email: 'test@example.com',
        phone: '123',
        firstName: 'John',
        lastName: 'Doe',
        role: 'CUSTOMER' as const,
      };

      const result = UserSchema.safeParse(invalidUser);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some(issue => issue.path.includes('phone'))).toBe(true);
      }
    });

    it('should reject user with invalid role', () => {
      const invalidUser = {
        email: 'test@example.com',
        phone: '+919876543210',
        firstName: 'John',
        lastName: 'Doe',
        role: 'INVALID_ROLE',
      };

      const result = UserSchema.safeParse(invalidUser);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some(issue => issue.path.includes('role'))).toBe(true);
      }
    });

    it('should reject user with lastName too short', () => {
      const invalidUser = {
        email: 'test@example.com',
        phone: '+919876543210',
        firstName: 'John',
        lastName: 'D',
        role: 'CUSTOMER' as const,
      };

      const result = UserSchema.safeParse(invalidUser);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some(issue => issue.path.includes('lastName'))).toBe(true);
      }
    });
  });

  describe('ProductSchema', () => {
    it('should accept valid product with all fields', () => {
      const validProduct = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Test Product',
        price: 99.99,
        quantity: 10,
        tags: ['electronics', 'gadget'],
      };

      const result = ProductSchema.safeParse(validProduct);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validProduct);
      }
    });

    it('should reject product with invalid UUID', () => {
      const invalidProduct = {
        id: 'not-a-uuid',
        name: 'Test Product',
        price: 99.99,
        quantity: 10,
        tags: ['electronics'],
      };

      const result = ProductSchema.safeParse(invalidProduct);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some(issue => issue.path.includes('id'))).toBe(true);
      }
    });

    it('should reject product with zero price', () => {
      const invalidProduct = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Test Product',
        price: 0,
        quantity: 10,
        tags: ['electronics'],
      };

      const result = ProductSchema.safeParse(invalidProduct);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some(issue => issue.path.includes('price'))).toBe(true);
      }
    });

    it('should reject product with negative quantity', () => {
      const invalidProduct = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Test Product',
        price: 99.99,
        quantity: -5,
        tags: ['electronics'],
      };

      const result = ProductSchema.safeParse(invalidProduct);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some(issue => issue.path.includes('quantity'))).toBe(true);
      }
    });

    it('should reject product with empty tags array', () => {
      const invalidProduct = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Test Product',
        price: 99.99,
        quantity: 10,
        tags: [],
      };

      const result = ProductSchema.safeParse(invalidProduct);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some(issue => issue.path.includes('tags'))).toBe(true);
      }
    });

    it('should reject product with too many tags', () => {
      const invalidProduct = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Test Product',
        price: 99.99,
        quantity: 10,
        tags: Array(15).fill('tag'), // 15 tags, max is 10
      };

      const result = ProductSchema.safeParse(invalidProduct);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some(issue => issue.path.includes('tags'))).toBe(true);
      }
    });
  });

  describe('TypeScript Type Inference', () => {
    it('should infer correct User type from UserSchema', () => {
      const user: User = {
        email: 'test@example.com',
        phone: '+919876543210',
        firstName: 'John',
        lastName: 'Doe',
        role: 'CUSTOMER',
      };

      // This test passes if TypeScript compilation succeeds
      expect(user.email).toBeDefined();
      expect(user.firstName).toBeDefined();
      expect(user.lastName).toBeDefined();
      expect(user.phone).toBeDefined();
      expect(user.role).toBeDefined();
    });

    it('should infer correct Product type from ProductSchema', () => {
      const product: Product = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Test Product',
        price: 99.99,
        quantity: 10,
        tags: ['electronics'],
      };

      // This test passes if TypeScript compilation succeeds
      expect(product.id).toBeDefined();
      expect(product.name).toBeDefined();
      expect(product.price).toBeDefined();
      expect(product.quantity).toBeDefined();
      expect(product.tags).toBeDefined();
    });

    it('should allow User type to be used with validated data', () => {
      const validUser = {
        email: 'test@example.com',
        phone: '+919876543210',
        firstName: 'John',
        lastName: 'Doe',
        role: 'CUSTOMER' as const,
      };

      const result = UserSchema.safeParse(validUser);
      if (result.success) {
        const user: User = result.data;
        expect(user.email).toBe('test@example.com');
        expect(user.firstName).toBe('John');
        expect(user.lastName).toBe('Doe');
      }
    });

    it('should allow Product type to be used with validated data', () => {
      const validProduct = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Test Product',
        price: 99.99,
        quantity: 10,
        tags: ['electronics'],
      };

      const result = ProductSchema.safeParse(validProduct);
      if (result.success) {
        const product: Product = result.data;
        expect(product.id).toBe('123e4567-e89b-12d3-a456-426614174000');
        expect(product.name).toBe('Test Product');
        expect(product.price).toBe(99.99);
        expect(product.quantity).toBe(10);
        expect(product.tags).toEqual(['electronics']);
      }
    });
  });
});
