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

  const tryListen = () => {
    server.listen(PORT, () => {
      console.log(`[Server] Express server running on port ${PORT}`);
      console.log(`[Server] Health check endpoint: http://localhost:${PORT}/health`);
      console.log(`[Server] Global WebSocket endpoint: ws://localhost:${PORT}/ws`);
    });
  };

  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      console.warn(`[Server] Port ${PORT} is temporarily busy. Retrying in 1.2s...`);
      setTimeout(() => {
        try {
          server.close();
        } catch (e) {}
        tryListen();
      }, 1200);
    } else {
      console.error('[Server Error]', error);
    }
  });

  tryListen();

  // Graceful shutdown handling for nodemon (SIGUSR2) and OS signals (SIGINT, SIGTERM)
  let isShuttingDown = false;
  const shutdown = (signal) => {
    if (isShuttingDown) return;
    isShuttingDown = true;

    console.log(`\n[Server] Received ${signal}. Closing server gracefully...`);

    // Close WebSocket connections
    try {
      if (global.wss) {
        for (const client of global.wss.clients) {
          try {
            client.terminate();
          } catch (e) {}
        }
        global.wss.close();
      }
    } catch (e) {}

    // Close HTTP server socket
    server.close(() => {
      console.log('[Server] HTTP and WebSocket sockets released.');
      if (signal === 'SIGUSR2') {
        process.kill(process.pid, 'SIGUSR2');
      } else {
        process.exit(0);
      }
    });

    // Hard fallback timeout in case server.close hangs
    setTimeout(() => {
      if (signal === 'SIGUSR2') {
        process.kill(process.pid, 'SIGUSR2');
      } else {
        process.exit(0);
      }
    }, 1500);
  };

  process.once('SIGUSR2', () => shutdown('SIGUSR2'));
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
};

startServer();
