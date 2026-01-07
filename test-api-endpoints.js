/**
 * Test API endpoints for GPS Processing Service
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:5001/api';

// Test health check
async function testHealthCheck() {
  console.log('\n=== Testing Health Check ===');
  try {
    const response = await axios.get(`${BASE_URL}/health`);
    console.log('Health check status:', response.status);
    console.log('Services status:', response.data.services);
    return response.status === 200;
  } catch (error) {
    console.error('Health check failed:', error.message);
    return false;
  }
}

// Test driver registration
async function testDriverRegistration() {
  console.log('\n=== Testing Driver Registration ===');
  try {
    const driverData = {
      name: 'Test Driver',
      phone: '+94771234570',
      licenseNumber: 'TEST001',
      busId: 'test_bus_api_001',
      routeId: 'test_route_api_001',
      deviceId: 'test_device_api_001'
    };
    
    const response = await axios.post(`${BASE_URL}/gps/driver/register`, driverData);
    console.log('Registration status:', response.status);
    console.log('Driver ID:', response.data.data.driverId);
    return { success: response.status === 201, driverId: response.data.data.driverId };
  } catch (error) {
    console.error('Driver registration failed:', error.response?.data || error.message);
    return { success: false };
  }
}

// Test driver login
async function testDriverLogin() {
  console.log('\n=== Testing Driver Login ===');
  try {
    const loginData = {
      phone: '+94771234570',
      deviceId: 'test_device_api_001'
    };
    
    const response = await axios.post(`${BASE_URL}/gps/driver/login`, loginData);
    console.log('Login status:', response.status);
    console.log('Session ID:', response.data.data.sessionId);
    return { 
      success: response.status === 200, 
      sessionId: response.data.data.sessionId,
      driverId: response.data.data.driverId
    };
  } catch (error) {
    console.error('Driver login failed:', error.response?.data || error.message);
    return { success: false };
  }
}

// Test location update
async function testLocationUpdate(driverId, sessionId) {
  console.log('\n=== Testing Location Update ===');
  try {
    const locationData = {
      driverId,
      busId: 'test_bus_api_001',
      routeId: 'test_route_api_001',
      latitude: 6.9271,
      longitude: 79.8612,
      heading: 45,
      speed: 25,
      accuracy: 10,
      status: 'active',
      sessionId
    };
    
    const response = await axios.post(`${BASE_URL}/gps/driver/location`, locationData);
    console.log('Location update status:', response.status);
    console.log('Location ID:', response.data.data.locationId);
    return response.status === 200;
  } catch (error) {
    console.error('Location update failed:', error.response?.data || error.message);
    return false;
  }
}

// Test get live buses
async function testGetLiveBuses() {
  console.log('\n=== Testing Get Live Buses ===');
  try {
    const response = await axios.get(`${BASE_URL}/gps/buses/live`);
    console.log('Live buses status:', response.status);
    console.log('Active buses count:', response.data.count);
    console.log('Legacy buses count:', response.data.legacy_count);
    return response.status === 200;
  } catch (error) {
    console.error('Get live buses failed:', error.response?.data || error.message);
    return false;
  }
}

// Test admin stats
async function testAdminStats() {
  console.log('\n=== Testing Admin Stats ===');
  try {
    const response = await axios.get(`${BASE_URL}/gps/admin/stats`);
    console.log('Admin stats status:', response.status);
    console.log('Driver stats:', response.data.data);
    return response.status === 200;
  } catch (error) {
    console.error('Admin stats failed:', error.response?.data || error.message);
    return false;
  }
}

// Main test function
async function runAPITests() {
  console.log('Starting API Endpoint Tests...');
  
  // Wait for server to be ready
  console.log('Waiting for server to be ready...');
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  try {
    const healthOk = await testHealthCheck();
    if (!healthOk) {
      console.log('Server not ready, skipping API tests');
      return;
    }
    
    const registration = await testDriverRegistration();
    if (!registration.success) {
      console.log('Driver registration failed, skipping dependent tests');
      return;
    }
    
    const login = await testDriverLogin();
    if (!login.success) {
      console.log('Driver login failed, skipping dependent tests');
      return;
    }
    
    await testLocationUpdate(login.driverId, login.sessionId);
    await testGetLiveBuses();
    await testAdminStats();
    
    console.log('\n=== API Tests Completed ===');
    
  } catch (error) {
    console.error('API test error:', error);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runAPITests();
}

module.exports = { runAPITests };