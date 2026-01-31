import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '@/lib/prisma';
import { UserRole, UserStatus, OTPStatus } from '@prisma/client';
import type { RegisterInput, LoginInput, RequestOTPInput, VerifyOTPInput } from '@/schemas/auth.schema';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = '24h';
const OTP_EXPIRY_MINUTES = 10;
const SALT_ROUNDS = 10;

export interface SessionPayload {
  userId: string;
  email: string;
  role: UserRole;
}

export class AuthService {
  /**
   * Hash a password using bcrypt
   */
  static async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, SALT_ROUNDS);
  }

  /**
   * Compare a plain text password with a hashed password
   */
  static async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  /**
   * Generate a JWT token for a user
   */
  static generateToken(payload: SessionPayload): string {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  }

  /**
   * Verify and decode a JWT token
   */
  static verifyToken(token: string): SessionPayload | null {
    try {
      return jwt.verify(token, JWT_SECRET) as SessionPayload;
    } catch {
      return null;
    }
  }

  /**
   * Register a new user
   */
  static async register(data: RegisterInput) {
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

    // Hash password
    const passwordHash = await this.hashPassword(data.password);

    // Create user
    const user = await prisma.user.create({
      data: {
        email: data.email,
        phone: data.phone,
        passwordHash,
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
   * Login with email and password
   */
  static async loginWithPassword(data: LoginInput) {
    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (!user || !user.passwordHash) {
      throw new Error('Invalid credentials');
    }

    // Check if user is active
    if (user.status !== UserStatus.ACTIVE) {
      throw new Error('Account is not active');
    }

    // Verify password
    const isValidPassword = await this.comparePassword(data.password, user.passwordHash);
    if (!isValidPassword) {
      throw new Error('Invalid credentials');
    }

    // Generate token
    const token = this.generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    // Create session
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    const session = await prisma.session.create({
      data: {
        userId: user.id,
        token,
        expiresAt,
      },
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        status: user.status,
      },
      token: session.token,
      expiresAt: session.expiresAt,
    };
  }

  /**
   * Generate a 6-digit OTP
   */
  static generateOTPCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Request OTP for phone number
   */
  static async requestOTP(data: RequestOTPInput) {
    // Find user by phone
    const user = await prisma.user.findUnique({
      where: { phone: data.phone },
    });

    if (!user) {
      throw new Error('User not found with this phone number');
    }

    // Check if user is active
    if (user.status !== UserStatus.ACTIVE) {
      throw new Error('Account is not active');
    }

    // Invalidate any existing pending OTPs for this user
    await prisma.oTP.updateMany({
      where: {
        userId: user.id,
        status: OTPStatus.PENDING,
      },
      data: {
        status: OTPStatus.INVALIDATED,
      },
    });

    // Generate OTP
    const code = this.generateOTPCode();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + OTP_EXPIRY_MINUTES);

    // Create OTP record
    const otp = await prisma.oTP.create({
      data: {
        userId: user.id,
        phone: data.phone,
        code,
        status: OTPStatus.PENDING,
        expiresAt,
      },
    });

    // TODO: Send OTP via SMS gateway (Twilio, etc.)
    // For now, we'll just return the OTP (in production, this should be sent via SMS)
    console.log(`OTP for ${data.phone}: ${code}`);

    return {
      message: 'OTP sent successfully',
      expiresAt: otp.expiresAt,
      // Remove this in production - only for development
      ...(process.env.NODE_ENV === 'development' && { code }),
    };
  }

  /**
   * Verify OTP and login
   */
  static async verifyOTP(data: VerifyOTPInput) {
    // Find user by phone
    const user = await prisma.user.findUnique({
      where: { phone: data.phone },
    });

    if (!user) {
      throw new Error('User not found with this phone number');
    }

    // Check if user is active
    if (user.status !== UserStatus.ACTIVE) {
      throw new Error('Account is not active');
    }

    // Find valid OTP
    const otp = await prisma.oTP.findFirst({
      where: {
        userId: user.id,
        phone: data.phone,
        code: data.code,
        status: OTPStatus.PENDING,
        expiresAt: {
          gt: new Date(),
        },
      },
    });

    if (!otp) {
      throw new Error('Invalid or expired OTP');
    }

    // Mark OTP as verified
    await prisma.oTP.update({
      where: { id: otp.id },
      data: { status: OTPStatus.VERIFIED },
    });

    // Generate token
    const token = this.generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    // Create session
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    const session = await prisma.session.create({
      data: {
        userId: user.id,
        token,
        expiresAt,
      },
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        status: user.status,
      },
      token: session.token,
      expiresAt: session.expiresAt,
    };
  }

  /**
   * Logout user by invalidating session
   */
  static async logout(token: string) {
    // Delete session
    await prisma.session.delete({
      where: { token },
    });

    return { message: 'Logged out successfully' };
  }

  /**
   * Get session by token
   */
  static async getSession(token: string) {
    const session = await prisma.session.findUnique({
      where: { token },
      include: {
        user: {
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
        },
      },
    });

    if (!session) {
      return null;
    }

    // Check if session is expired
    if (session.expiresAt < new Date()) {
      // Delete expired session
      await prisma.session.delete({
        where: { token },
      });
      return null;
    }

    return session;
  }

  /**
   * Validate session token and return user
   */
  static async validateSession(token: string) {
    const session = await this.getSession(token);
    
    if (!session) {
      throw new Error('Invalid or expired session');
    }

    if (session.user.status !== UserStatus.ACTIVE) {
      throw new Error('Account is not active');
    }

    return session.user;
  }
}
