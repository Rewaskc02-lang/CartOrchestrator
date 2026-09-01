import mongoose from 'mongoose';

/**
 * GET /health
 * Returns service health and MongoDB connection status.
 */
export const getHealth = async (req, res) => {
  const dbStateMap = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };

  const readyState = mongoose.connection.readyState;
  const dbStatus = dbStateMap[readyState] || 'unknown';
  const isHealthy = readyState === 1;

  const healthData = {
    status: isHealthy ? 'ok' : 'degraded',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    database: {
      status: dbStatus,
      host: mongoose.connection.host || null,
      name: mongoose.connection.name || null,
    },
  };

  return res.status(isHealthy ? 200 : 503).json(healthData);
};

export default {
  getHealth,
};
