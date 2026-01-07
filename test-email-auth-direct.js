#!/usr/bin/env node

/**
 * Test Email-Only Authentication directly with MongoDB
 */

const mongoose = require('mongoose');
const Driver = require('./models/Driver');

// Configuration
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://chamikachamara2001:Chamika2001@cluster0.bcz4z.mongodb.net/bus-tracking?retryWrites=true&w=majority';

async function testEmailAuthenticationDirect() {
  console.log('🧪 Testing Email-Only Authentication (Direct MongoDB)');
  console.log('===================================================\n');

  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    // Test 1: Find existing drivers
    console.log('\n📋 Listing all drivers in database:');
    const allDrivers = await Driver.find({}).select('name email telephone vehicleNumber route');
    
    if (allDrivers.length === 0) {
      console.log('❌ No drivers found in database');
      
      // Create a test driver
      console.log('\n🔧 Creating test driver...');
      const testDriver = new Driver({
        name: 'Test Driver',
        email: 'test@driver.com',
        password: 'password123',
        route: 'Route-001',
        nic: 'TEST123456789',
        telephone: '+94771234567',
        vehicleNumber: 'BUS-001'
      });
      
      await testDriver.save();
      console.log('✅ Test driver created successfully');
      console.log('  Email:', testDriver.email);
      console.log('  Password: password123');
      
    } else {
      console.log(`✅ Found ${allDrivers.length} drivers:`);
      allDrivers.forEach((driver, index) => {
        console.log(`  ${index + 1}. ${driver.name} (${driver.email}) - ${driver.telephone} - ${driver.vehicleNumber} - ${driver.route}`);
      });
    }
    
    // Test 2: Test authentication with first driver
    const testDriver = allDrivers.length > 0 ? allDrivers[0] : await Driver.findOne({ email: 'test@driver.com' });
    
    if (testDriver) {
      console.log(`\n🔐 Testing authentication with: ${testDriver.email}`);
      
      // Find driver by email
      const foundDriver = await Driver.findOne({ email: testDriver.email });
      
      if (foundDriver) {
        console.log('✅ Driver found by email');
        
        // Test password comparison (assuming password is 'password123' for test driver)
        const testPasswords = ['password123', 'mypassword123', 'wrongpassword'];
        
        for (const password of testPasswords) {
          try {
            const isMatch = await foundDriver.comparePassword(password);
            console.log(`  Password "${password}": ${isMatch ? '✅ MATCH' : '❌ NO MATCH'}`);
          } catch (error) {
            console.log(`  Password "${password}": ❌ ERROR - ${error.message}`);
          }
        }
        
      } else {
        console.log('❌ Driver not found by email');
      }
    }
    
    // Test 3: Simulate the new login flow
    console.log('\n🔄 Simulating new email-only login flow...');
    
    const loginEmail = allDrivers.length > 0 ? allDrivers[0].email : 'test@driver.com';
    const loginPassword = 'password123';
    
    console.log(`Email: ${loginEmail}`);
    console.log(`Password: [HIDDEN]`);
    
    // Step 1: Find driver by email
    const mongoDriver = await Driver.findOne({ email: loginEmail.toLowerCase() });
    
    if (!mongoDriver) {
      console.log('❌ Authentication failed: Driver not found');
    } else {
      console.log('✅ Driver found in database');
      
      // Step 2: Compare password
      const passwordMatch = await mongoDriver.comparePassword(loginPassword);
      
      if (!passwordMatch) {
        console.log('❌ Authentication failed: Invalid password');
      } else {
        console.log('✅ Authentication successful!');
        console.log('Driver details:');
        console.log('  ID:', mongoDriver._id);
        console.log('  Name:', mongoDriver.name);
        console.log('  Email:', mongoDriver.email);
        console.log('  Phone:', mongoDriver.telephone);
        console.log('  Vehicle:', mongoDriver.vehicleNumber);
        console.log('  Route:', mongoDriver.route);
        console.log('  NIC:', mongoDriver.nic);
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

testEmailAuthenticationDirect();