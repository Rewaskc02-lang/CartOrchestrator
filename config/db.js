import mongoose from 'mongoose';

/**
 * Connects to MongoDB using the connection string from MONGO_URI in process.env.
 */
export const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`[DB] MongoDB Connected: ${conn.connection.host}/${conn.connection.name}`);
    return conn;
  } catch (error) {
    console.error(`[DB Error] Failed to connect to MongoDB: ${error.message}`);
    process.exit(1);
  }
};

export default connectDB;
