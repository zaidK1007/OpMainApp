const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  // Create default admin user
  const hashedPassword = await bcrypt.hash('admin123', 10);
  
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      name: 'Admin User',
      email: 'admin@example.com',
      password: hashedPassword,
      role: 'admin',
    },
  });

  console.log('✅ Created admin user:', {
    email: adminUser.email,
    role: adminUser.role,
    password: 'admin123', // This is just for display
  });

  // Create default engineer user
  const hashedPasswordEngineer = await bcrypt.hash('engineer123', 10);
  
  const engineerUser = await prisma.user.upsert({
    where: { email: 'engineer@example.com' },
    update: {},
    create: {
      name: 'Engineer User',
      email: 'engineer@example.com',
      password: hashedPasswordEngineer,
      role: 'engineer',
    },
  });

  console.log('✅ Created engineer user:', {
    email: engineerUser.email,
    role: engineerUser.role,
    password: 'engineer123', // This is just for display
  });

  console.log('\n🎉 Seed completed successfully!');
  console.log('\n📝 Default credentials:');
  console.log('Admin: admin@example.com / admin123');
  console.log('Engineer: engineer@example.com / engineer123');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

