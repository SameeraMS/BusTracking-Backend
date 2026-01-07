#!/usr/bin/env node

/**
 * Test password verification for the driver
 */

const bcrypt = require('bcryptjs');

// The hashed password from the database
const hashedPassword = '$2a$10$PYWr9mTBr2DL8mnxonM0D.p1zg0Q1UBkKo6uriojZwcm3qc4CoYuC';

// Test different passwords
const testPasswords = [
  'mypassword123',
  'password123',
  'testpassword',
  'test123',
  'driver123',
  'login123',
  '123456',
  'admin123'
];

async function testPasswordVerification() {
  console.log('🔐 Testing Password Verification');
  console.log('===============================\n');
  
  console.log('Hashed password from database:');
  console.log(hashedPassword);
  console.log();
  
  for (const password of testPasswords) {
    try {
      const isMatch = await bcrypt.compare(password, hashedPassword);
      console.log(`Password "${password}": ${isMatch ? '✅ MATCH' : '❌ NO MATCH'}`);
    } catch (error) {
      console.log(`Password "${password}": ❌ ERROR - ${error.message}`);
    }
  }
  
  console.log('\n🔍 If none of the passwords match, the driver may have been created with a different password.');
  console.log('You may need to reset the password or create a new test driver.');
}

testPasswordVerification();