import http from 'http';
import app from './app.js';
import connectDB from './config/db.js';
import { initWebSocketServer } from './services/websocketService.js';

const PORT = parseInt(process.env.PORT, 10) || 5001;

const startServer = async () => {
  // Connect to MongoDB
  await connectDB();

  // Create HTTP server wrapping Express
  const server = http.createServer(app);

  // Mount global real-time WebSocket server
  const wss = initWebSocketServer(server);
  app.set('wss', wss);

  server.listen(PORT, () => {
    console.log(`[Server] Express server running on port ${PORT}`);
    console.log(`[Server] Health check endpoint: http://localhost:${PORT}/health`);
    console.log(`[Server] Global WebSocket endpoint: ws://localhost:${PORT}/ws`);
  });

  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      console.error(`[Server Error] Port ${PORT} is busy. Retrying in 1s...`);
      setTimeout(() => {
        server.close();
        server.listen(PORT);
      }, 1000);
    } else {
      console.error('[Server Error]', error);
    }
  });

  // Graceful shutdown handling for nodemon and OS signals
  const shutdown = (signal) => {
    console.log(`\n[Server] Received ${signal}. Closing server gracefully...`);
    server.close(() => {
      console.log('[Server] HTTP and WebSocket servers closed.');
      if (signal === 'SIGUSR2') {
        process.kill(process.pid, 'SIGUSR2');
      } else {
        process.exit(0);
      }
    });
  };

  process.once('SIGUSR2', () => shutdown('SIGUSR2'));
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
};

startServer();
