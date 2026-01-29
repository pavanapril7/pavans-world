import { AuthService } from '@/services/auth.service';
import { prisma } from '@/lib/prisma';
import { UserRole, UserStatus } from '@prisma/client';

describe('Authentication Service', () => {
  // Clean up test data after each test
  afterEach(async () => {
    await prisma.session.deleteMany({});
    await prisma.oTP.deleteMany({});
    await prisma.user.deleteMany({
      where: {
        email: {
          contains: 'test-auth',
        },
      },
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('Password Hashing', () => {
    it('should hash a password', async () => {
      const password = 'testPassword123';
      const hash = await AuthService.hashPassword(password);
      
      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
      expect(hash.length).toBeGreaterThan(0);
    });

    it('should verify correct password', async () => {
      const password = 'testPassword123';
      const hash = await AuthService.hashPassword(password);
      const isValid = await AuthService.comparePassword(password, hash);
      
      expect(isValid).toBe(true);
    });

    it('should reject incorrect password', async () => {
      const password = 'testPassword123';
      const hash = await AuthService.hashPassword(password);
      const isValid = await AuthService.comparePassword('wrongPassword', hash);
      
      expect(isValid).toBe(false);
    });
  });

  describe('JWT Token', () => {
    it('should generate a valid JWT token', () => {
      const payload = {
        userId: '123',
        email: 'test@example.com',
        role: UserRole.CUSTOMER,
      };
      
      const token = AuthService.generateToken(payload);
      
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.').length).toBe(3); // JWT has 3 parts
    });

    it('should verify and decode a valid token', () => {
      const payload = {
        userId: '123',
        email: 'test@example.com',
        role: UserRole.CUSTOMER,
      };
      
      const token = AuthService.generateToken(payload);
      const decoded = AuthService.verifyToken(token);
      
      expect(decoded).toBeDefined();
      expect(decoded?.userId).toBe(payload.userId);
      expect(decoded?.email).toBe(payload.email);
      expect(decoded?.role).toBe(payload.role);
    });

    it('should return null for invalid token', () => {
      const decoded = AuthService.verifyToken('invalid-token');
      expect(decoded).toBeNull();
    });
  });

  describe('User Registration', () => {
    it('should register a new user', async () => {
      const userData = {
        email: 'test-auth-register@example.com',
        phone: '+919876543210',
        password: 'password123',
        firstName: 'Test',
        lastName: 'User',
        role: UserRole.CUSTOMER,
      };

      const user = await AuthService.register(userData);

      expect(user).toBeDefined();
      expect(user.email).toBe(userData.email);
      expect(user.phone).toBe(userData.phone);
      expect(user.firstName).toBe(userData.firstName);
      expect(user.lastName).toBe(userData.lastName);
      expect(user.role).toBe(userData.role);
      expect(user.status).toBe(UserStatus.ACTIVE);
    });

    it('should reject duplicate email', async () => {
      const userData = {
        email: 'test-auth-duplicate@example.com',
        phone: '+919876543211',
        password: 'password123',
        firstName: 'Test',
        lastName: 'User',
        role: UserRole.CUSTOMER,
      };

      await AuthService.register(userData);

      await expect(
        AuthService.register({
          ...userData,
          phone: '+919876543212', // Different phone
        })
      ).rejects.toThrow('User with this email or phone already exists');
    });

    it('should reject duplicate phone', async () => {
      const userData = {
        email: 'test-auth-phone1@example.com',
        phone: '+919876543213',
        password: 'password123',
        firstName: 'Test',
        lastName: 'User',
        role: UserRole.CUSTOMER,
      };

      await AuthService.register(userData);

      await expect(
        AuthService.register({
          ...userData,
          email: 'test-auth-phone2@example.com', // Different email
        })
      ).rejects.toThrow('User with this email or phone already exists');
    });
  });

  describe('Password Login', () => {
    it('should login with valid credentials', async () => {
      const userData = {
        email: 'test-auth-login@example.com',
        phone: '+919876543214',
        password: 'password123',
        firstName: 'Test',
        lastName: 'User',
        role: UserRole.CUSTOMER,
      };

      await AuthService.register(userData);

      const result = await AuthService.loginWithPassword({
        email: userData.email,
        password: userData.password,
      });

      expect(result).toBeDefined();
      expect(result.user.email).toBe(userData.email);
      expect(result.token).toBeDefined();
      expect(result.expiresAt).toBeDefined();
    });

    it('should reject invalid email', async () => {
      await expect(
        AuthService.loginWithPassword({
          email: 'nonexistent@example.com',
          password: 'password123',
        })
      ).rejects.toThrow('Invalid credentials');
    });

    it('should reject invalid password', async () => {
      const userData = {
        email: 'test-auth-wrongpass@example.com',
        phone: '+919876543215',
        password: 'password123',
        firstName: 'Test',
        lastName: 'User',
        role: UserRole.CUSTOMER,
      };

      await AuthService.register(userData);

      await expect(
        AuthService.loginWithPassword({
          email: userData.email,
          password: 'wrongpassword',
        })
      ).rejects.toThrow('Invalid credentials');
    });
  });

  describe('OTP Generation', () => {
    it('should generate a 6-digit OTP', () => {
      const otp = AuthService.generateOTPCode();
      
      expect(otp).toBeDefined();
      expect(otp.length).toBe(6);
      expect(/^\d{6}$/.test(otp)).toBe(true);
    });

    it('should request OTP for existing user', async () => {
      const userData = {
        email: 'test-auth-otp@example.com',
        phone: '+919876543216',
        password: 'password123',
        firstName: 'Test',
        lastName: 'User',
        role: UserRole.CUSTOMER,
      };

      await AuthService.register(userData);

      const result = await AuthService.requestOTP({
        phone: userData.phone,
      });

      expect(result).toBeDefined();
      expect(result.message).toBe('OTP sent successfully');
      expect(result.expiresAt).toBeDefined();
    });

    it('should reject OTP request for non-existent user', async () => {
      await expect(
        AuthService.requestOTP({
          phone: '+919999999999',
        })
      ).rejects.toThrow('User not found with this phone number');
    });
  });

  describe('OTP Verification', () => {
    it('should verify valid OTP and login', async () => {
      const userData = {
        email: 'test-auth-verify-otp@example.com',
        phone: '+919876543217',
        password: 'password123',
        firstName: 'Test',
        lastName: 'User',
        role: UserRole.CUSTOMER,
      };

      await AuthService.register(userData);
      const otpResult = await AuthService.requestOTP({
        phone: userData.phone,
      });

      // In development, the OTP code is returned
      const otpCode = (otpResult as any).code;

      const result = await AuthService.verifyOTP({
        phone: userData.phone,
        code: otpCode,
      });

      expect(result).toBeDefined();
      expect(result.user.email).toBe(userData.email);
      expect(result.token).toBeDefined();
      expect(result.expiresAt).toBeDefined();
    });

    it('should reject invalid OTP', async () => {
      const userData = {
        email: 'test-auth-invalid-otp@example.com',
        phone: '+919876543218',
        password: 'password123',
        firstName: 'Test',
        lastName: 'User',
        role: UserRole.CUSTOMER,
      };

      await AuthService.register(userData);
      await AuthService.requestOTP({
        phone: userData.phone,
      });

      await expect(
        AuthService.verifyOTP({
          phone: userData.phone,
          code: '000000', // Invalid OTP
        })
      ).rejects.toThrow('Invalid or expired OTP');
    });
  });

  describe('Session Management', () => {
    it('should create session on login', async () => {
      const userData = {
        email: 'test-auth-session@example.com',
        phone: '+919876543219',
        password: 'password123',
        firstName: 'Test',
        lastName: 'User',
        role: UserRole.CUSTOMER,
      };

      await AuthService.register(userData);
      const result = await AuthService.loginWithPassword({
        email: userData.email,
        password: userData.password,
      });

      const session = await AuthService.getSession(result.token);

      expect(session).toBeDefined();
      expect(session?.user.email).toBe(userData.email);
    });

    it('should validate active session', async () => {
      const userData = {
        email: 'test-auth-validate@example.com',
        phone: '+919876543220',
        password: 'password123',
        firstName: 'Test',
        lastName: 'User',
        role: UserRole.CUSTOMER,
      };

      await AuthService.register(userData);
      const result = await AuthService.loginWithPassword({
        email: userData.email,
        password: userData.password,
      });

      const user = await AuthService.validateSession(result.token);

      expect(user).toBeDefined();
      expect(user.email).toBe(userData.email);
    });

    it('should logout and invalidate session', async () => {
      const userData = {
        email: 'test-auth-logout@example.com',
        phone: '+919876543221',
        password: 'password123',
        firstName: 'Test',
        lastName: 'User',
        role: UserRole.CUSTOMER,
      };

      await AuthService.register(userData);
      const result = await AuthService.loginWithPassword({
        email: userData.email,
        password: userData.password,
      });

      await AuthService.logout(result.token);

      const session = await AuthService.getSession(result.token);
      expect(session).toBeNull();
    });
  });
});
