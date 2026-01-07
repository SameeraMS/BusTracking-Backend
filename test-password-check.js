#!/usr/bin/env node

/**
 * Test password verification for the test driver
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://chamikachamara2001:Chamika2001@cluster0.bcz4z.mongodb.net/bus-tracking?retryWrites=true&w=majority';

async function testPasswordVerification() {
  try {
    console.log('🔐 Testing Password Verification');
    console.log('===============================\n');

    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Load the Driver model
    const Driver = require('./models/Driver');

    // Find the test driver
    const testEmail = 'testlogin555@example.com';
    const driver = await Driver.findOne({ email: testEmail });

    if (!driver) {
      console.log('❌ Driver not found with email:', testEmail);
      return;
    }

    console.log('✅ Driver found:');
    console.log('  Name:', driver.name);
    console.log('  Email:', driver.email);
    console.log('  Password Hash:', driver.password);

    // Test different passwords
    const testPasswords = [
      'mypassword123',
      'password123', 
      'temp_password',
      '123456',
      'testpassword',
      'driver123',
      'Chamika2001' // Based on the MongoDB URI, this might be related
    ];

    console.log('\n🧪 Testing passwords:');
    
    for (const password of testPasswords) {
      try {
        const isMatch = await driver.comparePassword(password);
        console.log(`  ${password}: ${isMatch ? '✅ MATCH' : '❌ NO MATCH'}`);
        
        if (isMatch) {
          console.log(`\n🎉 CORRECT PASSWORD FOUND: ${password}`);
          break;
        }
      } catch (error) {
        console.log(`  ${password}: ❌ ERROR - ${error.message}`);
      }
    }

    // Also test manual bcrypt comparison
    console.log('\n🔍 Manual bcrypt verification:');
    for (const password of testPasswords) {
      try {
        const manualMatch = await bcrypt.compare(password, driver.password);
        console.log(`  ${password} (manual): ${manualMatch ? '✅ MATCH' : '❌ NO MATCH'}`);
        
        if (manualMatch) {
          console.log(`\n🎉 MANUAL VERIFICATION CONFIRMS: ${password}`);
          break;
        }
      } catch (error) {
        console.log(`  ${password} (manual): ❌ ERROR - ${error.message}`);
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

testPasswordVerification();