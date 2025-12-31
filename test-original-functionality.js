/**
 * Original GPS Functionality Validation Script
 * Tests that all original GPS functionality is preserved after integration
 */

const http = require('http');

// Helper function to make HTTP requests
function makeRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: '/api/gps' + path,
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

async function testOriginalDriverManagement() {
  console.log('\n=== Testing Original Driver Management ===');
  let passed = 0;
  let total = 0;
  
  // Test driver registration with all original fields
  total++;
  const driverData = {
    name: 'Original Test Driver',
    phone: '+94771234888',
    licenseNumber: 'ORIG001',
    busId: 'bus_orig_01',
    routeId: 'route_orig',
    deviceId: 'device_orig_001'
  };
  
  try {
    const response = await makeRequest('POST', '/driver/register', driverData);
    if (response.status === 201 && response.data.success && response.data.data.driverId) {
      console.log('✅ Original driver registration format preserved');
      passed++;
    } else {
      console.log('❌ Original driver registration format changed');
    }
  } catch (error) {
    console.log('❌ Driver registration error:', error.message);
  }
  
  // Test authentication with phone and deviceId (original method)
  total++;
  try {
    const response = await makeRequest('POST', '/driver/login', {
      phone: driverData.phone,
      deviceId: driverData.deviceId
    });
    
    if (response.status === 200 && response.data.success && response.data.data.isActive) {
      console.log('✅ Original authentication method preserved');
      passed++;
    } else {
      console.log('❌ Original authentication method changed');
    }
  } catch (error) {
    console.log('❌ Authentication error:', error.message);
  }
  
  console.log(`Driver management tests: ${passed}/${total} passed`);
  return passed === total;
}

async function testOriginalLocationTracking() {
  console.log('\n=== Testing Original Location Tracking ===');
  let passed = 0;
  let total = 0;
  
  // Get a driver ID from existing drivers
  const driversResponse = await makeRequest('GET', '/admin/drivers');
  if (!driversResponse.data.success || driversResponse.data.data.length === 0) {
    console.log('❌ No drivers available for location testing');
    return false;
  }
  
  const testDriver = driversResponse.data.data[0];
  
  // Test location update with original format
  total++;
  const locationData = {
    driverId: testDriver.driverId,
    busId: testDriver.busId,
    routeId: testDriver.routeId,
    latitude: 6.9271,
    longitude: 79.8612,
    heading: 90,
    speed: 25,
    accuracy: 3,
    status: 'active'
  };
  
  try {
    const response = await makeRequest('POST', '/driver/location', locationData);
    if (response.status === 200 && response.data.success && response.data.data.timestamp) {
      console.log('✅ Original location update format preserved');
      passed++;
    } else {
      console.log('❌ Original location update format changed');
    }
  } catch (error) {
    console.log('❌ Location update error:', error.message);
  }
  
  // Test location retrieval
  total++;
  try {
    const response = await makeRequest('GET', `/driver/location/${testDriver.driverId}`);
    if (response.status === 200 && response.data.success && 
        response.data.data.latitude && response.data.data.longitude) {
      console.log('✅ Original location retrieval format preserved');
      passed++;
    } else {
      console.log('❌ Original location retrieval format changed');
    }
  } catch (error) {
    console.log('❌ Location retrieval error:', error.message);
  }
  
  console.log(`Location tracking tests: ${passed}/${total} passed`);
  return passed === total;
}

async function testOriginalPassengerFeatures() {
  console.log('\n=== Testing Original Passenger Features ===');
  let passed = 0;
  let total = 0;
  
  // Test live buses endpoint
  total++;
  try {
    const response = await makeRequest('GET', '/buses/live');
    if (response.status === 200 && response.data.success && 
        Array.isArray(response.data.data) && response.data.count !== undefined) {
      console.log('✅ Original live buses format preserved');
      passed++;
    } else {
      console.log('❌ Original live buses format changed');
    }
  } catch (error) {
    console.log('❌ Live buses error:', error.message);
  }
  
  // Test specific bus location
  total++;
  const driversResponse = await makeRequest('GET', '/admin/drivers');
  if (driversResponse.data.success && driversResponse.data.data.length > 0) {
    const testBusId = driversResponse.data.data[0].busId;
    
    try {
      const response = await makeRequest('GET', `/bus/${testBusId}/location`);
      if (response.status === 200 && response.data.success && 
          response.data.data.isOnline !== undefined) {
        console.log('✅ Original bus location format preserved');
        passed++;
      } else {
        console.log('❌ Original bus location format changed');
      }
    } catch (error) {
      console.log('❌ Bus location error:', error.message);
    }
  } else {
    console.log('❌ No buses available for testing');
  }
  
  // Test bus history
  total++;
  if (driversResponse.data.success && driversResponse.data.data.length > 0) {
    const testBusId = driversResponse.data.data[0].busId;
    
    try {
      const response = await makeRequest('GET', `/bus/${testBusId}/history?limit=5`);
      if (response.status === 200 && response.data.success && 
          Array.isArray(response.data.data) && response.data.count !== undefined) {
        console.log('✅ Original bus history format preserved');
        passed++;
      } else {
        console.log('❌ Original bus history format changed');
      }
    } catch (error) {
      console.log('❌ Bus history error:', error.message);
    }
  } else {
    console.log('❌ No buses available for history testing');
  }
  
  console.log(`Passenger features tests: ${passed}/${total} passed`);
  return passed === total;
}

