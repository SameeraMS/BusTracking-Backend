const { gpsService } = require('../services/gpsService');
const { gpsProcessingService } = require('../services/gpsProcessingService');

/**
 * GPS Controller
 * Handles all GPS-related HTTP requests and responses
 * Follows existing Express.js controller patterns
 */

// ==================== DRIVER AUTHENTICATION ENDPOINTS ====================

/**
 * Register a new driver with MongoDB integration
 * POST /api/gps/driver/register
 */
exports.registerDriver = async (req, res) => {
  try {
    const { name, phone, licenseNumber, busId, routeId, email, password } = req.body;

    console.log('Received driver registration request:', req.body);

    // Validate required fields - now including email and password
    if (!name || !phone || !licenseNumber || !busId || !routeId || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields',
        error: 'All fields (name, phone, licenseNumber, busId, routeId, email, password) are required'
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email format',
        error: 'Please provide a valid email address'
      });
    }

    // Validate password strength
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password too weak',
        error: 'Password must be at least 6 characters long'
      });
    }

    // Generate unique driver ID and device ID
    const driverId = `driver_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const deviceId = `device_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    const driverData = {
      driverId,
      name,
      phone,
      licenseNumber,
      busId,
      routeId,
      deviceId // Include the generated deviceId
    };

    console.log('Registering driver with data:', driverData);

    // Register in legacy GPS service
    const registeredDriverId = gpsService.registerDriver(driverData);

    // Always create in MongoDB Driver model
    let mongoDriver = null;
    try {
      const Driver = require('../models/Driver');
      
      // Check if driver already exists by phone or email
      const existingDriver = await Driver.findOne({ 
        $or: [
          { telephone: phone },
          { email: email.toLowerCase() }
        ]
      });
      
      if (existingDriver) {
        return res.status(409).json({
          success: false,
          message: 'Driver already exists',
          error: 'A driver with this phone number or email already exists'
        });
      }

      // Create MongoDB driver record with real email and password
      mongoDriver = new Driver({
        name,
        email: email.toLowerCase(),
        password: password, // Will be hashed by the model's pre-save hook
        route: routeId,
        nic: licenseNumber,
        telephone: phone,
        vehicleNumber: busId,
        deviceId: deviceId // Store the generated deviceId
      });
      
      await mongoDriver.save();
      console.log('Created MongoDB driver record:', mongoDriver._id);
      
    } catch (mongoError) {
      console.error('Error creating MongoDB driver:', mongoError);
      
      // If MongoDB save fails, remove from legacy service and return error
      gpsService.removeDriver(registeredDriverId);
      
      return res.status(500).json({
        success: false,
        message: 'Failed to save driver to database',
        error: mongoError.message
      });
    }

    // Return response with deviceId included
    res.status(201).json({
      success: true,
      data: {
        driverId: registeredDriverId,
        name,
        phone,
        email: mongoDriver.email,
        licenseNumber,
        busId,
        routeId,
        deviceId, // Include deviceId in the response
        isActive: false,
        mongoId: mongoDriver._id
      },
      message: 'Driver registered successfully'
    });

  } catch (error) {
    console.error('Driver registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Error registering driver',
      error: error.message
    });
  }
};

/**
 * Authenticate driver login with email-only authentication
 * POST /api/gps/driver/login
 */
