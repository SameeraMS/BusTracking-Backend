/**
 * Integration Test Script for GPS Functionality
 * Tests all endpoints with realistic data to validate integration
 */

const http = require('http');

// Test configuration
const BASE_URL = 'http://localhost:5000';
const API_BASE = '/api/gps';

// Test data
const testDriver = {
  name: 'Test Driver',
  phone: '+94771234999',
  licenseNumber: 'TEST001',
  busId: 'bus_test_01',
  routeId: 'route_test',
  deviceId: 'device_test_001'
};

const testLocation = {
  latitude: 6.9271,  // Colombo coordinates
  longitude: 79.8612,
  heading: 45,
  speed: 30,
  accuracy: 5,
  status: 'active'
};

// Helper function to make HTTP requests
function makeRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: API_BASE + path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        try {
          const response = JSON.parse(body);
          resolve({ status: res.statusCode, data: response });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

// Test functions
async function testHealthCheck() {
  console.log('\n=== Testing Health Check ===');
  try {
    // Make request to /api/health instead of /api/gps/../health
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: '/api/health',
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    };

    const response = await new Promise((resolve, reject) => {
      const req = http.request(options, (res) => {
        let body = '';
        res.on('data', (chunk) => {
          body += chunk;
        });
        res.on('end', () => {
          try {
            const response = JSON.parse(body);
            resolve({ status: res.statusCode, data: response });
          } catch (e) {
            resolve({ status: res.statusCode, data: body });
          }
        });
      });

      req.on('error', (err) => {
        reject(err);
      });

      req.end();
    });

    console.log(`Status: ${response.status}`);
    console.log('Response:', JSON.stringify(response.data, null, 2));
    
    if (response.status === 200 && response.data.services && response.data.services.gps) {
      console.log('✅ Health check passed - GPS service is running');
      return true;
    } else {
      console.log('❌ Health check failed');
      return false;
    }
  } catch (error) {
    console.log('❌ Health check error:', error.message);
    return false;
  }
}

async function testDriverRegistration() {
  console.log('\n=== Testing Driver Registration ===');
  try {
    const response = await makeRequest('POST', '/driver/register', testDriver);
    console.log(`Status: ${response.status}`);
    console.log('Response:', JSON.stringify(response.data, null, 2));
    
    if (response.status === 201 && response.data.success) {
      console.log('✅ Driver registration passed');
      return response.data.data.driverId;
    } else {
      console.log('❌ Driver registration failed');
      return null;
    }
  } catch (error) {
    console.log('❌ Driver registration error:', error.message);
    return null;
  }
}

async function testDriverLogin() {
  console.log('\n=== Testing Driver Login ===');
  try {
    const loginData = {
      phone: testDriver.phone,
      deviceId: testDriver.deviceId
    };
    
    const response = await makeRequest('POST', '/driver/login', loginData);
    console.log(`Status: ${response.status}`);
    console.log('Response:', JSON.stringify(response.data, null, 2));
    
    if (response.status === 200 && response.data.success) {
      console.log('✅ Driver login passed');
      return response.data.data.driverId;
    } else {
      console.log('❌ Driver login failed');
      return null;
    }
  } catch (error) {
    console.log('❌ Driver login error:', error.message);
    return null;
  }
}

async function testLocationUpdate(driverId) {
  console.log('\n=== Testing Location Update ===');
  try {
    const locationData = {
      driverId,
      busId: testDriver.busId,
      routeId: testDriver.routeId,
      ...testLocation
    };
    
    const response = await makeRequest('POST', '/driver/location', locationData);
    console.log(`Status: ${response.status}`);
    console.log('Response:', JSON.stringify(response.data, null, 2));
    
    if (response.status === 200 && response.data.success) {
      console.log('✅ Location update passed');
      return true;
    } else {
      console.log('❌ Location update failed');
      return false;
    }
  } catch (error) {
    console.log('❌ Location update error:', error.message);
    return false;
  }
}

