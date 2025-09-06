const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const responseTime = require('response-time');
const rateLimit = require('express-rate-limit');
const promClient = require('prom-client');
const winston = require('winston');
const cron = require('node-cron');

// Import custom modules
const MetricsCollector = require('./metrics/collector');
const DatabaseService = require('./services/database');
const UserService = require('./services/users');
const OrderService = require('./services/orders');

const app = express();
const PORT = process.env.PORT || 3000;

// Configure Winston logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

// Initialize metrics collector
const metricsCollector = new MetricsCollector();

// Create Prometheus registry
const register = new promClient.Registry();

// Add default metrics
promClient.collectDefaultMetrics({
  register,
  prefix: 'nodejs_app_',
});

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs
  message: 'Too many requests from this IP',
  standardHeaders: true,
  legacyHeaders: false,
});

// Middleware setup
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(limiter);

// Response time middleware with custom metrics
app.use(responseTime((req, res, time) => {
  metricsCollector.recordResponseTime(req.method, req.route?.path || req.path, res.statusCode, time);
}));

// Custom middleware for request tracking
app.use((req, res, next) => {
  const startTime = Date.now();
  
  // Track active requests
  metricsCollector.incrementActiveRequests();
  
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    metricsCollector.decrementActiveRequests();
    metricsCollector.recordRequestDuration(req.method, req.path, res.statusCode, duration);
    
    // Log request
    logger.info('HTTP Request', {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: duration,
      userAgent: req.get('User-Agent'),
      ip: req.ip
    });
  });
  
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  const healthInfo = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: process.version,
    environment: process.env.NODE_ENV || 'development'
  };
  
  metricsCollector.recordHealthCheck(true);
  res.json(healthInfo);
});

// Ready check endpoint
app.get('/ready', async (req, res) => {
  try {
    // Check database connection
    const dbStatus = await DatabaseService.checkConnection();
    
    if (dbStatus.connected) {
      res.status(200).json({ status: 'ready', database: 'connected' });
    } else {
      res.status(503).json({ status: 'not ready', database: 'disconnected' });
    }
  } catch (error) {
    logger.error('Readiness check failed', { error: error.message });
    res.status(503).json({ status: 'not ready', error: error.message });
  }
});

// Prometheus metrics endpoint
app.get('/metrics', async (req, res) => {
  try {
    res.set('Content-Type', register.contentType);
    const metrics = await register.metrics();
    res.end(metrics);
  } catch (error) {
    logger.error('Failed to generate metrics', { error: error.message });
    res.status(500).end();
  }
});

// API Routes
app.use('/api/users', require('./routes/users'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/analytics', require('./routes/analytics'));

// Simulate business operations
app.post('/api/simulate/load', (req, res) => {
  const { requests = 100, delay = 100 } = req.body;
  
  metricsCollector.incrementSimulationRequests();
  
  // Simulate CPU intensive work
  const start = Date.now();
  let result = 0;
  
  for (let i = 0; i < requests * 1000; i++) {
    result += Math.sqrt(i);
  }
  
  setTimeout(() => {
    const duration = Date.now() - start;
    metricsCollector.recordSimulationTime(duration);
    
    res.json({
      message: 'Load simulation completed',
      requests: requests,
      duration: duration,
      result: result
    });
  }, delay);
});

// Error simulation endpoint
app.post('/api/simulate/error', (req, res) => {
  const { errorType = 'generic', probability = 0.5 } = req.body;
  
  if (Math.random() < probability) {
    metricsCollector.incrementErrorSimulation(errorType);
    
    switch (errorType) {
      case 'timeout':
        setTimeout(() => {
          res.status(408).json({ error: 'Request timeout' });
        }, 5000);
        break;
      case 'server_error':
        res.status(500).json({ error: 'Internal server error' });
        break;
      case 'not_found':
        res.status(404).json({ error: 'Resource not found' });
        break;
      default:
        res.status(400).json({ error: 'Bad request' });
    }
  } else {
    res.json({ message: 'No error simulated' });
  }
});

// Database metrics endpoint
app.get('/api/database/metrics', async (req, res) => {
  try {
    const dbMetrics = await DatabaseService.getMetrics();
    metricsCollector.recordDatabaseMetrics(dbMetrics);
    res.json(dbMetrics);
  } catch (error) {
    logger.error('Failed to get database metrics', { error: error.message });
    res.status(500).json({ error: 'Failed to retrieve database metrics' });
  }
});

// Global error handler
app.use((error, req, res, next) => {
  logger.error('Unhandled error', {
    error: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method
  });
  
  metricsCollector.incrementUnhandledErrors();
  
  res.status(500).json({
    error: 'Internal server error',
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use((req, res) => {
  metricsCollector.increment404Errors();
  res.status(404).json({ error: 'Not found' });
});

// Scheduled tasks for system metrics collection
cron.schedule('*/10 * * * * *', () => {
  metricsCollector.collectSystemMetrics();
});

// Business metrics collection every minute
cron.schedule('0 * * * * *', async () => {
  try {
    const businessMetrics = await collectBusinessMetrics();
    metricsCollector.recordBusinessMetrics(businessMetrics);
  } catch (error) {
    logger.error('Failed to collect business metrics', { error: error.message });
  }
});

async function collectBusinessMetrics() {
  const [userCount, orderCount, revenue] = await Promise.all([
    UserService.getTotalCount(),
    OrderService.getTotalCount(),
    OrderService.getTotalRevenue()
  ]);
  
  return {
    totalUsers: userCount,
    totalOrders: orderCount,
    totalRevenue: revenue,
    timestamp: new Date()
  };
}

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  
  server.close(() => {
    logger.info('Process terminated');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  
  server.close(() => {
    logger.info('Process terminated');
    process.exit(0);
  });
});

// Start server
const server = app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
  console.log(`📊 Metrics available at http://localhost:${PORT}/metrics`);
  console.log(`❤️  Health check at http://localhost:${PORT}/health`);
});

module.exports = app;
