import { PrismaClient, UserRole, DeliveryPartnerStatus } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import 'dotenv/config';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🚀 Creating delivery partner test user...');

  // First, check if we have any service areas
  const serviceAreas = await prisma.serviceArea.findMany({
    where: { status: 'ACTIVE' },
  });

  if (serviceAreas.length === 0) {
    console.log('⚠️  No service areas found. Creating a default service area...');
    const defaultServiceArea = await prisma.serviceArea.create({
      data: {
        name: 'Downtown Area',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincodes: ['400001', '400002', '400003', '400004', '400005'],
        status: 'ACTIVE',
      },
    });
    serviceAreas.push(defaultServiceArea);
    console.log('✅ Created default service area:', defaultServiceArea.name);
  }

  const serviceAreaId = serviceAreas[0].id;

  // Check if delivery partner user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email: 'delivery@test.com' },
  });

  if (existingUser) {
    console.log('⚠️  Delivery partner user already exists with email: delivery@test.com');
    console.log('User ID:', existingUser.id);
    
    // Check if delivery partner profile exists
    const existingPartner = await prisma.deliveryPartner.findUnique({
      where: { userId: existingUser.id },
    });

    if (existingPartner) {
      console.log('✅ Delivery partner profile already exists');
      console.log('Delivery Partner ID:', existingPartner.id);
    } else {
      console.log('Creating delivery partner profile for existing user...');
      const deliveryPartner = await prisma.deliveryPartner.create({
        data: {
          userId: existingUser.id,
          vehicleType: 'Motorcycle',
          vehicleNumber: 'MH-01-AB-1234',
          status: DeliveryPartnerStatus.AVAILABLE,
          serviceAreaId: serviceAreaId,
          totalDeliveries: 0,
          rating: 4.5,
        },
      });
      console.log('✅ Created delivery partner profile');
      console.log('Delivery Partner ID:', deliveryPartner.id);
    }

    return;
  }

  // Hash password
  const passwordHash = await bcrypt.hash('password123', 10);

  // Create user with DELIVERY_PARTNER role
  const user = await prisma.user.create({
    data: {
      email: 'delivery@test.com',
      phone: '+919876543210',
      passwordHash: passwordHash,
      role: UserRole.DELIVERY_PARTNER,
      status: 'ACTIVE',
      firstName: 'Raj',
      lastName: 'Kumar',
    },
  });

  console.log('✅ Created delivery partner user');
  console.log('Email:', user.email);
  console.log('Phone:', user.phone);
  console.log('Password: password123');
  console.log('User ID:', user.id);

  // Create delivery partner profile
  const deliveryPartner = await prisma.deliveryPartner.create({
    data: {
      userId: user.id,
      vehicleType: 'Motorcycle',
      vehicleNumber: 'MH-01-AB-1234',
      status: DeliveryPartnerStatus.AVAILABLE,
      serviceAreaId: serviceAreaId,
      totalDeliveries: 0,
      rating: 4.5,
    },
  });

  console.log('✅ Created delivery partner profile');
  console.log('Delivery Partner ID:', deliveryPartner.id);
  console.log('Vehicle Type:', deliveryPartner.vehicleType);
  console.log('Vehicle Number:', deliveryPartner.vehicleNumber);
  console.log('Service Area:', serviceAreas[0].name);

  console.log('\n🎉 Delivery partner test user created successfully!');
  console.log('\nLogin credentials:');
  console.log('Email: delivery@test.com');
  console.log('Password: password123');
  console.log('\nYou can now login at: http://localhost:3000/auth/login');
}

main()
  .catch((e) => {
    console.error('❌ Error creating delivery partner:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
