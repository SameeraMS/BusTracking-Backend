const express = require('express');
const router = express.Router();
const {
  registerDriver,
  loginDriver,
  logoutDriver,
  validateSession,
  updateDriverStatus,
  getDriverStatus,
  getDriverDetails,
  updateLocation,
  getDriverLocation,
  getLiveBuses,
  getBusLocation,
  getBusesByRoute,
  getBusHistory,
  getAllDrivers,
  removeDriver,
  getDriverStats,
  getActiveSessions,
  getSessionStats,
  forceEndSession
} = require('../controllers/gpsController');

// ==================== DRIVER AUTHENTICATION ROUTES ====================

// Driver registration and authentication
router.post('/driver/register', registerDriver);
router.post('/driver/login', loginDriver);
router.post('/driver/logout', logoutDriver);
router.post('/driver/validate-session', validateSession);

// Driver status management
router.post('/driver/status', updateDriverStatus);
router.get('/driver/status/:driverId', getDriverStatus);
router.get('/driver/details/:driverId', getDriverDetails);

// ==================== LOCATION TRACKING ROUTES ====================

// Driver location management
router.post('/driver/location', updateLocation);
router.get('/driver/location/:driverId', getDriverLocation);

// ==================== PASSENGER ROUTES ====================

// Live bus tracking for passengers
router.get('/buses/live', getLiveBuses);

// Get all buses on a specific route
router.get('/buses/route/:routeId', getBusesByRoute);

// Specific bus location and history
router.get('/bus/:busId/location', getBusLocation);
router.get('/bus/:busId/history', getBusHistory);

// ==================== ADMIN ROUTES ====================

// Driver management (admin only)
router.get('/admin/drivers', getAllDrivers);
router.delete('/admin/driver/:driverId', removeDriver);

// Session management (admin only)
router.get('/admin/sessions', getActiveSessions);
router.get('/admin/session-stats', getSessionStats);
router.delete('/admin/session/:sessionId', forceEndSession);

// System statistics (admin only)
router.get('/admin/stats', getDriverStats);

module.exports = router;