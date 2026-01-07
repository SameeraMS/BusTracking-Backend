const mongoose = require('mongoose');
const Driver = require('./models/Driver');

const MONGODB_URI = process.env.MONGODB_URI || "mongodb+srv://chamikadamith9:Chamika%40200273@cluster0.bcz4z.mongodb.net/busassesment?retryWrites=true&w=majority&appName=Cluster0";

async function testUpdateStatus() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Find the driver
    const driver = await Driver.findOne({ email: 'chamikadamith9@gmail.com' });
    if (!driver) {
      console.log('Driver not found!');
      return;
    }

    console.log('\n=== BEFORE UPDATE ===');
    console.log('Name:', driver.name);
    console.log('Email:', driver.email);
    console.log('isOnline:', driver.isOnline);
    console.log('lastSeen:', driver.lastSeen);

    // Try updating by email
    console.log('\n=== ATTEMPTING UPDATE BY EMAIL ===');
    const result = await Driver.updateOne(
      { email: 'chamikadamith9@gmail.com' },
      { 
        isOnline: true,
        lastSeen: new Date()
      }
    );

    console.log('Update result:', {
      matched: result.matchedCount,
      modified: result.modifiedCount,
      acknowledged: result.acknowledged
    });

    // Fetch again to verify
    const updatedDriver = await Driver.findOne({ email: 'chamikadamith9@gmail.com' });
    console.log('\n=== AFTER UPDATE ===');
    console.log('isOnline:', updatedDriver.isOnline);
    console.log('lastSeen:', updatedDriver.lastSeen);

    // Try updating by _id
    console.log('\n=== ATTEMPTING UPDATE BY _ID ===');
    const result2 = await Driver.updateOne(
      { _id: driver._id },
      { 
        isOnline: false,
        lastSeen: new Date()
      }
    );

    console.log('Update result:', {
      matched: result2.matchedCount,
      modified: result2.modifiedCount,
      acknowledged: result2.acknowledged
    });

    // Fetch again
    const finalDriver = await Driver.findOne({ email: 'chamikadamith9@gmail.com' });
    console.log('\n=== FINAL STATE ===');
    console.log('isOnline:', finalDriver.isOnline);
    console.log('lastSeen:', finalDriver.lastSeen);

    await mongoose.connection.close();
    console.log('\n✓ Test complete!');

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

testUpdateStatus();