exports.loginDriver = async (req, res) => {
  try {
    const { email, password, deviceId } = req.body;

    // Validate required fields - email only authentication
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields',
        error: 'Email and password are required'
      });
    }

    // Use provided deviceId or generate one
    const actualDeviceId = deviceId || `device_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    let driverSession = null;
    let mongoDriver = null;

    // MongoDB authentication using email only
    try {
      const Driver = require('../models/Driver');
      mongoDriver = await Driver.findOne({ email: email.toLowerCase() });
      
      console.log('MongoDB login attempt:', { email: email.toLowerCase(), found: !!mongoDriver });
      
      if (!mongoDriver) {
        return res.status(401).json({
          success: false,
          message: 'Authentication failed',
          error: 'Invalid email or password'
        });
      }

      const passwordMatch = await mongoDriver.comparePassword(password);
      console.log('Password comparison result:', passwordMatch);
      
      if (!passwordMatch) {
        return res.status(401).json({
          success: false,
          message: 'Authentication failed',
          error: 'Invalid email or password'
        });
      }

      // Create or find corresponding legacy driver
      let legacyDriver = null;
      for (const d of gpsService.drivers.values()) {
        if (d.phone === mongoDriver.telephone || d.name === mongoDriver.name) {
          legacyDriver = d;
          break;
        }
      }
      
      // If no legacy driver exists, create one from MongoDB data
      if (!legacyDriver) {
        const driverId = `driver_mongo_${mongoDriver._id}`;
        const driverData = {
          driverId,
          name: mongoDriver.name,
          email: mongoDriver.email, // Include email in legacy driver
          phone: mongoDriver.telephone,
          licenseNumber: mongoDriver.nic,
          busId: mongoDriver.vehicleNumber,
          routeId: mongoDriver.route,
          deviceId: actualDeviceId
        };
        gpsService.registerDriver(driverData);
        legacyDriver = gpsService.drivers.get(driverId);
        console.log('Created legacy driver from MongoDB:', driverId);
      }
      
      // Update legacy driver's email and deviceId if they don't match
      if (legacyDriver) {
        let updated = false;
        if (!legacyDriver.email) {
          legacyDriver.email = mongoDriver.email;
          updated = true;
        }
        if (legacyDriver.deviceId !== actualDeviceId) {
          legacyDriver.deviceId = actualDeviceId;
          updated = true;
        }
        if (updated) {
          gpsService.drivers.set(legacyDriver.driverId, legacyDriver);
          console.log('Updated legacy driver with email and deviceId:', {
            driverId: legacyDriver.driverId,
            email: legacyDriver.email,
            deviceId: legacyDriver.deviceId
          });
        }
      }
      
      // Create session using legacy driver
      if (legacyDriver) {
        // Don't set driver to online automatically - preserve their database status
        driverSession = gpsService.authenticateDriver(legacyDriver.phone, actualDeviceId, false);
        
        // Update the session's isActive to match MongoDB's isOnline status
        if (driverSession) {
          driverSession.isActive = mongoDriver.isOnline || false;
          // Update legacy driver as well
          legacyDriver.isActive = mongoDriver.isOnline || false;
          gpsService.drivers.set(legacyDriver.driverId, legacyDriver);
        }
        
        console.log('Legacy authentication result:', !!driverSession, 'isActive:', driverSession?.isActive);
      }

    } catch (mongoError) {
      console.error('MongoDB authentication error:', mongoError);
      return res.status(500).json({
        success: false,
        message: 'Database error during authentication',
        error: mongoError.message
      });
    }

    if (!driverSession) {
      return res.status(401).json({
        success: false,
        message: 'Authentication failed',
        error: 'Unable to create driver session'
      });
    }

    // Create session in MongoDB for the processing service
    try {
      const DriverSession = require('../models/DriverSession');
      
      // Check if session already exists
      let mongoSession = await DriverSession.findOne({
        sessionId: driverSession.sessionId
      });
      
      if (!mongoSession) {
        mongoSession = new DriverSession({
          sessionId: driverSession.sessionId,
          driverId: driverSession.driverId,
          busId: driverSession.busId,
          routeId: driverSession.routeId,
          email: mongoDriver.email,
          isActive: true,
          startTime: new Date(driverSession.sessionStartTime),
          lastActivity: new Date(),
          expiresAt: new Date(driverSession.sessionExpiresAt)
        });
        
        await mongoSession.save();
        console.log('Created MongoDB session for driver:', driverSession.driverId);
      }
    } catch (mongoError) {
      console.error('Error creating MongoDB session:', mongoError);
      // Continue with legacy session even if MongoDB session creation fails
    }

    res.status(200).json({
      success: true,
      data: {
        driverId: driverSession.driverId,
        name: driverSession.name,
        email: mongoDriver.email,
        licenseNumber: driverSession.licenseNumber,
        busId: driverSession.busId,
        routeId: driverSession.routeId,
        deviceId: driverSession.deviceId,
        isActive: driverSession.isActive,
        lastSeen: driverSession.lastSeen,
        sessionId: driverSession.sessionId,
        sessionStartTime: driverSession.sessionStartTime,
        sessionExpiresAt: driverSession.sessionExpiresAt,
        mongoId: mongoDriver._id,
        // Driver profile information
        phone: mongoDriver.telephone,
        nic: mongoDriver.nic,
        vehicleNumber: mongoDriver.vehicleNumber,
        route: mongoDriver.route
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
 * Update driver location with enhanced processing service
 * POST /api/gps/driver/location
 */
exports.updateLocation = async (req, res) => {
  try {
    const { driverId, busId, routeId, latitude, longitude, heading, speed, accuracy, status, sessionId } = req.body;

    console.log('Received location update:', { driverId, busId, routeId, latitude, longitude, sessionId });

    // Validate required fields
    if (!driverId || !busId || !routeId || latitude === undefined || longitude === undefined) {
      console.error('Missing required fields in location update:', req.body);
      return res.status(400).json({
        success: false,
        message: 'Missing required fields',
        error: 'driverId, busId, routeId, latitude, and longitude are required',
        received: { driverId, busId, routeId, hasLatitude: latitude !== undefined, hasLongitude: longitude !== undefined }
      });
    }

    // SessionId is now optional - create a temp one if not provided
    const effectiveSessionId = sessionId || `temp_${driverId}_${Date.now()}`;

    const locationData = {
      driverId,
      busId,
      routeId,
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      heading: parseFloat(heading) || 0,
      speed: parseFloat(speed) || 0,
      accuracy: parseFloat(accuracy) || 0,
      status: status || 'active',
      timestamp: new Date()
    };

    console.log('Processing location data:', locationData);

    // Use enhanced GPS processing service (implements requirements 3.1-3.5)
    const result = await gpsProcessingService.processLocationUpdate(locationData, effectiveSessionId);

    if (!result.success) {
      console.error('GPS processing failed:', result.error);
      return res.status(400).json({
        success: false,
        message: result.error || 'Failed to process location update',
        error: result.details || result.error
      });
    }

    console.log('Location processed successfully, updating legacy service');

    // Also update legacy in-memory service for backward compatibility
    const legacySuccess = gpsService.updateLocation(driverId, locationData, effectiveSessionId);

    console.log('Location update successful');

    res.status(200).json({
      success: true,
      data: {
        driverId,
        busId,
        routeId,
        latitude: locationData.latitude,
        longitude: locationData.longitude,
        locationId: result.locationId,
        timestamp: result.timestamp,
        sessionId: effectiveSessionId
      },
      message: 'Location updated successfully'
    });

  } catch (error) {
    console.error('Location update error:', error);
    console.error('Error stack:', error.stack);
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
 * Get all live bus locations using enhanced processing service
 * GET /api/gps/buses/live
 */
exports.getLiveBuses = async (req, res) => {
  try {
    // Use enhanced GPS processing service for real-time data
    const activeLocations = await gpsProcessingService.getActiveLocations();
    
    // Fallback to legacy service if needed
    const legacyBuses = gpsService.getActiveBusLocations();

    res.status(200).json({
      success: true,
      count: activeLocations.length,
      data: activeLocations,
      legacy_count: legacyBuses.length,
      message: 'Live bus locations retrieved successfully'
    });

  } catch (error) {
    console.error('Error retrieving live buses:', error);
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
 * Get all buses on a specific route with their live tracking status
 * GET /api/gps/buses/route/:routeId
 */
exports.getBusesByRoute = async (req, res) => {
  try {
    const { routeId } = req.params;

    if (!routeId) {
      return res.status(400).json({
        success: false,
        message: 'Missing route ID',
        error: 'Route ID is required'
      });
    }

    console.log('Getting buses for route:', routeId);

    // Get active locations from processing service
    const activeLocations = await gpsProcessingService.getActiveLocations();
    
    // Filter by route and include tracking status
    const routeBuses = activeLocations
      .filter(location => location.routeId === routeId)
      .map(location => ({
        busId: location.busId,
        driverId: location.driverId,
        driverName: location.driverName || 'Unknown Driver',
        routeId: location.routeId,
        isTracking: true, // Active locations are being tracked
        lastUpdate: location.timestamp,
        location: {
          type: 'Point',
          coordinates: [location.longitude, location.latitude]
        },
        speed: location.speed || 0,
        heading: location.heading || 0,
        accuracy: location.accuracy || 0
      }));

    // Also check legacy service for additional buses
    const legacyDrivers = gpsService.getDriversByRoute(routeId);
    const now = Date.now();
    
    // Add legacy drivers that are not already in routeBuses
    legacyDrivers.forEach(driver => {
      const existingBus = routeBuses.find(b => b.busId === driver.busId);
      if (!existingBus && driver.currentLocation) {
        const isOnline = (now - driver.lastSeen) < 120000;
        routeBuses.push({
          busId: driver.busId,
          driverId: driver.driverId,
          driverName: driver.name || 'Unknown Driver',
          routeId: driver.routeId,
          isTracking: isOnline && driver.isActive,
          lastUpdate: new Date(driver.lastSeen).toISOString(),
          location: driver.currentLocation ? {
            type: 'Point',
            coordinates: [driver.currentLocation.longitude, driver.currentLocation.latitude]
          } : null,
          speed: driver.currentLocation?.speed || 0,
          heading: driver.currentLocation?.heading || 0,
          accuracy: driver.currentLocation?.accuracy || 0
        });
      }
    });

    console.log(`Found ${routeBuses.length} buses for route ${routeId}`);

    res.status(200).json({
      success: true,
      count: routeBuses.length,
      data: routeBuses,
      message: `Retrieved ${routeBuses.length} buses for route ${routeId}`
    });

  } catch (error) {
    console.error('Error retrieving buses by route:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving buses for route',
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
 * Get all registered drivers from both legacy and MongoDB (admin)
 * GET /api/gps/admin/drivers
 */
exports.getAllDrivers = async (req, res) => {
  try {
    // Get drivers from legacy GPS service
    const legacyDrivers = gpsService.getAllDrivers();

    // Get drivers from MongoDB
    let mongoDrivers = [];
    try {
      const Driver = require('../models/Driver');
      mongoDrivers = await Driver.find({}).select('-password').lean();
    } catch (mongoError) {
      console.error('Error fetching MongoDB drivers:', mongoError);
    }

    // Add online status to legacy drivers
    const now = Date.now();
    const driversWithStatus = legacyDrivers.map(driver => ({
      ...driver,
      isOnline: (now - driver.lastSeen) < 120000,
      source: 'legacy'
    }));

    // Add MongoDB drivers that aren't already in legacy system
    const legacyPhones = new Set(legacyDrivers.map(d => d.phone));
    const additionalMongoDrivers = mongoDrivers
      .filter(mongoDriver => !legacyPhones.has(mongoDriver.telephone))
      .map(mongoDriver => ({
        driverId: `driver_mongo_${mongoDriver._id}`,
        name: mongoDriver.name,
        phone: mongoDriver.telephone,
        email: mongoDriver.email,
        licenseNumber: mongoDriver.nic,
        busId: mongoDriver.vehicleNumber,
        routeId: mongoDriver.route,
        route: mongoDriver.route,
        vehicleNumber: mongoDriver.vehicleNumber,
        deviceId: mongoDriver.deviceId || null,
        isActive: mongoDriver.isOnline || false,
        isOnline: mongoDriver.isOnline || false,
        lastSeen: mongoDriver.lastSeen ? new Date(mongoDriver.lastSeen).getTime() : (mongoDriver.updatedAt ? new Date(mongoDriver.updatedAt).getTime() : Date.now()),
        source: 'mongodb',
        mongoId: mongoDriver._id,
        _id: mongoDriver._id
      }));

    const allDrivers = [...driversWithStatus, ...additionalMongoDrivers];

    res.status(200).json({
      success: true,
      count: allDrivers.length,
      data: allDrivers,
      summary: {
        legacy: legacyDrivers.length,
        mongodb: mongoDrivers.length,
        total: allDrivers.length
      },
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
 * Update driver online/offline status
 * POST /api/gps/driver/status
 */
exports.updateDriverStatus = async (req, res) => {
  try {
    console.log('\n========================================');
    console.log('=== UPDATE DRIVER STATUS REQUEST ===');
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    console.log('========================================\n');
    
    const { driverId, sessionId, isOnline, mongoId } = req.body;

    // Validate required fields
    if (!driverId || !sessionId || isOnline === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields',
        error: 'driverId, sessionId, and isOnline are required'
      });
    }

    // Validate session
    const isValidSession = gpsService.validateSession(sessionId);
    if (!isValidSession) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired session',
        error: 'Session validation failed'
      });
    }

    // Update driver status in legacy service
    const driver = gpsService.drivers.get(driverId);
    if (!driver) {
      return res.status(404).json({
        success: false,
        message: 'Driver not found',
        error: 'No driver found with the specified ID'
      });
    }

    // Update driver status
    driver.isActive = isOnline;
    driver.lastSeen = Date.now();
    gpsService.drivers.set(driverId, driver);

    // Update MongoDB Driver model - try multiple approaches
    let mongoUpdateSuccess = false;
    try {
      const Driver = require('../models/Driver');
      const mongoose = require('mongoose');
      
      console.log('Attempting MongoDB update with:', {
        driverId,
        mongoId,
        driverEmail: driver.email,
        driverPhone: driver.phone,
        isOnline
      });
      
      // Try to update by mongoId first (most reliable) - but validate it's a valid ObjectId
      if (mongoId && mongoose.Types.ObjectId.isValid(mongoId) && !mongoId.startsWith('driver_')) {
        console.log('Trying update by mongoId:', mongoId);
        const result = await Driver.updateOne(
          { _id: mongoId },
          { 
            isOnline: isOnline,
            lastSeen: new Date()
          }
        );
        mongoUpdateSuccess = result.modifiedCount > 0;
        console.log('Update by mongoId result:', {
          matched: result.matchedCount,
          modified: result.modifiedCount,
          success: mongoUpdateSuccess
        });
      } else if (mongoId) {
        console.log('Skipping mongoId - not a valid ObjectId:', mongoId);
      }
      
      // If mongoId not provided or update failed, try by email
      if (!mongoUpdateSuccess && driver.email) {
        console.log('Trying update by email:', driver.email);
        const result = await Driver.updateOne(
          { email: driver.email },
          { 
            isOnline: isOnline,
            lastSeen: new Date()
          }
        );
        mongoUpdateSuccess = result.modifiedCount > 0;
        console.log('Update by email result:', {
          matched: result.matchedCount,
          modified: result.modifiedCount,
          success: mongoUpdateSuccess
        });
      }
      
      // If still not successful, try by phone
      if (!mongoUpdateSuccess && driver.phone) {
        console.log('Trying update by phone:', driver.phone);
        const result = await Driver.updateOne(
          { telephone: driver.phone },
          { 
            isOnline: isOnline,
            lastSeen: new Date()
          }
        );
        mongoUpdateSuccess = result.modifiedCount > 0;
        console.log('Update by phone result:', {
          matched: result.matchedCount,
          modified: result.modifiedCount,
          success: mongoUpdateSuccess
        });
      }
      
      if (mongoUpdateSuccess) {
        console.log('✓ MongoDB driver isOnline status updated to:', isOnline);
      } else {
        console.warn('✗ Could not find driver in MongoDB to update status');
        console.warn('Driver object details:', {
          driverId: driver.driverId,
          name: driver.name,
          email: driver.email,
          phone: driver.phone,
          mongoId
        });
      }
    } catch (mongoError) {
      console.error('Error updating MongoDB driver:', mongoError);
    }

    // Update MongoDB session if exists
    try {
      const DriverSession = require('../models/DriverSession');
      await DriverSession.updateOne(
        { sessionId },
        { 
          isActive: isOnline,
          lastActivity: new Date()
        }
      );
    } catch (mongoError) {
      console.error('Error updating MongoDB session:', mongoError);
      // Continue with legacy update even if MongoDB update fails
    }

    res.status(200).json({
      success: true,
      data: {
        driverId,
        isOnline,
        lastSeen: driver.lastSeen
      },
      message: `Driver status updated to ${isOnline ? 'online' : 'offline'}`
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating driver status',
      error: error.message
    });
  }
};

/**
 * Get detailed driver information
 * GET /api/gps/driver/details/:driverId
 */
exports.getDriverDetails = async (req, res) => {
  try {
    const { driverId } = req.params;

    if (!driverId) {
      return res.status(400).json({
        success: false,
        message: 'Missing driver ID',
        error: 'Driver ID is required'
      });
    }

    // Get driver from legacy service
    const driver = gpsService.drivers.get(driverId);
    if (!driver) {
      return res.status(404).json({
        success: false,
        message: 'Driver not found',
        error: 'No driver found with the specified ID'
      });
    }

    // Get session information
    const session = gpsService.getDriverSession(driverId);
    
    // Check if driver is online (updated within 2 minutes)
    const now = Date.now();
    const isOnline = driver.isActive && (now - driver.lastSeen) < 120000;

    // Try to get MongoDB driver data for additional details
    let mongoDriver = null;
    try {
      const Driver = require('../models/Driver');
      mongoDriver = await Driver.findOne({ 
        $or: [
          { telephone: driver.phone },
          { name: driver.name }
        ]
      });
    } catch (mongoError) {
      console.error('Error fetching MongoDB driver:', mongoError);
    }

    const driverDetails = {
      driverId: driver.driverId,
      name: driver.name,
      phone: driver.phone,
      email: mongoDriver?.email,
      licenseNumber: driver.licenseNumber,
      busId: driver.busId,
      routeId: driver.routeId,
      deviceId: driver.deviceId,
      isActive: driver.isActive,
      isOnline,
      lastSeen: driver.lastSeen,
      currentLocation: driver.currentLocation,
      session: session ? {
        sessionId: session.sessionId,
        startTime: session.startTime,
        lastActivity: session.lastActivity,
        expiresAt: session.expiresAt,
        isActive: session.isActive
      } : null,
      mongoId: mongoDriver?._id
    };

    res.status(200).json({
      success: true,
      data: driverDetails,
      message: 'Driver details retrieved successfully'
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error retrieving driver details',
      error: error.message
    });
  }
};

/**
 * Get driver online/offline status
 * GET /api/gps/driver/status/:driverId
 */
exports.getDriverStatus = async (req, res) => {
  try {
    const { driverId } = req.params;

    if (!driverId) {
      return res.status(400).json({
        success: false,
        message: 'Missing driver ID',
        error: 'Driver ID is required'
      });
    }

    const driver = gpsService.drivers.get(driverId);
    if (!driver) {
      return res.status(404).json({
        success: false,
        message: 'Driver not found',
        error: 'No driver found with the specified ID'
      });
    }

    // Check if driver is online (updated within 2 minutes)
    const now = Date.now();
    const isOnline = driver.isActive && (now - driver.lastSeen) < 120000;

    res.status(200).json({
      success: true,
      data: {
        driverId,
        isOnline,
        isActive: driver.isActive,
        lastSeen: driver.lastSeen,
        timeSinceLastSeen: now - driver.lastSeen
      },
      message: 'Driver status retrieved successfully'
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error retrieving driver status',
      error: error.message
    });
  }
};
exports.logoutDriver = async (req, res) => {
  try {
    const { sessionId } = req.body;

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        message: 'Missing session ID',
        error: 'Session ID is required'
      });
    }

    const success = gpsService.endSession(sessionId);

    if (!success) {
      return res.status(404).json({
        success: false,
        message: 'Session not found',
        error: 'No active session found with the provided session ID'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Driver logged out successfully'
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error during logout',
      error: error.message
    });
  }
};

/**
 * Validate driver session
 * POST /api/gps/driver/validate-session
 */
exports.validateSession = async (req, res) => {
  try {
    const { sessionId } = req.body;

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        message: 'Missing session ID',
        error: 'Session ID is required'
      });
    }

    const isValid = gpsService.validateSession(sessionId);

    if (!isValid) {
      return res.status(401).json({
        success: false,
        message: 'Session invalid or expired',
        error: 'The provided session is not valid or has expired'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Session is valid'
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error validating session',
      error: error.message
    });
  }
};

/**
 * Get active sessions (admin)
 * GET /api/gps/admin/sessions
 */
exports.getActiveSessions = async (req, res) => {
  try {
    const sessions = gpsService.getActiveSessions();

    res.status(200).json({
      success: true,
      count: sessions.length,
      data: sessions,
      message: 'Active sessions retrieved successfully'
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error retrieving active sessions',
      error: error.message
    });
  }
};

/**
 * Get session statistics (admin)
 * GET /api/gps/admin/session-stats
 */
exports.getSessionStats = async (req, res) => {
  try {
    const stats = gpsService.getSessionStats();

    res.status(200).json({
      success: true,
      data: stats,
      message: 'Session statistics retrieved successfully'
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error retrieving session statistics',
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

    // Get processing service statistics
    const processingStats = gpsProcessingService.getProcessingStats();

    res.status(200).json({
      success: true,
      data: {
        totalDrivers: allDrivers.length,
        activeDrivers: activeCount,
        offlineDrivers: allDrivers.length - activeCount,
        processing: processingStats
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

/**
 * Force end session (admin)
 * DELETE /api/gps/admin/session/:sessionId
 */
exports.forceEndSession = async (req, res) => {
  try {
    const { sessionId } = req.params;

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        message: 'Missing session ID',
        error: 'Session ID is required'
      });
    }

    const success = gpsService.forceEndSession(sessionId);

    if (!success) {
      return res.status(404).json({
        success: false,
        message: 'Session not found',
        error: 'No session found with the provided session ID'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Session ended successfully'
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error ending session',
      error: error.message
    });
  }
};