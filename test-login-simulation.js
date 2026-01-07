#!/usr/bin/env node

/**
 * Simulate the exact login logic from the backend
 */

const mongoose = require('mongoose');
const Driver = require('./models/Driver');

// Configuration
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://chamikachamara2001:Chamika2001@cluster0.bcz4z.mongodb.net/bus-tracking?retryWrites=true&w=majority';

async function simulateLoginLogic() {
  console.log('🔄 Simulating Backend Login Logic');
  console.log('==================================\n');

  try {
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Simulate the exact login request
    const email = 'testlogin555@example.com';
    const password = 'mypassword123';

    console.log(`\n🔍 Looking for driver with email: ${email}`);
    
    // Step 1: Find driver by email (exact same logic as backend)
    const mongoDriver = await Driver.findOne({ email: email.toLowerCase() });
    console.log('MongoDB login attempt:', { email: email.toLowerCase(), found: !!mongoDriver });
    
    if (!mongoDriver) {
      console.log('❌ Driver not found in database');
      return;
    }
    
    console.log('✅ Driver found in database');
    console.log('Driver details:');
    console.log('  ID:', mongoDriver._id);
    console.log('  Name:', mongoDriver.name);
    console.log('  Email:', mongoDriver.email);
    console.log('  Phone:', mongoDriver.telephone);
    console.log('  Vehicle:', mongoDriver.vehicleNumber);
    console.log('  Route:', mongoDriver.route);

    // Step 2: Compare password (exact same logic as backend)
    console.log('\n🔐 Comparing password...');
    const passwordMatch = await mongoDriver.comparePassword(password);
    console.log('Password comparison result:', passwordMatch);
    
    if (!passwordMatch) {
      console.log('❌ Password does not match');
      return;
    }
    
    console.log('✅ Password matches!');
    
    // Step 3: Simulate session creation
    console.log('\n🎫 Creating session...');
    const driverId = `driver_mongo_${mongoDriver._id}`;
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const deviceId = `device_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    
    console.log('Generated IDs:');
    console.log('  Driver ID:', driverId);
    console.log('  Session ID:', sessionId);
    console.log('  Device ID:', deviceId);
    
    // Step 4: Simulate response data
    const responseData = {
      success: true,
      data: {
        driverId: driverId,
        name: mongoDriver.name,
        email: mongoDriver.email,
        licenseNumber: mongoDriver.nic,
        busId: mongoDriver.vehicleNumber,
        routeId: mongoDriver.route,
        deviceId: deviceId,
        isActive: true,
        lastSeen: Date.now(),
        sessionId: sessionId,
        sessionStartTime: Date.now(),
        sessionExpiresAt: Date.now() + (24 * 60 * 60 * 1000), // 24 hours
        mongoId: mongoDriver._id,
        // Driver profile information
        phone: mongoDriver.telephone,
        nic: mongoDriver.nic,
        vehicleNumber: mongoDriver.vehicleNumber,
        route: mongoDriver.route
      },
      message: 'Authentication successful'
    };
    
    console.log('\n📋 Response data:');
    console.log(JSON.stringify(responseData, null, 2));
    
    console.log('\n✅ Login simulation completed successfully!');
    
  } catch (error) {
    console.error('❌ Error during simulation:', error.message);
    console.error('Stack trace:', error.stack);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

simulateLoginLogic();