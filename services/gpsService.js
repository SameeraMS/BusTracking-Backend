/**
 * GPS Tracking Service
 * Converted from TypeScript to JavaScript for Express.js integration
 * Manages driver registration, authentication, and location tracking
 */

class GPSService {
  constructor() {
    // In-memory storage for drivers, locations, and history
    this.drivers = new Map();
    this.locations = new Map();
    this.locationHistory = new Map();
    
    // Enhanced session management
    this.activeSessions = new Map(); // sessionId -> session data
    this.deviceSessions = new Map(); // deviceId -> sessionId
    
    // Session configuration
    this.SESSION_TIMEOUT = 8 * 60 * 60 * 1000; // 8 hours in milliseconds
    this.SESSION_CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 minutes
    
    // Initialize with mock drivers for testing
    this.initializeMockDrivers();
    
    // Start session cleanup timer
    this.startSessionCleanup();
  }

  /**
   * Initialize mock registered drivers for testing
   */
  initializeMockDrivers() {
    const mockDrivers = [
      {
        driverId: 'driver_001',
        name: 'Kamal Perera',
        phone: '+94771234567',
        licenseNumber: 'DL001234',
        busId: 'bus_138_01',
        routeId: 'route_138',
        deviceId: 'device_android_001',
        isActive: true,
        lastSeen: Date.now(),
      },
      {
        driverId: 'driver_002',
        name: 'Sunil Silva',
        phone: '+94771234568',
        licenseNumber: 'DL001235',
        busId: 'bus_177_01',
        routeId: 'route_177',
        deviceId: 'device_android_002',
        isActive: true,
        lastSeen: Date.now(),
      },
      {
        driverId: 'driver_003',
        name: 'Nimal Fernando',
        phone: '+94771234569',
        licenseNumber: 'DL001236',
        busId: 'bus_245_01',
        routeId: 'route_245',
        deviceId: 'device_android_003',
        isActive: true,
        lastSeen: Date.now(),
      }
    ];

    mockDrivers.forEach(driver => {
      this.drivers.set(driver.driverId, driver);
      this.locationHistory.set(driver.driverId, []);
    });
  }

  /**
   * Register a new driver
   * @param {Object} driverData - Driver registration data
   * @param {string} driverData.driverId - Unique driver identifier
   * @param {string} driverData.name - Driver's full name
   * @param {string} driverData.phone - Phone number for authentication
   * @param {string} driverData.licenseNumber - Driver's license number
   * @param {string} driverData.busId - Assigned bus identifier
   * @param {string} driverData.routeId - Assigned route identifier
   * @param {string} driverData.deviceId - Unique device identifier
   * @returns {string} The driver ID
   */
  registerDriver(driverData) {
    const newDriver = {
      ...driverData,
      isActive: false,
      lastSeen: Date.now(),
      currentLocation: null
    };
    
    this.drivers.set(driverData.driverId, newDriver);
    this.locationHistory.set(driverData.driverId, []);
    
    return driverData.driverId;
  }

  /**
   * Authenticate driver by phone and device ID with enhanced session management
   * @param {string} phone - Driver's phone number
   * @param {string} deviceId - Device identifier
   * @param {boolean} setActive - Whether to automatically set driver to active (default: false)
   * @returns {Object|null} Driver session object if authenticated, null otherwise
   */
  authenticateDriver(phone, deviceId, setActive = false) {
    // Find driver by phone
    let driver = null;
    for (const d of this.drivers.values()) {
      if (d.phone === phone) {
        driver = d;
        break;
      }
    }
    
    if (!driver) {
      return null;
    }
    
    // Validate device ID - either matches registered device or driver has no device registered
    if (driver.deviceId && driver.deviceId !== deviceId) {
      return null;
    }
    
    // Update driver's device ID if not set
    if (!driver.deviceId) {
      driver.deviceId = deviceId;
      this.drivers.set(driver.driverId, driver);
    }
    
    // Check if device already has an active session
    const existingSessionId = this.deviceSessions.get(deviceId);
    if (existingSessionId) {
      const existingSession = this.activeSessions.get(existingSessionId);
      if (existingSession && !this.isSessionExpired(existingSession)) {
        // Return existing session (preserve current isActive status)
        return {
          ...driver,
          sessionId: existingSessionId,
          sessionStartTime: existingSession.startTime,
          sessionExpiresAt: existingSession.expiresAt
        };
      } else {
        // Clean up expired session
        this.endSession(existingSessionId);
      }
    }
    
    // Create new session
    const sessionId = this.createDriverSession(driver.driverId, deviceId);
    const session = this.activeSessions.get(sessionId);
    
    // Update driver status - only set active if explicitly requested
    if (setActive) {
      driver.isActive = true;
    }
    driver.lastSeen = Date.now();
    this.drivers.set(driver.driverId, driver);
    
    return {
      ...driver,
      sessionId,
      sessionStartTime: session.startTime,
      sessionExpiresAt: session.expiresAt
    };
  }

