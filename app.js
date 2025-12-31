const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const connectDB = require('./config/db');
const { gpsService } = require('./services/gpsService');

// Load env vars
dotenv.config();

// Connect to database
connectDB();

// Initialize GPS service
console.log('Initializing GPS service...');
console.log(`GPS service initialized with ${gpsService.getAllDrivers().length} registered drivers`);

const app = express();

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

    res.status(200).json({
      success: true,
      message: 'Server is running',
      services: {
        database: 'connected',
        gps: gpsStatus
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

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;

