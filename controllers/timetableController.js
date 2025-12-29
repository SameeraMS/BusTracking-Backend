const Timetable = require('../models/Timetable');

// Get all timetables
exports.getAllTimetables = async (req, res) => {
  try {
    const timetables = await Timetable.find().populate('driverId', 'name email route vehicleNumber');
    res.status(200).json({
      success: true,
      count: timetables.length,
      data: timetables
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching timetables',
      error: error.message
    });
  }
};

// Get single timetable
exports.getTimetable = async (req, res) => {
  try {
    const timetable = await Timetable.findById(req.params.id).populate('driverId', 'name email route vehicleNumber');
    if (!timetable) {
      return res.status(404).json({
        success: false,
        message: 'Timetable not found'
      });
    }
    res.status(200).json({
      success: true,
      data: timetable
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching timetable',
      error: error.message
    });
  }
};

// Create timetable
exports.createTimetable = async (req, res) => {
  try {
    const timetable = await Timetable.create(req.body);
    await timetable.populate('driverId', 'name email route vehicleNumber');
    res.status(201).json({
      success: true,
      data: timetable
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Error creating timetable',
      error: error.message
    });
  }
};

// Update timetable
exports.updateTimetable = async (req, res) => {
  try {
    const timetable = await Timetable.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    ).populate('driverId', 'name email route vehicleNumber');
    
    if (!timetable) {
      return res.status(404).json({
        success: false,
        message: 'Timetable not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: timetable
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Error updating timetable',
      error: error.message
    });
  }
};

// Delete timetable
exports.deleteTimetable = async (req, res) => {
  try {
    const timetable = await Timetable.findByIdAndDelete(req.params.id);
    
    if (!timetable) {
      return res.status(404).json({
        success: false,
        message: 'Timetable not found'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Timetable deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting timetable',
      error: error.message
    });
  }
};

// Get timetables by driver
exports.getTimetablesByDriver = async (req, res) => {
  try {
    const timetables = await Timetable.find({ driverId: req.params.driverId }).populate('driverId', 'name email route vehicleNumber');
    res.status(200).json({
      success: true,
      count: timetables.length,
      data: timetables
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching timetables',
      error: error.message
    });
  }
};

