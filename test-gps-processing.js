/**
 * Test script for GPS Processing Service
 * Tests the implementation of requirements 3.1-3.5
 */

const mongoose = require('mongoose');
const { gpsProcessingService } = require('./services/gpsProcessingService');
const DriverSession = require('./models/DriverSession');

// Connect to database
async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || "mongodb+srv://chamikadamith9:Chamika%40200273@cluster0.bcz4z.mongodb.net/busassesment?retryWrites=true&w=majority&appName=Cluster0");
    console.log('MongoDB Connected for testing');
  } catch (error) {
    console.error('Database connection error:', error);
    process.exit(1);
  }
}

// Test data validation (Requirement 3.1)
async function testLocationDataValidation() {
  console.log('\n=== Testing Location Data Validation (Requirement 3.1) ===');
  
  // Test valid location data
  const validLocation = {
    driverId: 'test_driver_001',
    busId: 'test_bus_001',
    routeId: 'test_route_001',
    latitude: 6.9271,
    longitude: 79.8612,
    accuracy: 10.5,
    heading: 45,
    speed: 25
  };
  
  const validResult = gpsProcessingService.validateLocationData(validLocation);
  console.log('Valid location data:', validResult.isValid ? 'PASS' : 'FAIL');
  
  // Test invalid location data
  const invalidLocation = {
    driverId: 'test_driver_001',
    // Missing required fields
    latitude: 200, // Invalid latitude
    longitude: -200, // Invalid longitude
    accuracy: -5 // Invalid accuracy
  };
  
  const invalidResult = gpsProcessingService.validateLocationData(invalidLocation);
  console.log('Invalid location data rejected:', !invalidResult.isValid ? 'PASS' : 'FAIL');
  console.log('Validation errors:', invalidResult.errors);
}

// Test session authentication (Requirement 3.1)
async function testSessionAuthentication() {
  console.log('\n=== Testing Session Authentication (Requirement 3.1) ===');
  
  // Create a test session
  const testSession = new DriverSession({
    sessionId: 'test_session_001',
    driverId: 'test_driver_001',
    busId: 'test_bus_001',
    routeId: 'test_route_001',
    deviceId: 'test_device_001',
    phone: '+94771234567',
    isActive: true,
    startTime: new Date(),
    lastActivity: new Date(),
    expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000) // 8 hours from now
  });
  
  await testSession.save();
  console.log('Test session created');
  
  // Test valid session authentication
  const validAuth = await gpsProcessingService.authenticateSession('test_session_001');
  console.log('Valid session authentication:', validAuth ? 'PASS' : 'FAIL');
  
  // Test invalid session authentication
  const invalidAuth = await gpsProcessingService.authenticateSession('invalid_session');
  console.log('Invalid session rejected:', !invalidAuth ? 'PASS' : 'FAIL');
  
  // Clean up
  await DriverSession.deleteOne({ sessionId: 'test_session_001' });
}

// Test chronological processing (Requirement 3.5)
async function testChronologicalProcessing() {
  console.log('\n=== Testing Chronological Processing (Requirement 3.5) ===');
  
  // Create test session
  const testSession = new DriverSession({
    sessionId: 'test_session_002',
    driverId: 'test_driver_002',
    busId: 'test_bus_002',
    routeId: 'test_route_002',
    deviceId: 'test_device_002',
    phone: '+94771234568',
    isActive: true,
    startTime: new Date(),
    lastActivity: new Date(),
    expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000)
  });
  
  await testSession.save();
  
  // Create location updates with different timestamps (out of order)
  const now = Date.now();
  const locations = [
    {
      driverId: 'test_driver_002',
      busId: 'test_bus_002',
      routeId: 'test_route_002',
      latitude: 6.9271,
      longitude: 79.8612,
      accuracy: 10,
      timestamp: new Date(now + 2000) // 2 seconds later
    },
    {
      driverId: 'test_driver_002',
      busId: 'test_bus_002',
      routeId: 'test_route_002',
      latitude: 6.9272,
      longitude: 79.8613,
      accuracy: 10,
      timestamp: new Date(now) // Earlier timestamp
    },
    {
      driverId: 'test_driver_002',
      busId: 'test_bus_002',
      routeId: 'test_route_002',
      latitude: 6.9273,
      longitude: 79.8614,
      accuracy: 10,
      timestamp: new Date(now + 1000) // 1 second later
    }
  ];
  
  // Process locations (should be processed in chronological order)
  console.log('Processing locations out of order...');
  const results = await Promise.all(
    locations.map(location => 
      gpsProcessingService.processLocationUpdate(location, 'test_session_002')
    )
  );
  
  const successCount = results.filter(r => r.success).length;
  console.log(`Chronological processing: ${successCount}/${locations.length} locations processed successfully`);
  
  // Clean up
  await DriverSession.deleteOne({ sessionId: 'test_session_002' });
}

// Test offline driver detection (Requirement 3.4)
async function testOfflineDetection() {
  console.log('\n=== Testing Offline Driver Detection (Requirement 3.4) ===');
  
  // Create test session with old timestamp
  const oldTimestamp = new Date(Date.now() - 60000); // 1 minute ago
  const testSession = new DriverSession({
    sessionId: 'test_session_003',
    driverId: 'test_driver_003',
    busId: 'test_bus_003',
    routeId: 'test_route_003',
    deviceId: 'test_device_003',
    phone: '+94771234569',
    isActive: true,
    startTime: oldTimestamp,
    lastActivity: oldTimestamp,
    lastLocationUpdate: oldTimestamp,
    expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000)
  });
  
  await testSession.save();
  
  // Run offline detection
  await gpsProcessingService.markOfflineDrivers();
  console.log('Offline driver detection completed');
  
  // Clean up
  await DriverSession.deleteOne({ sessionId: 'test_session_003' });
}

// Test processing statistics
async function testProcessingStats() {
  console.log('\n=== Testing Processing Statistics ===');
  
  const stats = gpsProcessingService.getProcessingStats();
  console.log('Processing stats:', stats);
  
  console.log('Statistics retrieval:', stats ? 'PASS' : 'FAIL');
}

// Main test function
async function runTests() {
  console.log('Starting GPS Processing Service Tests...');
  
  try {
    await connectDB();
    
    await testLocationDataValidation();
    await testSessionAuthentication();
    await testChronologicalProcessing();
    await testOfflineDetection();
    await testProcessingStats();
    
    console.log('\n=== All Tests Completed ===');
    
  } catch (error) {
    console.error('Test error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed');
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runTests();
}

module.exports = { runTests };