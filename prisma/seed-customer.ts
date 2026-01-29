import { PrismaClient, UserRole } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import 'dotenv/config';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🚀 Creating customer test user...');

  // Check if customer user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email: 'customer@test.com' },
  });

  if (existingUser) {
    console.log('⚠️  Customer user already exists with email: customer@test.com');
    console.log('User ID:', existingUser.id);
    
    // Check if they have addresses
    const addresses = await prisma.address.findMany({
      where: { userId: existingUser.id },
    });

    if (addresses.length > 0) {
      console.log(`✅ Customer has ${addresses.length} address(es)`);
    } else {
      console.log('Creating default address for existing customer...');
      await createDefaultAddress(existingUser.id);
    }

    return;
  }

  // Hash password
  const passwordHash = await bcrypt.hash('password123', 10);

  // Create user with CUSTOMER role
  const user = await prisma.user.create({
    data: {
      email: 'customer@test.com',
      phone: '+919876543200',
      passwordHash: passwordHash,
      role: UserRole.CUSTOMER,
      status: 'ACTIVE',
      firstName: 'Priya',
      lastName: 'Sharma',
    },
  });

  console.log('✅ Created customer user');
  console.log('Email:', user.email);
  console.log('Phone:', user.phone);
  console.log('Password: password123');
  console.log('User ID:', user.id);

  // Create default addresses
  await createDefaultAddress(user.id);

  console.log('\n🎉 Customer test user created successfully!');
  console.log('\nLogin credentials:');
  console.log('Email: customer@test.com');
  console.log('Password: password123');
  console.log('\nYou can now login at: http://localhost:3000/auth/login');
}

async function createDefaultAddress(userId: string) {
  // Get first active service area to use valid pincodes
  const serviceArea = await prisma.serviceArea.findFirst({
    where: { status: 'ACTIVE' },
  });

  const pincode = serviceArea?.pincodes[0] || '400001';
  const city = serviceArea?.city || 'Mumbai';
  const state = serviceArea?.state || 'Maharashtra';

  // Create home address
  const homeAddress = await prisma.address.create({
    data: {
      userId: userId,
      label: 'Home',
      street: '123 MG Road, Apartment 4B',
      landmark: 'Near City Mall',
      city: city,
      state: state,
      pincode: pincode,
      isDefault: true,
    },
  });

  console.log('✅ Created default home address');
  console.log('Address:', `${homeAddress.street}, ${homeAddress.city} - ${homeAddress.pincode}`);

  // Create work address
  const workAddress = await prisma.address.create({
    data: {
      userId: userId,
      label: 'Work',
      street: '456 Business Park, Tower A, Floor 5',
      landmark: 'Opposite Metro Station',
      city: city,
      state: state,
      pincode: serviceArea?.pincodes[1] || pincode,
      isDefault: false,
    },
  });

  console.log('✅ Created work address');
  console.log('Address:', `${workAddress.street}, ${workAddress.city} - ${workAddress.pincode}`);
}

main()
  .catch((e) => {
    console.error('❌ Error creating customer:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
