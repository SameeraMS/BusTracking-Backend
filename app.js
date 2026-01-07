const express = require('express');
const http = require('http');
const dotenv = require('dotenv');
const cors = require('cors');
const connectDB = require('./config/db');
const { gpsService } = require('./services/gpsService');
const { gpsProcessingService } = require('./services/gpsProcessingService');
const { websocketService } = require('./services/websocketService');

// Load env vars
dotenv.config();

// Connect to database
connectDB();

// Initialize GPS services
console.log('Initializing GPS services...');
console.log(`Legacy GPS service initialized with ${gpsService.getAllDrivers().length} registered drivers`);
console.log('Enhanced GPS processing service initialized');
console.log('Processing service stats:', gpsProcessingService.getProcessingStats());

const app = express();
const server = http.createServer(app);

// Initialize WebSocket service
const wsInitialized = websocketService.initialize(server);
if (wsInitialized) {
  // Connect GPS processing service with WebSocket service for real-time broadcasting
  gpsProcessingService.setWebSocketService(websocketService);
  console.log('WebSocket service integrated with GPS processing service');
} else {
  console.error('Failed to initialize WebSocket service');
}

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/drivers', require('./routes/driverRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/timetables', require('./routes/timetableRoutes'));
app.use('/api/gps', require('./routes/gpsRoutes'));

// Health check route
app.get('/api/health', (req, res) => {
  try {
    // Get GPS service status
    const allDrivers = gpsService.getAllDrivers();
    const activeDrivers = allDrivers.filter(driver => {
      const now = Date.now();
      return driver.isActive && (now - driver.lastSeen) < 120000; // 2 minutes
    });
    
    const gpsStatus = {
      totalDrivers: allDrivers.length,
      activeDrivers: activeDrivers.length,
      serviceRunning: true,
      lastUpdate: new Date().toISOString()
    };

    // Get processing service status
    const processingStats = gpsProcessingService.getProcessingStats();
    const websocketStats = websocketService.getStats();

    res.status(200).json({
      success: true,
      message: 'Server is running',
      services: {
        database: 'connected',
        gps: gpsStatus,
        processing: {
          serviceRunning: true,
          ...processingStats
        },
        websocket: {
          serviceRunning: websocketStats.isRunning,
          activeConnections: websocketStats.activeConnections,
          totalConnections: websocketStats.totalConnections,
          messagesSent: websocketStats.messagesSent,
          lastBroadcast: websocketStats.lastBroadcast
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Health check failed',
      error: error.message,
      services: {
        database: 'connected',
        gps: {
          serviceRunning: false,
          error: error.message
        },
        processing: {
          serviceRunning: false,
          error: error.message
        }
      }
    });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Error handler
app.use((err, req, res, next) => {
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Server Error',
    error: process.env.NODE_ENV === 'development' ? err.stack : {}
  });
});

const PORT = process.env.PORT || 5001;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`WebSocket server available at ws://localhost:${PORT}/ws`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  websocketService.shutdown();
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  websocketService.shutdown();
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

module.exports = app;

