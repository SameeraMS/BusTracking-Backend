const express = require('express');
const router = express.Router();
const {
  getAllRoutes,
  getRouteById,
  createRoute,
  updateRoute,
  deleteRoute,
  getNearbyRoutes,
  getRouteStats,
  seedSampleRoutes
} = require('../controllers/routeController');

// ==================== PUBLIC ROUTES ====================

// Get all routes
router.get('/', getAllRoutes);

// Get route by ID or route number
router.get('/:identifier', getRouteById);

// Get nearby routes
router.get('/search/nearby', getNearbyRoutes);

// Get route statistics
router.get('/stats/summary', getRouteStats);

// ==================== ADMIN ROUTES ====================

// Create new route
router.post('/', createRoute);

// Update route
router.put('/:identifier', updateRoute);

// Delete route
router.delete('/:identifier', deleteRoute);

// Seed sample routes (development/testing)
router.post('/seed/sample', seedSampleRoutes);

module.exports = router;
