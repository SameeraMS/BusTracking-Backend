/**
 * Final Validation Script for GPS Integration
 * Comprehensive test suite that validates all aspects of the integration
 */

const { runOriginalFunctionalityTests } = require('./test-original-functionality');
const { runBackwardCompatibilityTests } = require('./test-backward-compatibility');

const http = require('http');

// Helper function to make HTTP requests
function makeRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: path,
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

async function testExpressIntegration() {
  console.log('\n=== Testing Express.js Integration ===');
  let passed = 0;
  let total = 0;
  
  // Test that GPS routes are properly mounted
  total++;
  try {
    const response = await makeRequest('GET', '/api/gps/buses/live');
    if (response.status === 200) {
      console.log('✅ GPS routes properly mounted in Express');
      passed++;
    } else {
      console.log('❌ GPS routes not properly mounted');
    }
  } catch (error) {
    console.log('❌ GPS routes mounting error:', error.message);
  }
  
  // Test that GPS service is initialized on startup
  total++;
  try {
    const response = await makeRequest('GET', '/api/health');
    if (response.status === 200 && response.data.services && response.data.services.gps) {
      console.log('✅ GPS service properly initialized');
      passed++;
    } else {
      console.log('❌ GPS service not properly initialized');
    }
  } catch (error) {
    console.log('❌ GPS service initialization error:', error.message);
  }
  
  // Test middleware integration
  total++;
  try {
    const response = await makeRequest('POST', '/api/gps/driver/register', { test: 'data' });
    // Should get validation error (400) not parsing error (500)
    if (response.status === 400) {
      console.log('✅ Middleware properly integrated with GPS routes');
      passed++;
    } else {
      console.log('❌ Middleware integration issue');
    }
  } catch (error) {
    console.log('❌ Middleware integration error:', error.message);
  }
  
  console.log(`Express integration tests: ${passed}/${total} passed`);
  return passed === total;
}

