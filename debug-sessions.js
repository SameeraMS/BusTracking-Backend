/**
 * Debug script to check sessions in MongoDB
 */

const mongoose = require('mongoose');
const DriverSession = require('./models/DriverSession');

async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || "mongodb+srv://chamikadamith9:Chamika%40200273@cluster0.bcz4z.mongodb.net/busassesment?retryWrites=true&w=majority&appName=Cluster0");
    console.log('MongoDB Connected for debugging');
  } catch (error) {
    console.error('Database connection error:', error);
    process.exit(1);
  }
}

async function debugSessions() {
  await connectDB();
  
  console.log('=== All Sessions in MongoDB ===');
  const sessions = await DriverSession.find({});
  console.log('Total sessions:', sessions.length);
  
  sessions.forEach((session, index) => {
    console.log(`\nSession ${index + 1}:`);
    console.log('  Session ID:', session.sessionId);
    console.log('  Driver ID:', session.driverId);
    console.log('  Is Active:', session.isActive);
    console.log('  Expires At:', session.expiresAt);
    console.log('  Is Expired:', new Date() > session.expiresAt);
  });
  
  await mongoose.connection.close();
}

debugSessions().catch(console.error);