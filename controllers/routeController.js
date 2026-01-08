const BusRoute = require('../models/BusRoute');

/**
 * Route Controller
 * Handles all bus route-related HTTP requests
 */

/**
 * Get all bus routes
 * GET /api/routes
 */
exports.getAllRoutes = async (req, res) => {
  try {
    const { active, routeNumber } = req.query;
    
    const filter = {};
    if (active !== undefined) {
      filter.isActive = active === 'true';
    }
    if (routeNumber) {
      filter.routeNumber = routeNumber;
    }

    const routes = await BusRoute.find(filter).sort({ routeNumber: 1 });

    res.status(200).json({
      success: true,
      count: routes.length,
      data: routes,
      message: 'Routes retrieved successfully'
    });
  } catch (error) {
    console.error('Error getting routes:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving routes',
      error: error.message
    });
  }
};

/**
 * Get route by ID or route number
 * GET /api/routes/:identifier
 */
exports.getRouteById = async (req, res) => {
  try {
    const { identifier } = req.params;

    // Try to find by routeId first, then by routeNumber
    let route = await BusRoute.findOne({ routeId: identifier });
    if (!route) {
      route = await BusRoute.findOne({ routeNumber: identifier });
    }

    if (!route) {
      return res.status(404).json({
        success: false,
        message: 'Route not found',
        error: `No route found with identifier: ${identifier}`
      });
    }

    res.status(200).json({
      success: true,
      data: route,
      message: 'Route retrieved successfully'
    });
  } catch (error) {
    console.error('Error getting route:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving route',
      error: error.message
    });
  }
};

/**
 * Create new bus route
 * POST /api/routes
 */
exports.createRoute = async (req, res) => {
  try {
    const routeData = req.body;

    // Validate required fields
    if (!routeData.routeId || !routeData.routeNumber || !routeData.routeName) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields',
        error: 'routeId, routeNumber, and routeName are required'
      });
    }

    // Check if route already exists
    const existingRoute = await BusRoute.findOne({
      $or: [
        { routeId: routeData.routeId },
        { routeNumber: routeData.routeNumber }
      ]
    });

    if (existingRoute) {
      return res.status(409).json({
        success: false,
        message: 'Route already exists',
        error: 'A route with this ID or number already exists'
      });
    }

    const route = new BusRoute(routeData);
    await route.save();

    res.status(201).json({
      success: true,
      data: route,
      message: 'Route created successfully'
    });
  } catch (error) {
    console.error('Error creating route:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating route',
      error: error.message
    });
  }
};

/**
 * Update bus route
 * PUT /api/routes/:identifier
 */
exports.updateRoute = async (req, res) => {
  try {
    const { identifier } = req.params;
    const updateData = req.body;

    // Find route by routeId or routeNumber
    let route = await BusRoute.findOne({ routeId: identifier });
    if (!route) {
      route = await BusRoute.findOne({ routeNumber: identifier });
    }

    if (!route) {
      return res.status(404).json({
        success: false,
        message: 'Route not found',
        error: `No route found with identifier: ${identifier}`
      });
    }

    // Update route
    Object.keys(updateData).forEach(key => {
      if (key !== '_id' && key !== 'routeId') {
        route[key] = updateData[key];
      }
    });

    await route.save();

    res.status(200).json({
      success: true,
      data: route,
      message: 'Route updated successfully'
    });
  } catch (error) {
    console.error('Error updating route:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating route',
      error: error.message
    });
  }
};

/**
 * Delete bus route
 * DELETE /api/routes/:identifier
 */
exports.deleteRoute = async (req, res) => {
  try {
    const { identifier } = req.params;

    // Find and delete route
    let route = await BusRoute.findOneAndDelete({ routeId: identifier });
    if (!route) {
      route = await BusRoute.findOneAndDelete({ routeNumber: identifier });
    }

    if (!route) {
      return res.status(404).json({
        success: false,
        message: 'Route not found',
        error: `No route found with identifier: ${identifier}`
      });
    }

    res.status(200).json({
      success: true,
      data: route,
      message: 'Route deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting route:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting route',
      error: error.message
    });
  }
};

/**
 * Get routes near a location
 * GET /api/routes/nearby?lat=6.9271&lng=79.8612&maxDistance=5000
 */
exports.getNearbyRoutes = async (req, res) => {
  try {
    const { lat, lng, maxDistance = 5000 } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({
        success: false,
        message: 'Missing required parameters',
        error: 'lat and lng are required'
      });
    }

    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);
    const distance = parseInt(maxDistance);

    const routes = await BusRoute.find({
      isActive: true,
      $or: [
        {
          'path': {
            $near: {
              $geometry: {
                type: 'Point',
                coordinates: [longitude, latitude]
              },
              $maxDistance: distance
            }
          }
        },
        {
          'stops.location': {
            $near: {
              $geometry: {
                type: 'Point',
                coordinates: [longitude, latitude]
              },
              $maxDistance: distance
            }
          }
        }
      ]
    }).limit(20);

    res.status(200).json({
      success: true,
      count: routes.length,
      data: routes,
      message: 'Nearby routes retrieved successfully'
    });
  } catch (error) {
    console.error('Error getting nearby routes:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving nearby routes',
      error: error.message
    });
  }
};

