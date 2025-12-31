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
    
    // Initialize with mock drivers for testing
    this.initializeMockDrivers();
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
   * Authenticate driver by phone and device ID
   * @param {string} phone - Driver's phone number
   * @param {string} deviceId - Device identifier
   * @returns {Object|null} Driver object if authenticated, null otherwise
   */
  authenticateDriver(phone, deviceId) {
    for (const driver of this.drivers.values()) {
      if (driver.phone === phone && driver.deviceId === deviceId) {
        driver.isActive = true;
        driver.lastSeen = Date.now();
        this.drivers.set(driver.driverId, driver);
        return driver;
      }
    }
    return null;
  }

  /**
   * Update driver location
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
   * @returns {boolean} True if update successful, false otherwise
   */
  updateLocation(driverId, locationData) {
    const driver = this.drivers.get(driverId);
    if (!driver) return false;

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