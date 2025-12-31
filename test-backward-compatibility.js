/**
 * Backward Compatibility Test Script
 * Tests existing backend functionality to ensure GPS integration doesn't break anything
 */

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

async function testHealthEndpoint() {
  console.log('\n=== Testing Health Endpoint ===');
  try {
    const response = await makeRequest('GET', '/api/health');
    console.log(`Status: ${response.status}`);
    console.log('Response:', JSON.stringify(response.data, null, 2));
    
    if (response.status === 200 && response.data.success) {
      console.log('✅ Health endpoint working');
      return true;
    } else {
      console.log('❌ Health endpoint failed');
      return false;
    }
  } catch (error) {
    console.log('❌ Health endpoint error:', error.message);
    return false;
  }
}

async function testExistingRoutes() {
  console.log('\n=== Testing Existing Routes ===');
  let passed = 0;
  let total = 0;
  
  // Test existing driver routes
  const routes = [
    '/api/drivers',
    '/api/users', 
    '/api/timetables'
  ];
  
  for (const route of routes) {
    total++;
    try {
      const response = await makeRequest('GET', route);
      console.log(`${route}: Status ${response.status}`);
      
      // We expect these to work (200) or return proper errors (400/404/500)
      // but not return "Route not found" (which would be 404 with our custom handler)
      if (response.status !== 404 || (response.data && response.data.message !== 'Route not found')) {
        console.log(`✅ ${route} route is accessible`);
        passed++;
      } else {
        console.log(`❌ ${route} route not found`);
      }
    } catch (error) {
      console.log(`❌ ${route} error:`, error.message);
    }
  }
  
  console.log(`Existing routes test: ${passed}/${total} passed`);
  return passed === total;
}

async function testMiddleware() {
  console.log('\n=== Testing Middleware ===');
  let passed = 0;
  let total = 0;
  
  // Test CORS middleware
  total++;
  try {
    const response = await makeRequest('OPTIONS', '/api/health');
    console.log(`CORS preflight: Status ${response.status}`);
    // OPTIONS should be handled by CORS middleware
    if (response.status === 200 || response.status === 204) {
      console.log('✅ CORS middleware working');
      passed++;
    } else {
      console.log('❌ CORS middleware may not be working');
    }
  } catch (error) {
    console.log('❌ CORS test error:', error.message);
  }
  
  // Test JSON parsing middleware
  total++;
  try {
    const response = await makeRequest('POST', '/api/gps/driver/register', { test: 'data' });
    // Should get validation error (400) not parsing error (500)
    if (response.status === 400 && response.data && response.data.success === false) {
      console.log('✅ JSON parsing middleware working');
      passed++;
    } else {
      console.log('❌ JSON parsing middleware may not be working');
    }
  } catch (error) {
    console.log('❌ JSON parsing test error:', error.message);
  }
  
  console.log(`Middleware tests: ${passed}/${total} passed`);
  return passed === total;
}

async function testErrorHandling() {
  console.log('\n=== Testing Error Handling ===');
  let passed = 0;
  let total = 0;
  
  // Test 404 handler
  total++;
  try {
    const response = await makeRequest('GET', '/api/nonexistent');
    console.log(`404 test: Status ${response.status}`);
    if (response.status === 404 && response.data && response.data.message === 'Route not found') {
      console.log('✅ 404 handler working');
      passed++;
    } else {
      console.log('❌ 404 handler not working properly');
    }
  } catch (error) {
    console.log('❌ 404 test error:', error.message);
  }
  
  console.log(`Error handling tests: ${passed}/${total} passed`);
  return passed === total;
}

async function testDatabaseConnection() {
  console.log('\n=== Testing Database Connection ===');
  try {
    const response = await makeRequest('GET', '/api/health');
    
    if (response.status === 200 && 
        response.data.services && 
        response.data.services.database === 'connected') {
      console.log('✅ Database connection working');
      return true;
    } else {
      console.log('❌ Database connection issue');
      return false;
    }
  } catch (error) {
    console.log('❌ Database test error:', error.message);
    return false;
  }
}

// Main test runner
async function runBackwardCompatibilityTests() {
  console.log('🔄 Starting Backward Compatibility Tests');
  console.log('==========================================');
  
  const results = {
    passed: 0,
    total: 0
  };
  
  // Test health endpoint
  results.total++;
  if (await testHealthEndpoint()) results.passed++;
  
  // Test existing routes
  results.total++;
  if (await testExistingRoutes()) results.passed++;
  
  // Test middleware
  results.total++;
  if (await testMiddleware()) results.passed++;
  
  // Test error handling
  results.total++;
  if (await testErrorHandling()) results.passed++;
  
  // Test database connection
  results.total++;
  if (await testDatabaseConnection()) results.passed++;
  
  // Final results
  console.log('\n==========================================');
  console.log('🏁 Backward Compatibility Results');
  console.log('==========================================');
  console.log(`Total Tests: ${results.total}`);
  console.log(`Passed: ${results.passed}`);
  console.log(`Failed: ${results.total - results.passed}`);
  console.log(`Success Rate: ${((results.passed / results.total) * 100).toFixed(1)}%`);
  
  if (results.passed === results.total) {
    console.log('\n🎉 All backward compatibility tests passed!');
    console.log('GPS integration does not break existing functionality.');
  } else {
    console.log('\n⚠️  Some backward compatibility tests failed.');
    console.log('GPS integration may have affected existing functionality.');
  }
  
  return results.passed === results.total;
}

// Check if server is running and start tests
async function checkServerAndRun() {
  try {
    console.log('Checking if server is running...');
    await makeRequest('GET', '/api/health');
    console.log('✅ Server is running, starting backward compatibility tests...');
    return await runBackwardCompatibilityTests();
  } catch (error) {
    console.log('❌ Server is not running. Please start the server first.');
    return false;
  }
}

// Export for use in other scripts
if (require.main === module) {
  checkServerAndRun();
}

module.exports = { runBackwardCompatibilityTests };