async function testGetDriverLocation(driverId) {
  console.log('\n=== Testing Get Driver Location ===');
  try {
    const response = await makeRequest('GET', `/driver/location/${driverId}`);
    console.log(`Status: ${response.status}`);
    console.log('Response:', JSON.stringify(response.data, null, 2));
    
    if (response.status === 200 && response.data.success) {
      console.log('✅ Get driver location passed');
      return true;
    } else {
      console.log('❌ Get driver location failed');
      return false;
    }
  } catch (error) {
    console.log('❌ Get driver location error:', error.message);
    return false;
  }
}

async function testGetLiveBuses() {
  console.log('\n=== Testing Get Live Buses ===');
  try {
    const response = await makeRequest('GET', '/buses/live');
    console.log(`Status: ${response.status}`);
    console.log('Response:', JSON.stringify(response.data, null, 2));
    
    if (response.status === 200 && response.data.success) {
      console.log('✅ Get live buses passed');
      return true;
    } else {
      console.log('❌ Get live buses failed');
      return false;
    }
  } catch (error) {
    console.log('❌ Get live buses error:', error.message);
    return false;
  }
}

async function testGetBusLocation() {
  console.log('\n=== Testing Get Bus Location ===');
  try {
    const response = await makeRequest('GET', `/bus/${testDriver.busId}/location`);
    console.log(`Status: ${response.status}`);
    console.log('Response:', JSON.stringify(response.data, null, 2));
    
    if (response.status === 200 && response.data.success) {
      console.log('✅ Get bus location passed');
      return true;
    } else {
      console.log('❌ Get bus location failed');
      return false;
    }
  } catch (error) {
    console.log('❌ Get bus location error:', error.message);
    return false;
  }
}

async function testGetBusHistory() {
  console.log('\n=== Testing Get Bus History ===');
  try {
    const response = await makeRequest('GET', `/bus/${testDriver.busId}/history?limit=10`);
    console.log(`Status: ${response.status}`);
    console.log('Response:', JSON.stringify(response.data, null, 2));
    
    if (response.status === 200 && response.data.success) {
      console.log('✅ Get bus history passed');
      return true;
    } else {
      console.log('❌ Get bus history failed');
      return false;
    }
  } catch (error) {
    console.log('❌ Get bus history error:', error.message);
    return false;
  }
}

async function testGetAllDrivers() {
  console.log('\n=== Testing Get All Drivers (Admin) ===');
  try {
    const response = await makeRequest('GET', '/admin/drivers');
    console.log(`Status: ${response.status}`);
    console.log('Response:', JSON.stringify(response.data, null, 2));
    
    if (response.status === 200 && response.data.success) {
      console.log('✅ Get all drivers passed');
      return true;
    } else {
      console.log('❌ Get all drivers failed');
      return false;
    }
  } catch (error) {
    console.log('❌ Get all drivers error:', error.message);
    return false;
  }
}

async function testGetDriverStats() {
  console.log('\n=== Testing Get Driver Stats (Admin) ===');
  try {
    const response = await makeRequest('GET', '/admin/stats');
    console.log(`Status: ${response.status}`);
    console.log('Response:', JSON.stringify(response.data, null, 2));
    
    if (response.status === 200 && response.data.success) {
      console.log('✅ Get driver stats passed');
      return true;
    } else {
      console.log('❌ Get driver stats failed');
      return false;
    }
  } catch (error) {
    console.log('❌ Get driver stats error:', error.message);
    return false;
  }
}

