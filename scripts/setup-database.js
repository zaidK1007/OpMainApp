const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function setupDatabase() {
  try {
    console.log('🔄 Setting up database...');
    
    // Test database connection
    await prisma.$connect();
    console.log('✅ Database connected successfully');
    
    // Run Prisma migrations
    console.log('🔄 Running database migrations...');
    const { execSync } = require('child_process');
    
    try {
      execSync('npx prisma migrate deploy', { 
        stdio: 'inherit',
        cwd: './machine-maintenance-backend'
      });
      console.log('✅ Database migrations completed');
    } catch (error) {
      console.log('⚠️ Migration failed, trying to generate client...');
      execSync('npx prisma generate', { 
        stdio: 'inherit',
        cwd: './machine-maintenance-backend'
      });
      console.log('✅ Prisma client generated');
    }
    
    // Check if we need to seed the database
    const userCount = await prisma.user.count();
    console.log(`📊 Current user count: ${userCount}`);
    
    if (userCount === 0) {
      console.log('🌱 Database is empty, ready for first-time setup');
    } else {
      console.log('✅ Database already has data');
    }
    
    console.log('🎉 Database setup completed successfully!');
    
  } catch (error) {
    console.error('❌ Database setup failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run setup if this script is executed directly
if (require.main === module) {
  setupDatabase()
    .then(() => {
      console.log('✅ Setup completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Setup failed:', error);
      process.exit(1);
    });
}

module.exports = setupDatabase;
