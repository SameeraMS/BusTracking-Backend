const express = require('express');
const router = express.Router();
const {
  getAllTimetables,
  getTimetable,
  createTimetable,
  updateTimetable,
  deleteTimetable,
  getTimetablesByDriver
} = require('../controllers/timetableController');

router.route('/')
  .get(getAllTimetables)
  .post(createTimetable);

router.route('/driver/:driverId')
  .get(getTimetablesByDriver);

router.route('/:id')
  .get(getTimetable)
  .put(updateTimetable)
  .delete(deleteTimetable);

module.exports = router;