  /**
   * Create a new driver session
   * @param {string} driverId - Driver identifier
   * @param {string} deviceId - Device identifier
   * @returns {string} Session ID
   */
  createDriverSession(driverId, deviceId) {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const now = Date.now();
    
    const session = {
      sessionId,
      driverId,
      deviceId,
      startTime: now,
      lastActivity: now,
      expiresAt: now + this.SESSION_TIMEOUT,
      isActive: true
    };
    
    this.activeSessions.set(sessionId, session);
    this.deviceSessions.set(deviceId, sessionId);
    
    return sessionId;
  }

  /**
   * Validate and refresh a driver session
   * @param {string} sessionId - Session identifier
   * @returns {boolean} True if session is valid and refreshed, false otherwise
   */
  validateSession(sessionId) {
    const session = this.activeSessions.get(sessionId);
    if (!session || !session.isActive) {
      return false;
    }
    
    if (this.isSessionExpired(session)) {
      this.endSession(sessionId);
      return false;
    }
    
    // Refresh session activity
    session.lastActivity = Date.now();
    this.activeSessions.set(sessionId, session);
    
    return true;
  }

  /**
   * End a driver session
   * @param {string} sessionId - Session identifier
   * @returns {boolean} True if session was ended, false if not found
   */
  endSession(sessionId) {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      return false;
    }
    
    // Mark driver as inactive
    const driver = this.drivers.get(session.driverId);
    if (driver) {
      driver.isActive = false;
      this.drivers.set(session.driverId, driver);
    }
    
    // Clean up session data
    this.activeSessions.delete(sessionId);
    this.deviceSessions.delete(session.deviceId);
    
