const express = require('express');
const router = express.Router();
const {
  registerDriver,
  loginDriver,
  updateLocation,
  getDriverLocation,
  getLiveBuses,
  getBusLocation,
  getBusHistory,
  getAllDrivers,
  removeDriver,
  getDriverStats
} = require('../controllers/gpsController');

// ==================== DRIVER AUTHENTICATION ROUTES ====================

// Driver registration and authentication
router.post('/driver/register', registerDriver);
router.post('/driver/login', loginDriver);

// ==================== LOCATION TRACKING ROUTES ====================

// Driver location management
router.post('/driver/location', updateLocation);
router.get('/driver/location/:driverId', getDriverLocation);

// ==================== PASSENGER ROUTES ====================

// Live bus tracking for passengers
router.get('/buses/live', getLiveBuses);

// Specific bus location and history
router.get('/bus/:busId/location', getBusLocation);
router.get('/bus/:busId/history', getBusHistory);

// ==================== ADMIN ROUTES ====================

// Driver management (admin only)
router.get('/admin/drivers', getAllDrivers);
router.delete('/admin/driver/:driverId', removeDriver);

// System statistics (admin only)
router.get('/admin/stats', getDriverStats);

module.exports = router;