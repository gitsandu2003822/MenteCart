#!/usr/bin/env node
/**
 * Script to promote a user to admin role
 * Usage: node promote-to-admin.js <email>
 */

const mongoose = require('mongoose');
require('dotenv').config();

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ["admin", "user"], default: "user" }
}, { timestamps: true });

const User = mongoose.model('User', userSchema);

async function promoteToAdmin(email) {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/mentecart';
    console.log('Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    const user = await User.findOne({ email });
    if (!user) {
      console.error(`User not found: ${email}`);
      process.exit(1);
    }

    console.log(`Found user: ${user.email} (current role: ${user.role})`);

    user.role = 'admin';
    await user.save();

    console.log(`✓ User ${email} promoted to admin role`);
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

const email = process.argv[2];
if (!email) {
  console.error('Usage: node promote-to-admin.js <email>');
  console.error('Example: node promote-to-admin.js admin@test.com');
  process.exit(1);
}

promoteToAdmin(email);
