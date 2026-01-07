const mongoose = require('mongoose');
const Driver = require('./models/Driver');

// MongoDB connection string (using the same as in config/db.js)
const MONGODB_URI = process.env.MONGODB_URI || "mongodb+srv://chamikadamith9:Chamika%40200273@cluster0.bcz4z.mongodb.net/busassesment?retryWrites=true&w=majority&appName=Cluster0";

async function migrateDrivers() {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Update all drivers that don't have isOnline field
    const result = await Driver.updateMany(
      { isOnline: { $exists: false } },
      { 
        $set: { 
          isOnline: false,
          lastSeen: new Date()
        } 
      }
    );

    console.log(`Migration complete!`);
    console.log(`Updated ${result.modifiedCount} drivers with isOnline and lastSeen fields`);

    // Show all drivers with their status
    const drivers = await Driver.find({}, 'name email isOnline lastSeen').lean();
    console.log('\nAll drivers:');
    drivers.forEach(driver => {
      console.log(`- ${driver.name} (${driver.email}): isOnline=${driver.isOnline}, lastSeen=${driver.lastSeen}`);
    });

    await mongoose.connection.close();
    console.log('\nMongoDB connection closed');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

// Run migration
migrateDrivers();
