import { PrismaClient, UserRole } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import 'dotenv/config';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🚀 Creating super admin test user...');

  // Check if admin user already exists by email
  const existingUserByEmail = await prisma.user.findUnique({
    where: { email: 'admin@test.com' },
  });

  if (existingUserByEmail) {
    console.log('⚠️  Super admin user already exists with email: admin@test.com');
    console.log('User ID:', existingUserByEmail.id);
    console.log('Role:', existingUserByEmail.role);
    
    // Update role to SUPER_ADMIN if it's not already
    if (existingUserByEmail.role !== UserRole.SUPER_ADMIN) {
      console.log('Updating user role to SUPER_ADMIN...');
      const updatedUser = await prisma.user.update({
        where: { id: existingUserByEmail.id },
        data: { role: UserRole.SUPER_ADMIN },
      });
      console.log('✅ Updated user role to:', updatedUser.role);
    }

    console.log('\nLogin credentials:');
    console.log('Email: admin@test.com');
    console.log('Password: admin123');
    return;
  }

  // Check if phone number is already in use
  const existingUserByPhone = await prisma.user.findUnique({
    where: { phone: '+919876543201' },
  });

  if (existingUserByPhone) {
    console.log('⚠️  Phone number +919876543201 is already in use');
    console.log('Please use a different phone number or delete the existing user');
    process.exit(1);
  }

  // Hash password
  const passwordHash = await bcrypt.hash('admin123', 10);

  // Create user with SUPER_ADMIN role
  const user = await prisma.user.create({
    data: {
      email: 'admin@test.com',
      phone: '+919876543201', // Unique phone number for admin
      passwordHash: passwordHash,
      role: UserRole.SUPER_ADMIN,
      status: 'ACTIVE',
      firstName: 'Admin',
      lastName: 'User',
    },
  });

  console.log('✅ Created super admin user');
  console.log('Email:', user.email);
  console.log('Phone:', user.phone);
  console.log('Password: admin123');
  console.log('User ID:', user.id);
  console.log('Role:', user.role);

  console.log('\n🎉 Super admin test user created successfully!');
  console.log('\n⚠️  IMPORTANT: Super admin has full access to:');
  console.log('  - User management (create, update, deactivate users)');
  console.log('  - Vendor management (approve, deactivate vendors)');
  console.log('  - Service area management');
  console.log('  - Vendor category management');
  console.log('  - Platform analytics');
  console.log('  - All orders across the platform');
  console.log('\nLogin credentials:');
  console.log('Email: admin@test.com');
  console.log('Password: admin123');
  console.log('\nYou can now login at: http://localhost:3000/auth/login');
  console.log('After login, access the admin dashboard at: http://localhost:3000/admin/dashboard');
}

main()
  .catch((e) => {
    console.error('❌ Error creating super admin:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
