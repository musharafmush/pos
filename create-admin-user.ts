import { db } from './db/index.js';
import { users } from './shared/schema.js';
import bcrypt from 'bcryptjs';

console.log('🔧 Creating admin user for your POS system...');

try {
  // Create admin user
  const hashedPassword = await bcrypt.hash('admin123', 10);
  
  const adminUser = await db.insert(users).values({
    username: 'admin',
    password: hashedPassword,
    name: 'Administrator',
    email: 'admin@pos.local',
    role: 'admin',
    active: true
  }).returning();

  console.log('✅ Admin user created successfully!');
  console.log('🎯 Login credentials:');
  console.log('   Username: admin');
  console.log('   Password: admin123');
  console.log('💰 Your POS system is ready to use!');
  
} catch (error) {
  if (error.message?.includes('UNIQUE constraint failed')) {
    console.log('✅ Admin user already exists!');
    console.log('🎯 Use these credentials:');
    console.log('   Username: admin');
    console.log('   Password: admin123');
  } else {
    console.error('❌ Error creating admin user:', error);
  }
}

process.exit(0);