    return true;
  }

  /**
   * Check if a session is expired
   * @param {Object} session - Session object
   * @returns {boolean} True if expired, false otherwise
   */
  isSessionExpired(session) {
    return Date.now() > session.expiresAt;
  }

  /**
   * Get active session for a driver
   * @param {string} driverId - Driver identifier
   * @returns {Object|null} Session object or null if not found
   */
  getDriverSession(driverId) {
    for (const session of this.activeSessions.values()) {
      if (session.driverId === driverId && session.isActive) {
        return session;
      }
    }
    return null;
  }

  /**
   * Start automatic session cleanup
   */
  startSessionCleanup() {
    setInterval(() => {
      this.cleanupExpiredSessions();
    }, this.SESSION_CLEANUP_INTERVAL);
  }

  /**
   * Clean up expired sessions
   */
  cleanupExpiredSessions() {
    const now = Date.now();
    const expiredSessions = [];
    
    for (const [sessionId, session] of this.activeSessions.entries()) {
      if (this.isSessionExpired(session)) {
        expiredSessions.push(sessionId);
      }
    }
    
    expiredSessions.forEach(sessionId => {
      this.endSession(sessionId);
    });
    
    if (expiredSessions.length > 0) {
      console.log(`Cleaned up ${expiredSessions.length} expired sessions`);
    }
  }

  /**
   * Update driver location with session validation
   * @param {string} driverId - Driver identifier
   * @param {Object} locationData - Location data
   * @param {string} locationData.busId - Bus identifier
   * @param {string} locationData.routeId - Route identifier
   * @param {number} locationData.latitude - GPS latitude
   * @param {number} locationData.longitude - GPS longitude
   * @param {number} locationData.heading - Direction in degrees
   * @param {number} locationData.speed - Speed in km/h
   * @param {number} locationData.accuracy - GPS accuracy in meters
   * @param {string} locationData.status - Driver status ('active', 'idle', 'offline')
   * @param {string} sessionId - Optional session ID for validation
   * @returns {boolean} True if update successful, false otherwise
   */
  updateLocation(driverId, locationData, sessionId = null) {
    const driver = this.drivers.get(driverId);
    if (!driver) return false;

    // Validate session if provided
    if (sessionId && !this.validateSession(sessionId)) {
      return false;
    }

    const fullLocation = {
      driverId,
      ...locationData,
      timestamp: Date.now(),
    };

    // Update current location
    this.locations.set(driverId, fullLocation);
    
    // Update driver's last seen and current location
    driver.lastSeen = Date.now();
    driver.currentLocation = fullLocation;
    this.drivers.set(driverId, driver);

    // Add to history (keep last 100 locations)
    const history = this.locationHistory.get(driverId) || [];
    history.push(fullLocation);
    if (history.length > 100) {
      history.shift();
    }
    this.locationHistory.set(driverId, history);

    return true;
  }

  /**
   * Get all active bus locations for passengers
   * @returns {Array} Array of active driver locations
   */
  getActiveBusLocations() {
    const activeLocations = [];
    const now = Date.now();
    
    for (const driver of this.drivers.values()) {
      if (driver.isActive && driver.currentLocation) {
        // Consider driver offline if no update in 2 minutes
        const isOnline = (now - driver.lastSeen) < 120000;
        if (isOnline) {
          activeLocations.push({
            ...driver.currentLocation,
            status: driver.currentLocation.status,
          });
        }
      }
    }
    
    return activeLocations;
  }

  /**
   * Get specific driver location
   * @param {string} driverId - Driver identifier
   * @returns {Object|null} Driver location or null if not found
   */
  getDriverLocation(driverId) {
    return this.locations.get(driverId) || null;
  }

  /**
   * Get driver by bus ID
   * @param {string} busId - Bus identifier
   * @returns {Object|null} Driver object or null if not found
   */
  getDriverByBusId(busId) {
    for (const driver of this.drivers.values()) {
      if (driver.busId === busId) {
        return driver;
      }
    }
    return null;
  }

  /**
   * Get all drivers on a specific route
   * @param {string} routeId - Route identifier
   * @returns {Array} Array of driver objects on the route
   */
  getDriversByRoute(routeId) {
    const routeDrivers = [];
    for (const driver of this.drivers.values()) {
      if (driver.routeId === routeId) {
        routeDrivers.push(driver);
      }
    }
    return routeDrivers;
  }

  /**
   * Get location history for a driver
   * @param {string} driverId - Driver identifier
   * @param {number} limit - Maximum number of history entries (default: 50)
   * @returns {Array} Array of location history entries
   */
  getLocationHistory(driverId, limit = 50) {
    const history = this.locationHistory.get(driverId) || [];
    return history.slice(-limit);
  }

  /**
   * Get all registered drivers (admin function)
   * @returns {Array} Array of all registered drivers
   */
  getAllDrivers() {
    return Array.from(this.drivers.values());
  }

  /**
   * Remove driver (admin function)
   * @param {string} driverId - Driver identifier
   * @returns {boolean} True if driver was removed, false if not found
   */
  removeDriver(driverId) {
    const removed = this.drivers.delete(driverId);
    this.locations.delete(driverId);
    this.locationHistory.delete(driverId);
    
    return removed;
  }

  /**
   * Generate unique device ID for new installations
   * @returns {string} Unique device identifier
   */
  static generateDeviceId() {
    return `device_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Validate location data
   * @param {Object} location - Location data to validate
   * @returns {boolean} True if location is valid, false otherwise
   */
  static validateLocation(location) {
    return !!(
      location.latitude !== undefined &&
      location.longitude !== undefined &&
      location.latitude >= -90 && location.latitude <= 90 &&
      location.longitude >= -180 && location.longitude <= 180 &&
      location.accuracy !== undefined &&
      location.accuracy >= 0
    );
  }

  /**
   * Get all active sessions (admin function)
   * @returns {Array} Array of active sessions
   */
  getActiveSessions() {
    return Array.from(this.activeSessions.values()).filter(session => session.isActive);
  }

  /**
   * Get session statistics
   * @returns {Object} Session statistics
   */
  getSessionStats() {
    const activeSessions = this.getActiveSessions();
    const now = Date.now();
    
    return {
      totalActiveSessions: activeSessions.length,
      averageSessionDuration: activeSessions.length > 0 
        ? activeSessions.reduce((sum, session) => sum + (now - session.startTime), 0) / activeSessions.length
        : 0,
      oldestSession: activeSessions.length > 0 
        ? Math.min(...activeSessions.map(s => s.startTime))
        : null
    };
  }

  /**
   * Force end session (admin function)
   * @param {string} sessionId - Session identifier
   * @returns {boolean} True if session was ended, false if not found
   */
  forceEndSession(sessionId) {
    return this.endSession(sessionId);
  }

  /**
   * Calculate distance between two points using Haversine formula
   * @param {number} lat1 - First point latitude
   * @param {number} lon1 - First point longitude
   * @param {number} lat2 - Second point latitude
   * @param {number} lon2 - Second point longitude
   * @returns {number} Distance in kilometers
   */
  static calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }
}

// Create and export singleton instance
const gpsService = new GPSService();

module.exports = {
  GPSService,
  gpsService
};