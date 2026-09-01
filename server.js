import app from './app.js';
import connectDB from './config/db.js';

const PORT = process.env.PORT || 5001;

const startServer = async () => {
  // Connect to database
  await connectDB();

  // Start HTTP server
  const server = app.listen(PORT, () => {
    console.log(`[Server] Express server running on port ${PORT}`);
    console.log(`[Server] Health check endpoint: http://localhost:${PORT}/health`);
  });

  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      console.error(`[Server Error] Port ${PORT} is already in use. Please terminate the existing process or use a different PORT.`);
    } else {
      console.error('[Server Error]', error);
    }
    process.exit(1);
  });

  const gracefulShutdown = (signal) => {
    console.log(`\n[Server] Received ${signal}. Closing server gracefully...`);
    server.close(() => {
      console.log('[Server] HTTP server closed.');
      process.exit(0);
    });
  };

  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGUSR2', () => gracefulShutdown('SIGUSR2')); // Nodemon restart signal
};

startServer();
