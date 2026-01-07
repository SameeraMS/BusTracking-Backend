/**
 * Debug script to check location data in MongoDB
 */

const mongoose = require('mongoose');
const DriverLocation = require('./models/DriverLocation');

async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || "mongodb+srv://chamikadamith9:Chamika%40200273@cluster0.bcz4z.mongodb.net/busassesment?retryWrites=true&w=majority&appName=Cluster0");
    console.log('MongoDB Connected for debugging');
  } catch (error) {
    console.error('Database connection error:', error);
    process.exit(1);
  }
}

async function debugLocations() {
  await connectDB();
  
  console.log('=== All Location Data in MongoDB ===');
  const locations = await DriverLocation.find({}).sort({ timestamp: -1 });
  console.log('Total locations:', locations.length);
  
  locations.forEach((location, index) => {
    console.log(`\nLocation ${index + 1}:`);
    console.log('  Driver ID:', location.driverId);
    console.log('  Bus ID:', location.busId);
    console.log('  Route ID:', location.routeId);
    console.log('  Coordinates:', location.location.coordinates);
    console.log('  Speed:', location.speed);
    console.log('  Heading:', location.heading);
    console.log('  Accuracy:', location.accuracy);
    console.log('  Status:', location.status);
    console.log('  Timestamp:', location.timestamp);
    console.log('  Session ID:', location.sessionId);
  });
  
  await mongoose.connection.close();
}

debugLocations().catch(console.error);