/**
 * Get route statistics
 * GET /api/routes/stats
 */
exports.getRouteStats = async (req, res) => {
  try {
    const totalRoutes = await BusRoute.countDocuments();
    const activeRoutes = await BusRoute.countDocuments({ isActive: true });
    const inactiveRoutes = totalRoutes - activeRoutes;

    const avgDistance = await BusRoute.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: null, avgDistance: { $avg: '$distance' } } }
    ]);

    const avgDuration = await BusRoute.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: null, avgDuration: { $avg: '$estimatedDuration' } } }
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalRoutes,
        activeRoutes,
        inactiveRoutes,
        averageDistance: avgDistance[0]?.avgDistance || 0,
        averageDuration: avgDuration[0]?.avgDuration || 0
      },
      message: 'Route statistics retrieved successfully'
    });
  } catch (error) {
    console.error('Error getting route stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving route statistics',
      error: error.message
    });
  }
};

/**
 * Seed sample routes (for testing/development)
 * POST /api/routes/seed
 */
exports.seedSampleRoutes = async (req, res) => {
  try {
    // Check if routes already exist
    const existingCount = await BusRoute.countDocuments();
    if (existingCount > 0) {
      return res.status(400).json({
        success: false,
        message: 'Routes already exist',
        error: 'Database already contains routes. Clear the collection first to re-seed.'
      });
    }

    const sampleRoutes = [
      {
        routeId: 'route_138',
        routeNumber: '138',
        routeName: 'Colombo - Kandy',
        startPoint: {
          name: 'Colombo Fort',
          location: {
            type: 'Point',
            coordinates: [79.8612, 6.9271]
          }
        },
        endPoint: {
          name: 'Kandy Central',
          location: {
            type: 'Point',
            coordinates: [80.6350, 7.2906]
          }
        },
        path: {
          type: 'LineString',
          coordinates: [
            [79.8612, 6.9271], // Colombo Fort
            [79.8650, 6.9300], // Pettah
            [79.8700, 6.9350], // Maradana
            [79.8750, 6.9400], // Dematagoda
            [79.8800, 6.9450], // Orugodawatta
            [79.9200, 6.9800], // Kadawatha
            [79.9800, 7.0500], // Gampaha
            [80.2200, 7.1600], // Mawanella
            [80.4500, 7.2300], // Kegalle
            [80.6350, 7.2906]  // Kandy
          ]
        },
        stops: [
          {
            stopId: 'stop_138_1',
            name: 'Colombo Fort',
            location: { type: 'Point', coordinates: [79.8612, 6.9271] },
            order: 1,
            estimatedTime: 0
          },
          {
            stopId: 'stop_138_2',
            name: 'Pettah Central',
            location: { type: 'Point', coordinates: [79.8650, 6.9300] },
            order: 2,
            estimatedTime: 10
          },
          {
            stopId: 'stop_138_3',
            name: 'Maradana',
            location: { type: 'Point', coordinates: [79.8700, 6.9350] },
            order: 3,
            estimatedTime: 15
          },
          {
            stopId: 'stop_138_4',
            name: 'Kadawatha',
            location: { type: 'Point', coordinates: [79.9200, 6.9800] },
            order: 4,
            estimatedTime: 35
          },
          {
            stopId: 'stop_138_5',
            name: 'Gampaha',
            location: { type: 'Point', coordinates: [79.9800, 7.0500] },
            order: 5,
            estimatedTime: 60
          },
          {
            stopId: 'stop_138_6',
            name: 'Kandy Central',
            location: { type: 'Point', coordinates: [80.6350, 7.2906] },
            order: 6,
            estimatedTime: 180
          }
        ],
        distance: 115,
        estimatedDuration: 180,
        operatingHours: { start: '05:00', end: '22:00' },
        frequency: 30,
        fare: 250,
        color: '#3B82F6',
        isActive: true,
        description: 'Main route connecting Colombo to Kandy via Gampaha'
      },
      {
        routeId: 'route_177',
        routeNumber: '177',
        routeName: 'Colombo - Galle',
        startPoint: {
          name: 'Colombo Central',
          location: {
            type: 'Point',
            coordinates: [79.8428, 6.9344]
          }
        },
        endPoint: {
          name: 'Galle Fort',
          location: {
            type: 'Point',
            coordinates: [80.2170, 6.0367]
          }
        },
        path: {
          type: 'LineString',
          coordinates: [
            [79.8428, 6.9344], // Colombo Central
            [79.8400, 6.9300], // Bambalapitiya
            [79.8350, 6.9250], // Wellawatte
            [79.8300, 6.9200], // Dehiwala
            [79.8250, 6.9150], // Mount Lavinia
            [79.8900, 6.7900], // Panadura
            [79.9800, 6.5600], // Kalutara
            [80.0500, 6.3500], // Aluthgama
            [80.1200, 6.2000], // Hikkaduwa
            [80.2170, 6.0367]  // Galle
          ]
        },
        stops: [
          {
            stopId: 'stop_177_1',
            name: 'Colombo Central',
            location: { type: 'Point', coordinates: [79.8428, 6.9344] },
            order: 1,
            estimatedTime: 0
          },
          {
            stopId: 'stop_177_2',
            name: 'Bambalapitiya',
            location: { type: 'Point', coordinates: [79.8400, 6.9300] },
            order: 2,
            estimatedTime: 8
          },
          {
            stopId: 'stop_177_3',
            name: 'Mount Lavinia',
            location: { type: 'Point', coordinates: [79.8250, 6.9150] },
            order: 3,
            estimatedTime: 25
          },
          {
            stopId: 'stop_177_4',
            name: 'Panadura',
            location: { type: 'Point', coordinates: [79.8900, 6.7900] },
            order: 4,
            estimatedTime: 50
          },
          {
            stopId: 'stop_177_5',
            name: 'Kalutara',
            location: { type: 'Point', coordinates: [79.9800, 6.5600] },
            order: 5,
            estimatedTime: 80
          },
          {
            stopId: 'stop_177_6',
            name: 'Galle Fort',
            location: { type: 'Point', coordinates: [80.2170, 6.0367] },
            order: 6,
            estimatedTime: 150
          }
        ],
        distance: 119,
        estimatedDuration: 150,
        operatingHours: { start: '04:30', end: '23:00' },
        frequency: 20,
        fare: 280,
        color: '#10B981',
        isActive: true,
        description: 'Coastal route from Colombo to Galle along Galle Road'
      },
      {
        routeId: 'route_245',
        routeNumber: '245',
        routeName: 'Colombo - Negombo',
        startPoint: {
          name: 'Colombo Pettah',
          location: {
            type: 'Point',
            coordinates: [79.8730, 6.9147]
          }
        },
        endPoint: {
          name: 'Negombo Town',
          location: {
            type: 'Point',
            coordinates: [79.8358, 7.2083]
          }
        },
        path: {
          type: 'LineString',
          coordinates: [
            [79.8730, 6.9147], // Colombo Pettah
            [79.8760, 6.9180], // Kotahena
            [79.8800, 6.9220], // Grandpass
            [79.8840, 6.9260], // Peliyagoda
            [79.8880, 6.9300], // Kelaniya
            [79.9100, 6.9650], // Wattala
            [79.9200, 7.0100], // Ja-Ela
            [79.8900, 7.0800], // Katunayake
            [79.8500, 7.1500], // Seeduwa
            [79.8358, 7.2083]  // Negombo
          ]
        },
        stops: [
          {
            stopId: 'stop_245_1',
            name: 'Colombo Pettah',
            location: { type: 'Point', coordinates: [79.8730, 6.9147] },
            order: 1,
            estimatedTime: 0
          },
          {
            stopId: 'stop_245_2',
            name: 'Kelaniya',
            location: { type: 'Point', coordinates: [79.8880, 6.9300] },
            order: 2,
            estimatedTime: 20
          },
          {
            stopId: 'stop_245_3',
            name: 'Wattala',
            location: { type: 'Point', coordinates: [79.9100, 6.9650] },
            order: 3,
            estimatedTime: 35
          },
          {
            stopId: 'stop_245_4',
            name: 'Ja-Ela',
            location: { type: 'Point', coordinates: [79.9200, 7.0100] },
            order: 4,
            estimatedTime: 50
          },
          {
            stopId: 'stop_245_5',
            name: 'Katunayake',
            location: { type: 'Point', coordinates: [79.8900, 7.0800] },
            order: 5,
            estimatedTime: 70
          },
          {
            stopId: 'stop_245_6',
            name: 'Negombo Town',
            location: { type: 'Point', coordinates: [79.8358, 7.2083] },
            order: 6,
            estimatedTime: 90
          }
        ],
        distance: 38,
        estimatedDuration: 90,
        operatingHours: { start: '05:00', end: '22:30' },
        frequency: 15,
        fare: 120,
        color: '#F59E0B',
        isActive: true,
        description: 'Route from Colombo to Negombo via Katunayake Airport'
      }
    ];

    const createdRoutes = await BusRoute.insertMany(sampleRoutes);

    res.status(201).json({
      success: true,
      count: createdRoutes.length,
      data: createdRoutes,
      message: 'Sample routes created successfully'
    });
  } catch (error) {
    console.error('Error seeding routes:', error);
    res.status(500).json({
      success: false,
      message: 'Error seeding sample routes',
      error: error.message
    });
  }
};