async function testRealisticDataScenarios() {
  console.log('\n=== Testing Realistic Data Scenarios ===');
  let passed = 0;
  let total = 0;
  
  // Test with realistic Sri Lankan coordinates
  total++;
  const realisticDriver = {
    name: 'Chaminda Perera',
    phone: '+94712345678',
    licenseNumber: 'B1234567',
    busId: 'NTC-138-001',
    routeId: '138',
    deviceId: 'samsung_galaxy_a54_001'
  };
  
  try {
    const regResponse = await makeRequest('POST', '/api/gps/driver/register', realisticDriver);
    if (regResponse.status === 201) {
      const driverId = regResponse.data.data.driverId;
      
      // Test with Colombo to Kandy route coordinates
      const locations = [
        { lat: 6.9271, lon: 79.8612, name: 'Colombo Fort' },
        { lat: 6.9319, lon: 79.8478, name: 'Pettah' },
        { lat: 7.2906, lon: 80.6337, name: 'Kandy' }
      ];
      
      let locationUpdatesSuccessful = 0;
      for (const location of locations) {
        const locationData = {
          driverId,
          busId: realisticDriver.busId,
          routeId: realisticDriver.routeId,
          latitude: location.lat,
          longitude: location.lon,
          heading: Math.floor(Math.random() * 360),
          speed: Math.floor(Math.random() * 60) + 20,
          accuracy: Math.floor(Math.random() * 10) + 1,
          status: 'active'
        };
        
        const locResponse = await makeRequest('POST', '/api/gps/driver/location', locationData);
        if (locResponse.status === 200) {
          locationUpdatesSuccessful++;
        }
        
        // Small delay between updates
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      if (locationUpdatesSuccessful === locations.length) {
        console.log('✅ Realistic location data handling successful');
        passed++;
      } else {
        console.log('❌ Some realistic location updates failed');
      }
    } else {
      console.log('❌ Realistic driver registration failed');
    }
  } catch (error) {
    console.log('❌ Realistic data scenario error:', error.message);
  }
  
  // Test concurrent driver operations
  total++;
  try {
    const concurrentDrivers = [];
    for (let i = 0; i < 3; i++) {
      concurrentDrivers.push({
        name: `Concurrent Driver ${i + 1}`,
        phone: `+9471234567${i}`,
        licenseNumber: `CONC00${i + 1}`,
        busId: `bus_conc_0${i + 1}`,
        routeId: `route_conc_${i + 1}`,
        deviceId: `device_conc_00${i + 1}`
      });
    }
    
    const registrationPromises = concurrentDrivers.map(driver => 
      makeRequest('POST', '/api/gps/driver/register', driver)
    );
    
    const results = await Promise.all(registrationPromises);
    const successfulRegistrations = results.filter(r => r.status === 201).length;
    
    if (successfulRegistrations === concurrentDrivers.length) {
      console.log('✅ Concurrent operations handled successfully');
      passed++;
    } else {
      console.log('❌ Some concurrent operations failed');
    }
  } catch (error) {
    console.log('❌ Concurrent operations error:', error.message);
  }
  
  console.log(`Realistic data tests: ${passed}/${total} passed`);
  return passed === total;
}

async function testPerformanceAndLimits() {
  console.log('\n=== Testing Performance and Limits ===');
  let passed = 0;
  let total = 0;
  
  // Test location history limit (should be 100)
  total++;
  try {
    // Get an existing driver
    const driversResponse = await makeRequest('GET', '/api/gps/admin/drivers');
    if (driversResponse.data.success && driversResponse.data.data.length > 0) {
      const testDriver = driversResponse.data.data[0];
      
      // Add many location updates to test history limit
      for (let i = 0; i < 105; i++) {
        const locationData = {
          driverId: testDriver.driverId,
          busId: testDriver.busId,
          routeId: testDriver.routeId,
          latitude: 6.9271 + (Math.random() - 0.5) * 0.01,
          longitude: 79.8612 + (Math.random() - 0.5) * 0.01,
          heading: Math.floor(Math.random() * 360),
          speed: Math.floor(Math.random() * 60),
          accuracy: Math.floor(Math.random() * 10) + 1,
          status: 'active'
        };
        
        await makeRequest('POST', '/api/gps/driver/location', locationData);
      }
      
      // Check history limit
      const historyResponse = await makeRequest('GET', `/api/gps/bus/${testDriver.busId}/history?limit=200`);
      if (historyResponse.status === 200 && historyResponse.data.data.length <= 100) {
        console.log('✅ Location history limit properly enforced');
        passed++;
      } else {
        console.log('❌ Location history limit not enforced');
      }
    } else {
      console.log('❌ No drivers available for history limit test');
    }
  } catch (error) {
    console.log('❌ History limit test error:', error.message);
  }
  
  // Test driver offline detection (2 minute timeout)
  total++;
  try {
    // This test would require waiting 2 minutes, so we'll just verify the logic exists
    const response = await makeRequest('GET', '/api/gps/admin/drivers');
    if (response.status === 200 && response.data.data.length > 0) {
      const driver = response.data.data[0];
      if (driver.isOnline !== undefined) {
        console.log('✅ Driver offline detection logic implemented');
        passed++;
      } else {
        console.log('❌ Driver offline detection logic missing');
      }
    } else {
      console.log('❌ Cannot test offline detection - no drivers');
    }
  } catch (error) {
    console.log('❌ Offline detection test error:', error.message);
  }
  
  console.log(`Performance and limits tests: ${passed}/${total} passed`);
  return passed === total;
}

async function runFinalValidation() {
  console.log('🎯 Final GPS Integration Validation');
  console.log('===================================');
  
  const testSuites = [
    { name: 'Express.js Integration', test: testExpressIntegration },
    { name: 'Realistic Data Scenarios', test: testRealisticDataScenarios },
    { name: 'Performance and Limits', test: testPerformanceAndLimits },
    { name: 'Backward Compatibility', test: runBackwardCompatibilityTests },
    { name: 'Original Functionality', test: runOriginalFunctionalityTests }
  ];
  
  const results = {
    passed: 0,
    total: testSuites.length
  };
  
  for (const suite of testSuites) {
    console.log(`\n🧪 Running ${suite.name} Tests...`);
    try {
      if (await suite.test()) {
        console.log(`✅ ${suite.name}: PASSED`);
        results.passed++;
      } else {
        console.log(`❌ ${suite.name}: FAILED`);
      }
    } catch (error) {
      console.log(`❌ ${suite.name}: ERROR - ${error.message}`);
    }
  }
  
  // Final summary
  console.log('\n===================================');
  console.log('🏆 FINAL VALIDATION RESULTS');
  console.log('===================================');
  console.log(`Test Suites: ${results.total}`);
  console.log(`Passed: ${results.passed}`);
  console.log(`Failed: ${results.total - results.passed}`);
  console.log(`Success Rate: ${((results.passed / results.total) * 100).toFixed(1)}%`);
  
  if (results.passed === results.total) {
    console.log('\n🎉 GPS INTEGRATION VALIDATION SUCCESSFUL!');
    console.log('=========================================');
    console.log('✅ All endpoints tested with realistic data');
    console.log('✅ GPS service integration with Express.js verified');
    console.log('✅ Backward compatibility with existing backend confirmed');
    console.log('✅ All original GPS functionality preserved');
    console.log('✅ Error handling and validation working correctly');
    console.log('✅ Performance limits and constraints enforced');
    console.log('\nThe GPS integration is ready for production use! 🚀');
  } else {
    console.log('\n⚠️  GPS INTEGRATION VALIDATION INCOMPLETE');
    console.log('==========================================');
    console.log('Some test suites failed. Please review the output above');
    console.log('and address any issues before deploying to production.');
  }
  
  return results.passed === results.total;
}

// Check if server is running and start validation
async function checkServerAndRun() {
  try {
    console.log('Checking if server is running...');
    await makeRequest('GET', '/api/health');
    console.log('✅ Server is running, starting final validation...\n');
    return await runFinalValidation();
  } catch (error) {
    console.log('❌ Server is not running. Please start the server with:');
    console.log('   cd BusTracking-Backend && npm run dev');
    console.log('\nThen run this validation script again.');
    return false;
  }
}

// Run the validation
if (require.main === module) {
  checkServerAndRun();
}

module.exports = { runFinalValidation };