# Bus Route Management System

## Overview
A complete bus route management system with MongoDB model, REST API endpoints, and sample route data with GPS coordinates.

## Database Model

### BusRoute Schema
Location: `/BusTracking-Backend/models/BusRoute.js`

**Fields:**
- `routeId` - Unique route identifier (String, unique, indexed)
- `routeNumber` - Bus route number (String, indexed)
- `routeName` - Full route name (String)
- `startPoint` - Start location with name and GeoJSON Point coordinates
- `endPoint` - End location with name and GeoJSON Point coordinates
- `path` - GeoJSON LineString with all path coordinates
- `stops[]` - Array of bus stops with:
  - `stopId` - Unique stop identifier
  - `name` - Stop name
  - `location` - GeoJSON Point coordinates
  - `order` - Stop sequence number
  - `estimatedTime` - Minutes from start point
- `distance` - Total route distance in kilometers
- `estimatedDuration` - Total travel time in minutes
- `operatingHours` - Start and end times (e.g., "05:00", "23:00")
- `frequency` - Minutes between buses
- `fare` - Base fare in local currency
- `color` - Hex color for map display (e.g., "#3B82F6")
- `isActive` - Route active status (Boolean, indexed)
- `description` - Route description
- `direction` - Route direction: 'forward', 'reverse', or 'circular'

**Indexes:**
- Geospatial 2dsphere indexes on: startPoint, endPoint, path, stops
- Compound indexes on: routeNumber + isActive

## API Endpoints

### Base URL
```
http://localhost:5001/api/routes
```

### Public Endpoints

#### 1. Get All Routes
```
GET /api/routes
Query Parameters:
  - active (optional): true/false - Filter by active status
  - routeNumber (optional): string - Filter by route number

Response:
{
  "success": true,
  "count": 5,
  "data": [...routes],
  "message": "Routes retrieved successfully"
}
```

#### 2. Get Route by ID or Number
```
GET /api/routes/:identifier

Example: GET /api/routes/138
         GET /api/routes/route_138

Response:
{
  "success": true,
  "data": {...route},
  "message": "Route retrieved successfully"
}
```

#### 3. Get Nearby Routes
```
GET /api/routes/search/nearby
Query Parameters:
  - lat (required): number - Latitude
  - lng (required): number - Longitude
  - maxDistance (optional): number - Max distance in meters (default: 5000)

Example: GET /api/routes/search/nearby?lat=6.9271&lng=79.8612&maxDistance=10000

Response:
{
  "success": true,
  "count": 3,
  "data": [...routes],
  "message": "Nearby routes retrieved successfully"
}
```

#### 4. Get Route Statistics
```
GET /api/routes/stats/summary

Response:
{
  "success": true,
  "data": {
    "totalRoutes": 5,
    "activeRoutes": 5,
    "inactiveRoutes": 0,
    "averageDistance": 95.4,
    "averageDuration": 148
  },
  "message": "Route statistics retrieved successfully"
}
```

### Admin Endpoints

#### 5. Create New Route
```
POST /api/routes
Body: {
  "routeId": "route_999",
  "routeNumber": "999",
  "routeName": "Route Name",
  "startPoint": {
    "name": "Start Location",
    "location": {
      "type": "Point",
      "coordinates": [longitude, latitude]
    }
  },
  "endPoint": {...},
  "path": {
    "type": "LineString",
    "coordinates": [[lon1, lat1], [lon2, lat2], ...]
  },
  "stops": [...],
  "distance": 50,
  "estimatedDuration": 90,
  ...
}

Response:
{
  "success": true,
  "data": {...route},
  "message": "Route created successfully"
}
```

#### 6. Update Route
```
PUT /api/routes/:identifier
Body: {...fields to update}

Response:
{
  "success": true,
  "data": {...updated route},
  "message": "Route updated successfully"
}
```

#### 7. Delete Route
```
DELETE /api/routes/:identifier

Response:
{
  "success": true,
  "data": {...deleted route},
  "message": "Route deleted successfully"
}
```

#### 8. Seed Sample Routes
```
POST /api/routes/seed/sample

Response:
{
  "success": true,
  "count": 5,
  "data": [...created routes],
  "message": "Sample routes created successfully"
}
```

## Sample Routes Data

### Routes Included:
1. **Route 138**: Colombo - Kandy (115km, 180min, 10 coordinates)
2. **Route 177**: Colombo - Galle (119km, 150min, 10 coordinates)
3. **Route 245**: Colombo - Negombo (38km, 90min, 10 coordinates)
4. **Route 120**: Colombo - Matara (160km, 200min, 11 coordinates)
5. **Route 350**: Kadawatha - Maharagama Circular (45km, 120min, 11 coordinates)

Each route includes:
- Complete path with GPS coordinates
- Multiple stops with estimated times
- Operating hours and frequency
- Distance and duration
- Color coding for map display

## Setup Instructions

### 1. Seed Routes to Database
```bash
cd BusTracking-Backend
npm run seed-routes
```

To force re-seed (delete existing routes):
```bash
npm run seed-routes -- --force
```

### 2. Start Backend Server
```bash
cd BusTracking-Backend
npm start
```

### 3. Test API Endpoints
```bash
cd BusTracking-Backend
node test-routes-api.js
```

## Integration with Frontend

### Fetching Routes in React Native
```typescript
import apiClient from '@/lib/api/client';

// Get all routes
const routes = await apiClient.get('/routes');

// Get specific route
const route = await apiClient.get('/routes/138');

// Get nearby routes
const nearbyRoutes = await apiClient.get(
  '/routes/search/nearby?lat=6.9271&lng=79.8612&maxDistance=5000'
);
```

### Displaying Routes on Map
```typescript
// Use path coordinates to draw polyline
const routePath = route.path.coordinates.map(coord => ({
  latitude: coord[1],
  longitude: coord[0]
}));

// Display stops as markers
const stops = route.stops.map(stop => ({
  latitude: stop.location.coordinates[1],
  longitude: stop.location.coordinates[0],
  title: stop.name
}));
```

## Files Created

1. **Model**: `/BusTracking-Backend/models/BusRoute.js`
   - Complete MongoDB schema with geospatial indexes

2. **Controller**: `/BusTracking-Backend/controllers/routeController.js`
   - All CRUD operations and specialized queries

3. **Routes**: `/BusTracking-Backend/routes/routeRoutes.js`
   - Express router with all endpoints

4. **Seed Script**: `/BusTracking-Backend/seed-routes.js`
   - Standalone script to populate database with sample data

5. **Test Script**: `/BusTracking-Backend/test-routes-api.js`
   - API endpoint testing with detailed output

6. **Integration**: Updated `/BusTracking-Backend/app.js`
   - Added route routes to Express app

## Coordinate Format

All coordinates use GeoJSON format:
- **Point**: `[longitude, latitude]`
- **LineString**: `[[lon1, lat1], [lon2, lat2], ...]`

**Important**: Longitude comes first, then latitude (opposite of common usage)

## Testing Results

✅ All 5 routes successfully created
✅ API endpoints tested and working
✅ Geospatial queries functional
✅ Statistics calculation correct
✅ Route retrieval by ID/number working
✅ Active/inactive filtering working

## Next Steps

1. **Frontend Integration**: Update passenger route selection screen to fetch from API
2. **Map Display**: Implement polyline drawing for route paths
3. **Stop Management**: Add stop markers on map with estimated times
4. **Real-time Updates**: Connect buses to routes for live tracking
5. **Route Planning**: Add algorithms for best route suggestions
