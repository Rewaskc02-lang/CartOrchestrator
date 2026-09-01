import app from './app.js';
import connectDB from './config/db.js';

const PORT = process.env.PORT || 5001;

const startServer = async () => {
  // Connect to database
  await connectDB();

  // Start HTTP server
  app.listen(PORT, () => {
    console.log(`[Server] Express server running on port ${PORT}`);
    console.log(`[Server] Health check endpoint: http://localhost:${PORT}/health`);
  });
};

startServer();
