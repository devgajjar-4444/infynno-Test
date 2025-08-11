
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Import User model
const User = require('../models/User');

const createAdmin = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('✅ Connected to MongoDB');

    // Check if admin already exists
    const existingAdmin = await User.findOne({ role: 1 }); // ADMIN = 1
    if (existingAdmin) {
      console.log('⚠️ Admin user already exists');
      console.log(`Admin email: ${existingAdmin.email}`);
      process.exit(0);
    }

    // Admin credentials
    const adminData = {
      name: 'System Administrator',
      email: 'admin@infynno.com',
      password: process.env.ADMIN_PASSWORD || 'Admin@!123',
      role: 1, // ADMIN = 1
      isActive: true
    };

    // Create admin user
    const admin = new User(adminData);
    await admin.save();

    console.log('✅ Admin user created successfully');
    console.log(`Email: ${adminData.email}`);
    console.log(`Password: ${adminData.password}`);
    console.log('⚠️ Please change the password after first login');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating admin:', error.message);
    process.exit(1);
  }
};

// Run the script
createAdmin();
