const mongoose = require('mongoose');

/**
 * Driver Location Schema
 * Stores GPS location data with geospatial indexing for efficient queries
 */
const driverLocationSchema = new mongoose.Schema({
  driverId: {
    type: String,
    required: true,
    index: true
  },
  busId: {
    type: String,
    required: true,
    index: true
  },
  routeId: {
    type: String,
    required: true,
    index: true
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      required: true
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true
    }
  },
  heading: {
    type: Number,
    default: 0,
    min: 0,
    max: 360
  },
  speed: {
    type: Number,
    default: 0,
    min: 0
  },
  accuracy: {
    type: Number,
    required: true,
    min: 0
  },
  status: {
    type: String,
    enum: ['active', 'idle', 'offline'],
    default: 'active'
  },
  sessionId: {
    type: String,
    required: true,
    index: true
  },
  timestamp: {
    type: Date,
    required: true,
    index: true
  }
}, {
  timestamps: true,
  // TTL index for automatic cleanup after 7 days (as per requirement 8.5)
  index: { createdAt: 1 },
  expireAfterSeconds: 7 * 24 * 60 * 60 // 7 days in seconds
});

// Create geospatial index for location queries
driverLocationSchema.index({ location: '2dsphere' });

// Create compound index for efficient current location queries
driverLocationSchema.index({ driverId: 1, timestamp: -1 });

// Create compound index for route-based queries
driverLocationSchema.index({ routeId: 1, timestamp: -1 });

// Create compound index for session-based queries
driverLocationSchema.index({ sessionId: 1, timestamp: -1 });

module.exports = mongoose.model('DriverLocation', driverLocationSchema);