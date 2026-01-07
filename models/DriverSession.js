const mongoose = require('mongoose');

/**
 * Driver Session Schema
 * Manages driver authentication sessions with automatic expiration
 */
const driverSessionSchema = new mongoose.Schema({
  sessionId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  driverId: {
    type: String,
    required: true,
    index: true
  },
  busId: {
    type: String,
    required: true
  },
  routeId: {
    type: String,
    required: true
  },
  deviceId: {
    type: String,
    required: false,
    index: true
  },
  email: {
    type: String,
    required: true,
    index: true
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  startTime: {
    type: Date,
    required: true,
    default: Date.now
  },
  lastActivity: {
    type: Date,
    required: true,
    default: Date.now
  },
  expiresAt: {
    type: Date,
    required: true
  },
  currentLocation: {
    type: {
      type: String,
      enum: ['Point']
    },
    coordinates: [Number] // [longitude, latitude]
  },
  lastLocationUpdate: {
    type: Date
  }
}, {
  timestamps: true
});

// TTL index for automatic session cleanup
driverSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Compound index for active session queries
driverSessionSchema.index({ isActive: 1, expiresAt: 1 });

module.exports = mongoose.model('DriverSession', driverSessionSchema);