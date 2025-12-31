const { gpsService } = require('../services/gpsService');

/**
 * GPS Controller
 * Handles all GPS-related HTTP requests and responses
 * Follows existing Express.js controller patterns
 */

// ==================== DRIVER AUTHENTICATION ENDPOINTS ====================

/**
 * Register a new driver
 * POST /api/gps/driver/register
 */
exports.registerDriver = async (req, res) => {
  try {
    const { name, phone, licenseNumber, busId, routeId, deviceId } = req.body;

    // Validate required fields
    if (!name || !phone || !licenseNumber || !busId || !routeId || !deviceId) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields',
        error: 'All fields (name, phone, licenseNumber, busId, routeId, deviceId) are required'
      });
    }

    // Generate unique driver ID
    const driverId = `driver_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    const driverData = {
      driverId,
      name,
      phone,
      licenseNumber,
      busId,
      routeId,
      deviceId
    };

    const registeredDriverId = gpsService.registerDriver(driverData);

    res.status(201).json({
      success: true,
      data: {
        driverId: registeredDriverId,
        name,
        phone,
        licenseNumber,
        busId,
        routeId,
        deviceId,
        isActive: false
      },
      message: 'Driver registered successfully'
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error registering driver',
      error: error.message
    });
  }
};

/**
 * Authenticate driver login
 * POST /api/gps/driver/login
 */
exports.loginDriver = async (req, res) => {
  try {
    const { phone, deviceId } = req.body;

    // Validate required fields
    if (!phone || !deviceId) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields',
        error: 'Phone and deviceId are required'
      });
    }

    const driver = gpsService.authenticateDriver(phone, deviceId);

    if (!driver) {
      return res.status(401).json({
        success: false,
        message: 'Authentication failed',
        error: 'Invalid phone number or device ID'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        driverId: driver.driverId,
        name: driver.name,
        phone: driver.phone,
        licenseNumber: driver.licenseNumber,
        busId: driver.busId,
        routeId: driver.routeId,
        deviceId: driver.deviceId,
        isActive: driver.isActive,
        lastSeen: driver.lastSeen
      },
      message: 'Authentication successful'
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error during authentication',
      error: error.message
    });
  }
};

// ==================== LOCATION TRACKING ENDPOINTS ====================

/**
 * Update driver location
 * POST /api/gps/driver/location
 */
exports.updateLocation = async (req, res) => {
  try {
    const { driverId, busId, routeId, latitude, longitude, heading, speed, accuracy, status } = req.body;

    // Validate required fields
    if (!driverId || !busId || !routeId || latitude === undefined || longitude === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields',
        error: 'driverId, busId, routeId, latitude, and longitude are required'
      });
    }

    // Validate location data using GPS service validation
    const locationData = { latitude, longitude, accuracy: accuracy || 0 };
    if (!gpsService.constructor.validateLocation(locationData)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid location data',
        error: 'GPS coordinates must be valid (latitude: -90 to 90, longitude: -180 to 180, accuracy >= 0)'
      });
    }

    const fullLocationData = {
      busId,
      routeId,
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      heading: heading || 0,
      speed: speed || 0,
      accuracy: accuracy || 0,
      status: status || 'active'
    };

    const success = gpsService.updateLocation(driverId, fullLocationData);

    if (!success) {
      return res.status(404).json({
        success: false,
        message: 'Driver not found',
        error: 'No driver found with the provided driverId'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        driverId,
        ...fullLocationData,
        timestamp: Date.now()
      },
      message: 'Location updated successfully'
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating location',
      error: error.message
    });
  }
};

/**
 * Get specific driver location
 * GET /api/gps/driver/location/:driverId
 */
exports.getDriverLocation = async (req, res) => {
  try {
    const { driverId } = req.params;

    if (!driverId) {
      return res.status(400).json({
        success: false,
        message: 'Missing driver ID',
        error: 'Driver ID is required'
      });
    }

    const location = gpsService.getDriverLocation(driverId);

    if (!location) {
      return res.status(404).json({
        success: false,
        message: 'Driver location not found',
        error: 'No location data found for the specified driver'
      });
    }

    res.status(200).json({
      success: true,
      data: location,
      message: 'Driver location retrieved successfully'
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error retrieving driver location',
      error: error.message
    });
  }
};

// ==================== PASSENGER ENDPOINTS ====================

/**
 * Get all live bus locations
 * GET /api/gps/buses/live
 */
exports.getLiveBuses = async (req, res) => {
  try {
    const activeBuses = gpsService.getActiveBusLocations();

    res.status(200).json({
      success: true,
      count: activeBuses.length,
      data: activeBuses,
      message: 'Live bus locations retrieved successfully'
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error retrieving live bus locations',
      error: error.message
    });
  }
};

/**
 * Get specific bus location by bus ID
 * GET /api/gps/bus/:busId/location
 */
exports.getBusLocation = async (req, res) => {
  try {
    const { busId } = req.params;

    if (!busId) {
      return res.status(400).json({
        success: false,
        message: 'Missing bus ID',
        error: 'Bus ID is required'
      });
    }

    const driver = gpsService.getDriverByBusId(busId);

    if (!driver) {
      return res.status(404).json({
        success: false,
        message: 'Bus not found',
        error: 'No bus found with the specified ID'
      });
    }

    // Check if driver is online (updated within 2 minutes)
    const now = Date.now();
    const isOnline = (now - driver.lastSeen) < 120000;

    if (!isOnline || !driver.currentLocation) {
      return res.status(404).json({
        success: false,
        message: 'Bus is offline',
        error: 'Bus is currently not providing location updates'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        ...driver.currentLocation,
        isOnline: true,
        lastSeen: driver.lastSeen
      },
      message: 'Bus location retrieved successfully'
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error retrieving bus location',
      error: error.message
    });
  }
};

/**
 * Get bus location history
 * GET /api/gps/bus/:busId/history?limit=50
 */
exports.getBusHistory = async (req, res) => {
  try {
    const { busId } = req.params;
    const limit = parseInt(req.query.limit) || 50;

    if (!busId) {
      return res.status(400).json({
        success: false,
        message: 'Missing bus ID',
        error: 'Bus ID is required'
      });
    }

    const driver = gpsService.getDriverByBusId(busId);

    if (!driver) {
      return res.status(404).json({
        success: false,
        message: 'Bus not found',
        error: 'No bus found with the specified ID'
      });
    }

    const history = gpsService.getLocationHistory(driver.driverId, limit);

    res.status(200).json({
      success: true,
      count: history.length,
      data: history,
      message: 'Bus location history retrieved successfully'
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error retrieving bus history',
      error: error.message
    });
  }
};

// ==================== ADMIN ENDPOINTS ====================

/**
 * Get all registered drivers (admin)
 * GET /api/gps/admin/drivers
 */
exports.getAllDrivers = async (req, res) => {
  try {
    const drivers = gpsService.getAllDrivers();

    // Add online status to each driver
    const now = Date.now();
    const driversWithStatus = drivers.map(driver => ({
      ...driver,
      isOnline: (now - driver.lastSeen) < 120000
    }));

    res.status(200).json({
      success: true,
      count: drivers.length,
      data: driversWithStatus,
      message: 'All drivers retrieved successfully'
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error retrieving drivers',
      error: error.message
    });
  }
};

/**
 * Remove driver (admin)
 * DELETE /api/gps/admin/driver/:driverId
 */
exports.removeDriver = async (req, res) => {
  try {
    const { driverId } = req.params;

    if (!driverId) {
      return res.status(400).json({
        success: false,
        message: 'Missing driver ID',
        error: 'Driver ID is required'
      });
    }

    const removed = gpsService.removeDriver(driverId);

    if (!removed) {
      return res.status(404).json({
        success: false,
        message: 'Driver not found',
        error: 'No driver found with the specified ID'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Driver removed successfully'
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error removing driver',
      error: error.message
    });
  }
};

/**
 * Get driver statistics (admin)
 * GET /api/gps/admin/stats
 */
exports.getDriverStats = async (req, res) => {
  try {
    const allDrivers = gpsService.getAllDrivers();
    const now = Date.now();
    
    const activeCount = allDrivers.filter(driver => 
      driver.isActive && (now - driver.lastSeen) < 120000
    ).length;

    res.status(200).json({
      success: true,
      data: {
        totalDrivers: allDrivers.length,
        activeDrivers: activeCount,
        offlineDrivers: allDrivers.length - activeCount
      },
      message: 'Driver statistics retrieved successfully'
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error retrieving driver statistics',
      error: error.message
    });
  }
};