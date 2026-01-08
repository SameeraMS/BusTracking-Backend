const axios = require('axios');

const BASE_URL = 'http://localhost:5001/api/routes';

async function testRouteAPI() {
  console.log('🧪 Testing Bus Route API Endpoints\n');
  console.log('='.repeat(50));

  try {
    // Test 1: Get all routes
    console.log('\n📋 Test 1: Get All Routes');
    console.log('-'.repeat(50));
    const allRoutesResponse = await axios.get(BASE_URL);
    console.log(`✅ Status: ${allRoutesResponse.status}`);
    console.log(`✅ Total Routes: ${allRoutesResponse.data.count}`);
    console.log('Routes:');
    allRoutesResponse.data.data.forEach((route, index) => {
      console.log(`  ${index + 1}. ${route.routeNumber} - ${route.routeName}`);
    });

    // Test 2: Get specific route by route number
    console.log('\n📋 Test 2: Get Route by Route Number (138)');
    console.log('-'.repeat(50));
    const routeByNumber = await axios.get(`${BASE_URL}/138`);
    console.log(`✅ Status: ${routeByNumber.status}`);
    const route = routeByNumber.data.data;
    console.log(`Route: ${route.routeNumber} - ${route.routeName}`);
    console.log(`Start: ${route.startPoint.name}`);
    console.log(`End: ${route.endPoint.name}`);
    console.log(`Distance: ${route.distance}km`);
    console.log(`Duration: ${route.estimatedDuration} minutes`);
    console.log(`Stops: ${route.stops.length}`);
    console.log(`Path Coordinates: ${route.path.coordinates.length} points`);

    // Test 3: Get active routes only
    console.log('\n📋 Test 3: Get Active Routes Only');
    console.log('-'.repeat(50));
    const activeRoutes = await axios.get(`${BASE_URL}?active=true`);
    console.log(`✅ Status: ${activeRoutes.status}`);
    console.log(`✅ Active Routes: ${activeRoutes.data.count}`);

    // Test 4: Get route statistics
    console.log('\n📋 Test 4: Get Route Statistics');
    console.log('-'.repeat(50));
    const stats = await axios.get(`${BASE_URL}/stats/summary`);
    console.log(`✅ Status: ${stats.status}`);
    console.log('Statistics:');
    console.log(`  Total Routes: ${stats.data.data.totalRoutes}`);
    console.log(`  Active Routes: ${stats.data.data.activeRoutes}`);
    console.log(`  Inactive Routes: ${stats.data.data.inactiveRoutes}`);
    console.log(`  Average Distance: ${stats.data.data.averageDistance.toFixed(2)}km`);
    console.log(`  Average Duration: ${stats.data.data.averageDuration.toFixed(2)} minutes`);

    // Test 5: Display route with coordinates
    console.log('\n📋 Test 5: Route 177 Path Coordinates');
    console.log('-'.repeat(50));
    const route177 = await axios.get(`${BASE_URL}/177`);
    const route177Data = route177.data.data;
    console.log(`Route: ${route177Data.routeNumber} - ${route177Data.routeName}`);
    console.log('Start Point:', route177Data.startPoint.location.coordinates);
    console.log('End Point:', route177Data.endPoint.location.coordinates);
    console.log('\nPath Coordinates:');
    route177Data.path.coordinates.forEach((coord, index) => {
      console.log(`  ${index + 1}. [${coord[0]}, ${coord[1]}]`);
    });
    
    console.log('\nStops:');
    route177Data.stops.forEach((stop, index) => {
      console.log(`  ${index + 1}. ${stop.name}`);
      console.log(`     Location: [${stop.location.coordinates[0]}, ${stop.location.coordinates[1]}]`);
      console.log(`     Time from start: ${stop.estimatedTime} minutes`);
    });

    console.log('\n' + '='.repeat(50));
    console.log('✅ All API tests completed successfully!');
    console.log('='.repeat(50));

  } catch (error) {
    console.error('\n❌ Error testing API:', error.message);
    if (error.response) {
      console.error('Response Status:', error.response.status);
      console.error('Response Data:', error.response.data);
    } else {
      console.error('Make sure the backend server is running on port 5001');
    }
  }
}

// Run tests
testRouteAPI();