async function testOriginalAdminFeatures() {
  console.log('\n=== Testing Original Admin Features ===');
  let passed = 0;
  let total = 0;
  
  // Test get all drivers
  total++;
  try {
    const response = await makeRequest('GET', '/admin/drivers');
    if (response.status === 200 && response.data.success && 
        Array.isArray(response.data.data) && response.data.count !== undefined) {
      
      // Check if drivers have all original fields
      const driver = response.data.data[0];
      if (driver && driver.driverId && driver.name && driver.phone && 
          driver.busId && driver.routeId && driver.isOnline !== undefined) {
        console.log('✅ Original admin drivers format preserved');
        passed++;
      } else {
        console.log('❌ Original admin drivers format changed');
      }
    } else {
      console.log('❌ Original admin drivers endpoint changed');
    }
  } catch (error) {
    console.log('❌ Admin drivers error:', error.message);
  }
  
  // Test driver statistics
  total++;
  try {
    const response = await makeRequest('GET', '/admin/stats');
    if (response.status === 200 && response.data.success && 
        response.data.data.totalDrivers !== undefined && 
        response.data.data.activeDrivers !== undefined) {
      console.log('✅ Original driver statistics format preserved');
      passed++;
    } else {
      console.log('❌ Original driver statistics format changed');
    }
  } catch (error) {
    console.log('❌ Driver statistics error:', error.message);
  }
  
  console.log(`Admin features tests: ${passed}/${total} passed`);
  return passed === total;
}

async function testOriginalDataValidation() {
  console.log('\n=== Testing Original Data Validation ===');
  let passed = 0;
  let total = 0;
  
  // Test GPS coordinate validation (original ranges)
  total++;
  try {
    const response = await makeRequest('POST', '/driver/location', {
      driverId: 'test',
      busId: 'test',
      routeId: 'test',
      latitude: 91, // Invalid latitude
      longitude: 181 // Invalid longitude
    });
    
    if (response.status === 400 && !response.data.success) {
      console.log('✅ Original GPS validation preserved');
      passed++;
    } else {
      console.log('❌ Original GPS validation changed');
    }
  } catch (error) {
    console.log('❌ GPS validation error:', error.message);
  }
  
  // Test required fields validation
  total++;
  try {
    const response = await makeRequest('POST', '/driver/register', {
      name: 'Test'
      // Missing required fields
    });
    
    if (response.status === 400 && !response.data.success) {
      console.log('✅ Original required fields validation preserved');
      passed++;
    } else {
      console.log('❌ Original required fields validation changed');
    }
  } catch (error) {
    console.log('❌ Required fields validation error:', error.message);
  }
  
  console.log(`Data validation tests: ${passed}/${total} passed`);
  return passed === total;
}

async function testOriginalResponseFormats() {
  console.log('\n=== Testing Original Response Formats ===');
  let passed = 0;
  let total = 0;
  
  // Test success response format
  total++;
  try {
    const response = await makeRequest('GET', '/buses/live');
    if (response.data.success !== undefined && 
        response.data.message !== undefined &&
        response.data.data !== undefined) {
      console.log('✅ Original success response format preserved');
      passed++;
    } else {
      console.log('❌ Original success response format changed');
    }
  } catch (error) {
    console.log('❌ Success response format error:', error.message);
  }
  
  // Test error response format
  total++;
  try {
    const response = await makeRequest('GET', '/driver/location/nonexistent');
    if (response.data.success === false && 
        response.data.message !== undefined &&
        response.data.error !== undefined) {
      console.log('✅ Original error response format preserved');
      passed++;
    } else {
      console.log('❌ Original error response format changed');
    }
  } catch (error) {
    console.log('❌ Error response format error:', error.message);
  }
  
  console.log(`Response format tests: ${passed}/${total} passed`);
  return passed === total;
}

// Main test runner
async function runOriginalFunctionalityTests() {
  console.log('🔍 Testing Original GPS Functionality Preservation');
  console.log('==================================================');
  
  const results = {
    passed: 0,
    total: 0
  };
  
  // Test original driver management
  results.total++;
  if (await testOriginalDriverManagement()) results.passed++;
  
  // Test original location tracking
  results.total++;
  if (await testOriginalLocationTracking()) results.passed++;
  
  // Test original passenger features
  results.total++;
  if (await testOriginalPassengerFeatures()) results.passed++;
  
  // Test original admin features
  results.total++;
  if (await testOriginalAdminFeatures()) results.passed++;
  
  // Test original data validation
  results.total++;
  if (await testOriginalDataValidation()) results.passed++;
  
  // Test original response formats
  results.total++;
  if (await testOriginalResponseFormats()) results.passed++;
  
  // Final results
  console.log('\n==================================================');
  console.log('🏁 Original Functionality Preservation Results');
  console.log('==================================================');
  console.log(`Total Test Categories: ${results.total}`);
  console.log(`Passed: ${results.passed}`);
  console.log(`Failed: ${results.total - results.passed}`);
  console.log(`Success Rate: ${((results.passed / results.total) * 100).toFixed(1)}%`);
  
  if (results.passed === results.total) {
    console.log('\n🎉 All original GPS functionality is preserved!');
    console.log('The integration successfully maintains backward compatibility.');
  } else {
    console.log('\n⚠️  Some original functionality may have been affected.');
    console.log('Please review the failed tests above.');
  }
  
  return results.passed === results.total;
}

// Check if server is running and start tests
async function checkServerAndRun() {
  try {
    console.log('Checking if server is running...');
    const healthResponse = await makeRequest('GET', '/../health');
    console.log('✅ Server is running, testing original functionality...');
    return await runOriginalFunctionalityTests();
  } catch (error) {
    console.log('❌ Server is not running. Please start the server first.');
    return false;
  }
}

// Export for use in other scripts
if (require.main === module) {
  checkServerAndRun();
}

module.exports = { runOriginalFunctionalityTests };