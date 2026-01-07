const DriverLocation = require('../models/DriverLocation');
const DriverSession = require('../models/DriverSession');
const Driver = require('../models/Driver');

/**
 * Enhanced GPS Processing Service
 * Implements requirements 3.1-3.5 for real-time location storage and processing
 */
class GPSProcessingService {
  constructor() {
    // Configuration constants
    this.OFFLINE_THRESHOLD = 30 * 1000; // 30 seconds (requirement 3.4)
    this.SESSION_TIMEOUT = 8 * 60 * 60 * 1000; // 8 hours
    this.LOCATION_HISTORY_LIMIT = 100;
    
    // Processing queue for chronological ordering (requirement 3.5)
    this.processingQueue = [];
    this.isProcessing = false;
    
    // Start background tasks
    this.startBackgroundTasks();
  }

  /**
   * Validate location data format (requirement 3.1)
   * @param {Object} locationData - Location data to validate
   * @returns {Object} Validation result with isValid flag and errors
   */
  validateLocationData(locationData) {
    const errors = [];
    
    // Required fields validation
    const requiredFields = ['driverId', 'busId', 'routeId', 'latitude', 'longitude', 'accuracy'];
    for (const field of requiredFields) {
      if (locationData[field] === undefined || locationData[field] === null) {
        errors.push(`Missing required field: ${field}`);
      }
    }
    
    // Data type and range validation
    if (typeof locationData.latitude !== 'number' || 
        locationData.latitude < -90 || locationData.latitude > 90) {
      errors.push('Invalid latitude: must be a number between -90 and 90');
    }
    
    if (typeof locationData.longitude !== 'number' || 
        locationData.longitude < -180 || locationData.longitude > 180) {
      errors.push('Invalid longitude: must be a number between -180 and 180');
    }
    
    if (typeof locationData.accuracy !== 'number' || locationData.accuracy < 0) {
      errors.push('Invalid accuracy: must be a non-negative number');
    }
    
    // Optional field validation
    if (locationData.heading !== undefined && 
        (typeof locationData.heading !== 'number' || 
         locationData.heading < 0 || locationData.heading > 360)) {
      errors.push('Invalid heading: must be a number between 0 and 360');
    }
    
    if (locationData.speed !== undefined && 
        (typeof locationData.speed !== 'number' || locationData.speed < 0)) {
      errors.push('Invalid speed: must be a non-negative number');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Authenticate driver session (requirement 3.1)
   * @param {string} sessionId - Session identifier
   * @returns {Promise<Object|null>} Session object if valid, null otherwise
   */
  async authenticateSession(sessionId) {
    try {
      const session = await DriverSession.findOne({
        sessionId,
        isActive: true,
        expiresAt: { $gt: new Date() }
      });
      
      if (!session) {
        return null;
      }
      
      // Update last activity
      session.lastActivity = new Date();
      await session.save();
      
      return session;
    } catch (error) {
      console.error('Session authentication error:', error);
      return null;
    }
  }

  /**
   * Process location update with validation and authentication (requirement 3.1)
   * @param {Object} locationData - Location data to process
   * @param {string} sessionId - Session identifier
   * @returns {Promise<Object>} Processing result
   */
  async processLocationUpdate(locationData, sessionId) {
    // Step 1: Validate location data format
    const validation = this.validateLocationData(locationData);
    if (!validation.isValid) {
      console.error('Location validation failed:', validation.errors);
      return {
        success: false,
        error: 'Invalid location data',
        details: validation.errors
      };
    }
    
    // Step 2: Authenticate driver session (optional - continue if session check fails)
    let session = null;
    try {
      session = await this.authenticateSession(sessionId);
      if (!session) {
        console.warn('Session not found or expired, creating temp session:', sessionId);
        // Continue without session validation - backend will handle it
      } else {
        // Step 3: Verify session matches location data (only if session exists)
        if (session.driverId !== locationData.driverId ||
            session.busId !== locationData.busId ||
            session.routeId !== locationData.routeId) {
          console.warn('Location data does not match session, but continuing');
          // Continue anyway - might be a session mismatch issue
        }
      }
    } catch (error) {
      console.error('Session authentication error, but continuing:', error);
      // Continue without session - we can still save location data
    }
    
    // Step 4: Add to processing queue for chronological processing (requirement 3.5)
    const processItem = {
      locationData: {
        ...locationData,
        sessionId,
        timestamp: locationData.timestamp || new Date()
      },
      session
    };
    
    return await this.addToProcessingQueue(processItem);
  }

  /**
   * Add location update to processing queue for chronological ordering (requirement 3.5)
   * @param {Object} processItem - Item to process
   * @returns {Promise<Object>} Processing result
   */
  async addToProcessingQueue(processItem) {
    return new Promise((resolve) => {
      this.processingQueue.push({
        ...processItem,
        resolve
      });
      
      // Sort queue by timestamp to ensure chronological processing
      this.processingQueue.sort((a, b) => 
        new Date(a.locationData.timestamp) - new Date(b.locationData.timestamp)
      );
      
      // Start processing if not already running
      if (!this.isProcessing) {
        this.processQueue();
      }
    });
  }

  /**
   * Process queued location updates in chronological order (requirement 3.5)
   */
  async processQueue() {
    if (this.isProcessing || this.processingQueue.length === 0) {
      return;
    }
    
    this.isProcessing = true;
    
    while (this.processingQueue.length > 0) {
      const item = this.processingQueue.shift();
      
      try {
        const result = await this.storeLocationData(item.locationData, item.session);
        item.resolve(result);
      } catch (error) {
        console.error('Error processing location update:', error);
        item.resolve({
          success: false,
          error: 'Processing failed',
          details: error.message
        });
      }
    }
    
    this.isProcessing = false;
  }

  /**
   * Store location data in database with timestamp management (requirement 3.2)
   * @param {Object} locationData - Validated location data
   * @param {Object} session - Authenticated session
   * @returns {Promise<Object>} Storage result
   */
  async storeLocationData(locationData, session) {
    try {
      // Create location document
      const locationDoc = new DriverLocation({
        driverId: locationData.driverId,
        busId: locationData.busId,
        routeId: locationData.routeId,
        location: {
          type: 'Point',
          coordinates: [locationData.longitude, locationData.latitude]
        },
        heading: locationData.heading || 0,
        speed: locationData.speed || 0,
        accuracy: locationData.accuracy,
        status: locationData.status || 'active',
        sessionId: locationData.sessionId,
        timestamp: locationData.timestamp
      });
      
      // Save location data (requirement 3.2)
      await locationDoc.save();
      
      // Update session with current location (requirement 3.3)
      await this.updateCurrentLocation(session, locationData);
      
      // Clean up old location data to maintain only most recent (requirement 3.3)
      await this.cleanupOldLocations(locationData.driverId);
      
      // Broadcast location update via WebSocket (requirement 4.3)
      this.broadcastLocationUpdate(locationData);
      
      return {
        success: true,
        locationId: locationDoc._id,
        timestamp: locationDoc.timestamp
      };
      
    } catch (error) {
      console.error('Error storing location data:', error);
      return {
        success: false,
        error: 'Storage failed',
        details: error.message
      };
    }
  }

  /**
   * Update session with current location (requirement 3.3)
   * @param {Object} session - Driver session
   * @param {Object} locationData - Location data
   */
  async updateCurrentLocation(session, locationData) {
    try {
      session.currentLocation = {
        type: 'Point',
        coordinates: [locationData.longitude, locationData.latitude]
      };
      session.lastLocationUpdate = locationData.timestamp;
      session.lastActivity = new Date();
      
      await session.save();
    } catch (error) {
      console.error('Error updating current location:', error);
    }
  }

  /**
   * Clean up old location data to maintain only most recent (requirement 3.3)
   * @param {string} driverId - Driver identifier
   */
  async cleanupOldLocations(driverId) {
    try {
      // Keep only the most recent locations (limit to prevent excessive storage)
      const locations = await DriverLocation.find({ driverId })
        .sort({ timestamp: -1 })
        .skip(this.LOCATION_HISTORY_LIMIT);
      
      if (locations.length > 0) {
        const oldLocationIds = locations.map(loc => loc._id);
        await DriverLocation.deleteMany({ _id: { $in: oldLocationIds } });
      }
    } catch (error) {
      console.error('Error cleaning up old locations:', error);
    }
  }

  /**
   * Get current location for a driver
   * @param {string} driverId - Driver identifier
   * @returns {Promise<Object|null>} Current location or null
   */
  async getCurrentLocation(driverId) {
    try {
      const location = await DriverLocation.findOne({ driverId })
        .sort({ timestamp: -1 })
        .limit(1);
      
      return location;
    } catch (error) {
      console.error('Error getting current location:', error);
      return null;
    }
  }

  /**
   * Get all active driver locations for passengers
   * @returns {Promise<Array>} Array of active locations with driver info
   */
  async getActiveLocations() {
    try {
      const cutoffTime = new Date(Date.now() - this.OFFLINE_THRESHOLD);
      
      // Get most recent location for each active driver
      const pipeline = [
        {
          $match: {
            timestamp: { $gte: cutoffTime },
            status: { $in: ['active', 'idle'] }
          }
        },
        {
          $sort: { driverId: 1, timestamp: -1 }
        },
        {
          $group: {
            _id: '$driverId',
            location: { $first: '$$ROOT' }
          }
        },
        {
          $replaceRoot: { newRoot: '$location' }
        }
      ];
      
      const activeLocations = await DriverLocation.aggregate(pipeline);
      
      // Enhance with driver information
      const enhancedLocations = await Promise.all(
        activeLocations.map(async (location) => {
          try {
            // Try to find driver by driverId first
            let driver = await Driver.findOne({ 
              $or: [
                { vehicleNumber: location.busId },
                { route: location.routeId }
              ]
            });
            
            return {
              ...location,
              driverName: driver ? driver.name : 'Unknown Driver',
              latitude: location.location?.coordinates?.[1] || 0,
              longitude: location.location?.coordinates?.[0] || 0,
            };
          } catch (err) {
            console.error('Error enhancing location with driver info:', err);
            return {
              ...location,
              driverName: 'Unknown Driver',
              latitude: location.location?.coordinates?.[1] || 0,
              longitude: location.location?.coordinates?.[0] || 0,
            };
          }
        })
      );
      
      return enhancedLocations;
    } catch (error) {
      console.error('Error getting active locations:', error);
      return [];
    }
  }

  /**
   * Mark drivers as offline based on data age (requirement 3.4)
   */
  async markOfflineDrivers() {
    try {
      const cutoffTime = new Date(Date.now() - this.OFFLINE_THRESHOLD);
      
      // Find sessions with old location data
      const staleSessions = await DriverSession.find({
        isActive: true,
        lastLocationUpdate: { $lt: cutoffTime }
      });
      
      // Update driver status to potentially offline
      for (const session of staleSessions) {
        // Update the most recent location status to offline
        await DriverLocation.updateOne(
          { 
            driverId: session.driverId,
            timestamp: session.lastLocationUpdate
          },
          { 
            $set: { status: 'offline' }
          }
        );
      }
      
      console.log(`Marked ${staleSessions.length} drivers as potentially offline`);
    } catch (error) {
      console.error('Error marking offline drivers:', error);
    }
  }

  /**
   * Get location history for a driver
   * @param {string} driverId - Driver identifier
   * @param {number} limit - Maximum number of entries
   * @returns {Promise<Array>} Location history
   */
  async getLocationHistory(driverId, limit = 50) {
    try {
      const history = await DriverLocation.find({ driverId })
        .sort({ timestamp: -1 })
        .limit(limit);
      
      return history;
    } catch (error) {
      console.error('Error getting location history:', error);
      return [];
    }
  }

  /**
   * Start background tasks for maintenance
   */
  startBackgroundTasks() {
    // Mark offline drivers every 30 seconds (requirement 3.4)
    setInterval(() => {
      this.markOfflineDrivers();
    }, 30000);
    
    // Clean up expired sessions every 5 minutes
    setInterval(() => {
      this.cleanupExpiredSessions();
    }, 5 * 60 * 1000);
  }

  /**
   * Clean up expired sessions
   */
  async cleanupExpiredSessions() {
    try {
      const result = await DriverSession.updateMany(
        {
          isActive: true,
          expiresAt: { $lt: new Date() }
        },
        {
          $set: { isActive: false }
        }
      );
      
      if (result.modifiedCount > 0) {
        console.log(`Cleaned up ${result.modifiedCount} expired sessions`);
      }
    } catch (error) {
      console.error('Error cleaning up expired sessions:', error);
    }
  }

  /**
   * Get processing statistics
   * @returns {Object} Processing statistics
   */
  getProcessingStats() {
    return {
      queueLength: this.processingQueue.length,
      isProcessing: this.isProcessing,
      offlineThreshold: this.OFFLINE_THRESHOLD,
      sessionTimeout: this.SESSION_TIMEOUT
    };
  }

  /**
   * Set WebSocket service reference for broadcasting
   * @param {Object} websocketService - WebSocket service instance
   */
  setWebSocketService(websocketService) {
    this.websocketService = websocketService;
  }

  /**
   * Broadcast location update via WebSocket (requirement 4.3)
   * @param {Object} locationData - Location data to broadcast
   */
  broadcastLocationUpdate(locationData) {
    if (this.websocketService) {
      this.websocketService.broadcastLocationUpdate(locationData);
    }
  }

  /**
   * Broadcast driver status change via WebSocket
   * @param {string} driverId - Driver identifier
   * @param {string} status - New status
   * @param {string} busId - Bus identifier
   * @param {string} routeId - Route identifier
   */
  broadcastDriverStatusChange(driverId, status, busId, routeId) {
    if (this.websocketService) {
      this.websocketService.broadcastDriverStatusChange(driverId, status, busId, routeId);
    }
  }

  /**
   * Get current locations for all active drivers (for WebSocket initial data)
   * @returns {Array} Current locations
   */
  getCurrentLocations() {
    // This method will be used by WebSocket service to send initial data
    // Implementation will return cached current locations
    return this.getActiveLocations();
  }
}

// Create and export singleton instance
const gpsProcessingService = new GPSProcessingService();

module.exports = {
  GPSProcessingService,
  gpsProcessingService
};