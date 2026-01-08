const mongoose = require('mongoose');

/**
 * Bus Route Schema
 * Stores route information with coordinates for path display
 */
const busRouteSchema = new mongoose.Schema({
  routeId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  routeNumber: {
    type: String,
    required: true,
    index: true
  },
  routeName: {
    type: String,
    required: true
  },
  startPoint: {
    name: String,
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point'
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: true
      }
    }
  },
  endPoint: {
    name: String,
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point'
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: true
      }
    }
  },
  path: {
    type: {
      type: String,
      enum: ['LineString'],
      default: 'LineString'
    },
    coordinates: {
      type: [[Number]], // Array of [longitude, latitude] pairs
      required: true
    }
  },
  stops: [{
    stopId: String,
    name: String,
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point'
      },
      coordinates: [Number] // [longitude, latitude]
    },
    order: Number,
    estimatedTime: Number // minutes from start
  }],
  distance: {
    type: Number, // in kilometers
    default: 0
  },
  estimatedDuration: {
    type: Number, // in minutes
    default: 0
  },
  operatingHours: {
    start: String, // e.g., "05:00"
    end: String    // e.g., "23:00"
  },
  frequency: {
    type: Number, // minutes between buses
    default: 15
  },
  fare: {
    type: Number, // base fare in local currency
    default: 0
  },
  color: {
    type: String, // hex color for route display
    default: '#3B82F6'
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  description: String,
  direction: {
    type: String,
    enum: ['forward', 'reverse', 'circular'],
    default: 'forward'
  }
}, {
  timestamps: true
});

// Create geospatial indexes
busRouteSchema.index({ 'startPoint.location': '2dsphere' });
busRouteSchema.index({ 'endPoint.location': '2dsphere' });
busRouteSchema.index({ 'path': '2dsphere' });
busRouteSchema.index({ 'stops.location': '2dsphere' });

// Compound indexes for queries
busRouteSchema.index({ routeNumber: 1, isActive: 1 });
busRouteSchema.index({ isActive: 1, routeNumber: 1 });

module.exports = mongoose.model('BusRoute', busRouteSchema);
