import { PrismaClient, UserRole, DeliveryPartnerStatus } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import 'dotenv/config';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🚀 Creating all test users...\n');

  // Ensure we have a service area
  let serviceArea = await prisma.serviceArea.findFirst({
    where: { status: 'ACTIVE' },
  });

  if (!serviceArea) {
    console.log('⚠️  No service areas found. Creating default service area...');
    serviceArea = await prisma.serviceArea.create({
      data: {
        name: 'Downtown Area',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincodes: ['400001', '400002', '400003', '400004', '400005'],
        status: 'ACTIVE',
      },
    });
    console.log('✅ Created default service area:', serviceArea.name);
  }

  // Ensure we have a vendor category
  let category = await prisma.vendorCategory.findFirst();

  if (!category) {
    console.log('⚠️  No vendor categories found. Creating default category...');
    category = await prisma.vendorCategory.create({
      data: {
        name: 'Restaurant',
        description: 'Food and beverage establishments',
        icon: '🍽️',
      },
    });
    console.log('✅ Created default vendor category:', category.name);
  }

  const users = [
    {
      email: 'customer@test.com',
      phone: '+919876543200',
      password: 'password123',
      role: UserRole.CUSTOMER,
      firstName: 'Priya',
      lastName: 'Sharma',
      createProfile: async (userId: string) => {
        // Create addresses for customer
        await prisma.address.createMany({
          data: [
            {
              userId: userId,
              label: 'Home',
              street: '123 MG Road, Apartment 4B',
              landmark: 'Near City Mall',
              city: serviceArea!.city,
              state: serviceArea!.state,
              pincode: serviceArea!.pincodes[0],
              isDefault: true,
            },
            {
              userId: userId,
              label: 'Work',
              street: '456 Business Park, Tower A, Floor 5',
              landmark: 'Opposite Metro Station',
              city: serviceArea!.city,
              state: serviceArea!.state,
              pincode: serviceArea!.pincodes[1] || serviceArea!.pincodes[0],
              isDefault: false,
            },
          ],
        });
        console.log('  ✅ Created 2 addresses');
      },
    },
    {
      email: 'vendor@test.com',
      phone: '+919876543201',
      password: 'password123',
      role: UserRole.VENDOR,
      firstName: 'Rajesh',
      lastName: 'Kumar',
      createProfile: async (userId: string) => {
        // Create vendor profile
        const vendor = await prisma.vendor.create({
          data: {
            userId: userId,
            businessName: 'Spice Garden Restaurant',
            categoryId: category!.id,
            description: 'Authentic Indian cuisine with a modern twist',
            rating: 4.5,
            totalOrders: 0,
            status: 'ACTIVE',
            serviceAreaId: serviceArea!.id,
          },
        });
        console.log('  ✅ Created vendor profile:', vendor.businessName);

        // Create operating hours (Mon-Sun, 9 AM - 10 PM)
        const days = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];
        await prisma.operatingHours.createMany({
          data: days.map((day) => ({
            vendorId: vendor.id,
            dayOfWeek: day as any,
            openTime: '09:00',
            closeTime: '22:00',
            isClosed: false,
          })),
        });
        console.log('  ✅ Created operating hours');
      },
    },
    {
      email: 'delivery@test.com',
      phone: '+919876543210',
      password: 'password123',
      role: UserRole.DELIVERY_PARTNER,
      firstName: 'Raj',
      lastName: 'Kumar',
      createProfile: async (userId: string) => {
        // Create delivery partner profile
        const deliveryPartner = await prisma.deliveryPartner.create({
          data: {
            userId: userId,
            vehicleType: 'Motorcycle',
            vehicleNumber: 'MH-01-AB-1234',
            status: DeliveryPartnerStatus.AVAILABLE,
            serviceAreaId: serviceArea!.id,
            totalDeliveries: 0,
            rating: 4.5,
          },
        });
        console.log('  ✅ Created delivery partner profile');
        console.log('  Vehicle:', deliveryPartner.vehicleType, '-', deliveryPartner.vehicleNumber);
      },
    },
    {
      email: 'admin@test.com',
      phone: '+919876543298',
      password: 'admin123',
      role: UserRole.SUPER_ADMIN,
      firstName: 'Admin',
      lastName: 'User',
      createProfile: async (userId: string) => {
        console.log('  ✅ Super admin user (no additional profile needed)');
      },
    },
  ];

  for (const userData of users) {
    console.log(`\n📝 Processing ${userData.role}...`);

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: userData.email },
    });

    if (existingUser) {
      console.log(`  ⚠️  User already exists: ${userData.email}`);
      console.log(`  User ID: ${existingUser.id}`);
      
      // Update role if different
      if (existingUser.role !== userData.role) {
        await prisma.user.update({
          where: { id: existingUser.id },
          data: { role: userData.role },
        });
        console.log(`  ✅ Updated role to: ${userData.role}`);
      }
      
      continue;
    }

    // Hash password
    const passwordHash = await bcrypt.hash(userData.password, 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        email: userData.email,
        phone: userData.phone,
        passwordHash: passwordHash,
        role: userData.role,
        status: 'ACTIVE',
        firstName: userData.firstName,
        lastName: userData.lastName,
      },
    });

    console.log(`  ✅ Created user: ${user.email}`);
    console.log(`  User ID: ${user.id}`);

    // Create role-specific profile
    await userData.createProfile(user.id);
  }

  console.log('\n\n🎉 All test users created successfully!\n');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('LOGIN CREDENTIALS:');
  console.log('═══════════════════════════════════════════════════════════\n');
  
  console.log('👤 CUSTOMER:');
  console.log('   Email: customer@test.com');
  console.log('   Password: password123');
  console.log('   Dashboard: http://localhost:3000/vendors\n');
  
  console.log('🏪 VENDOR:');
  console.log('   Email: vendor@test.com');
  console.log('   Password: password123');
  console.log('   Dashboard: http://localhost:3000/vendor/dashboard\n');
  
  console.log('🚚 DELIVERY PARTNER:');
  console.log('   Email: delivery@test.com');
  console.log('   Password: password123');
  console.log('   Dashboard: http://localhost:3000/delivery/available\n');
  
  console.log('👑 SUPER ADMIN:');
  console.log('   Email: admin@test.com');
  console.log('   Password: admin123');
  console.log('   Note: Admin dashboard UI not yet implemented (Task 17)\n');
  
  console.log('═══════════════════════════════════════════════════════════');
  console.log('Login at: http://localhost:3000/auth/login');
  console.log('═══════════════════════════════════════════════════════════\n');
}

main()
  .catch((e) => {
    console.error('❌ Error creating test users:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