async function testErrorHandling() {
  console.log('\n=== Testing Error Handling ===');
  let passed = 0;
  let total = 0;
  
  // Test missing fields in registration
  total++;
  try {
    const response = await makeRequest('POST', '/driver/register', { name: 'Test' });
    if (response.status === 400 && !response.data.success) {
      console.log('✅ Missing fields validation passed');
      passed++;
    } else {
      console.log('❌ Missing fields validation failed');
    }
  } catch (error) {
    console.log('❌ Missing fields validation error:', error.message);
  }
  
  // Test invalid location data
  total++;
  try {
    const response = await makeRequest('POST', '/driver/location', {
      driverId: 'test',
      busId: 'test',
      routeId: 'test',
      latitude: 999, // Invalid latitude
      longitude: 999  // Invalid longitude
    });
    if (response.status === 400 && !response.data.success) {
      console.log('✅ Invalid location validation passed');
      passed++;
    } else {
      console.log('❌ Invalid location validation failed');
    }
  } catch (error) {
    console.log('❌ Invalid location validation error:', error.message);
  }
  
  // Test non-existent driver
  total++;
  try {
    const response = await makeRequest('GET', '/driver/location/nonexistent');
    if (response.status === 404 && !response.data.success) {
      console.log('✅ Non-existent driver handling passed');
      passed++;
    } else {
      console.log('❌ Non-existent driver handling failed');
    }
  } catch (error) {
    console.log('❌ Non-existent driver handling error:', error.message);
  }
  
  console.log(`Error handling tests: ${passed}/${total} passed`);
  return passed === total;
}

// Main test runner
async function runAllTests() {
  console.log('🚀 Starting GPS Integration Tests');
  console.log('=====================================');
  
  const results = {
    passed: 0,
    total: 0
  };
  
  // Test health check first
  results.total++;
  if (await testHealthCheck()) results.passed++;
  
  // Test driver registration and get driver ID
  results.total++;
  const driverId = await testDriverRegistration();
  if (driverId) results.passed++;
  
  if (!driverId) {
    console.log('\n❌ Cannot continue tests without valid driver ID');
    return;
  }
  
  // Test driver login
  results.total++;
  if (await testDriverLogin()) results.passed++;
  
  // Test location update
  results.total++;
  if (await testLocationUpdate(driverId)) results.passed++;
  
  // Test get driver location
  results.total++;
  if (await testGetDriverLocation(driverId)) results.passed++;
  
  // Test passenger endpoints
  results.total++;
  if (await testGetLiveBuses()) results.passed++;
  
  results.total++;
  if (await testGetBusLocation()) results.passed++;
  
  results.total++;
  if (await testGetBusHistory()) results.passed++;
  
  // Test admin endpoints
  results.total++;
  if (await testGetAllDrivers()) results.passed++;
  
  results.total++;
  if (await testGetDriverStats()) results.passed++;
  
  // Test error handling
  results.total++;
  if (await testErrorHandling()) results.passed++;
  
  // Final results
  console.log('\n=====================================');
  console.log('🏁 Test Results Summary');
  console.log('=====================================');
  console.log(`Total Tests: ${results.total}`);
  console.log(`Passed: ${results.passed}`);
  console.log(`Failed: ${results.total - results.passed}`);
  console.log(`Success Rate: ${((results.passed / results.total) * 100).toFixed(1)}%`);
  
  if (results.passed === results.total) {
    console.log('\n🎉 All tests passed! GPS integration is working correctly.');
  } else {
    console.log('\n⚠️  Some tests failed. Please check the output above for details.');
  }
}

// Check if server is running and start tests
async function checkServerAndRun() {
  try {
    console.log('Checking if server is running...');
    // Check health endpoint directly
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: '/api/health',
      method: 'GET'
    };

    await new Promise((resolve, reject) => {
      const req = http.request(options, (res) => {
        resolve();
      });
      req.on('error', (err) => {
        reject(err);
      });
      req.end();
    });

    console.log('✅ Server is running, starting tests...');
    await runAllTests();
  } catch (error) {
    console.log('❌ Server is not running. Please start the server with:');
    console.log('   cd BusTracking-Backend && npm run dev');
    console.log('\nThen run this test script again.');
  }
}

// Run the tests
checkServerAndRun();