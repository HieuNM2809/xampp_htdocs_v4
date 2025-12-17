// APM must be initialized first, before any other modules
const apm = require('./apm');

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const config = require('./config');

const app = express();
const PORT = config.app.port;

// Middleware setup
app.use(helmet()); // Security headers
app.use(cors()); // Enable CORS
app.use(express.json({ limit: '10mb' })); // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies

// Request logging middleware with APM integration
app.use((req, res, next) => {
  const startTime = Date.now();

  // Add custom labels to APM transaction
  apm.addLabels({
    method: req.method,
    url: req.url,
    userAgent: req.get('User-Agent'),
    ip: req.ip
  });

  res.on('finish', () => {
    const duration = Date.now() - startTime;
    console.log(`${req.method} ${req.url} - ${res.statusCode} - ${duration}ms`);

    // Add response time as custom labels (APM automatically tracks response time)
    apm.addLabels({
      response_time_ms: duration,
      status_code: res.statusCode
    });
  });

  next();
});

// Routes

// Health check endpoint
app.get('/health', (req, res) => {
  const healthcheck = {
    uptime: process.uptime(),
    message: 'OK',
    timestamp: Date.now(),
    service: config.apm.serviceName,
    environment: config.apm.environment,
    apm: {
      active: apm.isStarted(),
      serviceUrl: config.apm.serverUrl
    }
  };

  res.status(200).json(healthcheck);
});

// API routes
app.get('/api/users', async (req, res) => {
  // Custom APM span for database simulation
  const span = apm.startSpan('fetch-users');

  try {
    // Simulate async operation (database call)
    await new Promise(resolve => setTimeout(resolve, 100));

    const users = [
      { id: 1, name: 'John Doe', email: 'john@example.com' },
      { id: 2, name: 'Jane Smith', email: 'jane@example.com' },
      { id: 3, name: 'Mike Johnson', email: 'mike@example.com' }
    ];

    // Add custom metadata to span
    span.addLabels({
      operation: 'get_users',
      count: users.length
    });

    res.json({
      success: true,
      data: users,
      count: users.length
    });
  } catch (error) {
    // Capture error in APM
    apm.captureError(error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  } finally {
    span.end();
  }
});

// API endpoint to create user
app.post('/api/users', async (req, res) => {
  const span = apm.startSpan('create-user');

  try {
    const { name, email } = req.body;

    // Input validation
    if (!name || !email) {
      const error = new Error('Missing required fields: name, email');
      apm.captureError(error);
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
    }

    // Simulate database operation
    await new Promise(resolve => setTimeout(resolve, 200));

    const newUser = {
      id: Math.floor(Math.random() * 1000),
      name,
      email,
      createdAt: new Date().toISOString()
    };

    span.addLabels({
      operation: 'create_user',
      userId: newUser.id
    });

    res.status(201).json({
      success: true,
      data: newUser
    });
  } catch (error) {
    apm.captureError(error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  } finally {
    span.end();
  }
});

// Endpoint to simulate error for APM testing
app.get('/api/error', (req, res) => {
  const error = new Error('This is a test error for APM monitoring');
  error.statusCode = 500;

  // Capture error with custom context
  apm.captureError(error, {
    request: req,
    custom: {
      endpoint: '/api/error',
      testError: true
    }
  });

  res.status(500).json({
    success: false,
    error: 'Test error occurred'
  });
});

// Endpoint to test performance monitoring
app.get('/api/slow', async (req, res) => {
  const span = apm.startSpan('slow-operation');

  try {
    // Simulate slow operation
    const delay = Math.floor(Math.random() * 2000) + 1000; // 1-3 seconds
    await new Promise(resolve => setTimeout(resolve, delay));

    span.addLabels({
      operation: 'slow_operation',
      delay: delay
    });

    res.json({
      success: true,
      message: `Operation completed in ${delay}ms`,
      delay: delay
    });
  } catch (error) {
    apm.captureError(error);
    res.status(500).json({
      success: false,
      error: 'Error in slow operation'
    });
  } finally {
    span.end();
  }
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found'
  });
});

// Global error handler
app.use((err, req, res, next) => {
  // Capture error in APM
  apm.captureError(err);

  console.error('Global error handler:', err);

  res.status(err.status || 500).json({
    success: false,
    error: config.app.env === 'development' ? err.message : 'Internal server error'
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  apm.destroy();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  apm.destroy();
  process.exit(0);
});

// Start server
app.listen(PORT, () => {
  console.log('🚀 Server is running!');
  console.log(`📍 Port: ${PORT}`);
  console.log(`🌍 Environment: ${config.app.env}`);
  console.log(`📊 APM Service: ${config.apm.serviceName}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
  console.log('');
  console.log('Available endpoints:');
  console.log(`  GET  /health        - Health check`);
  console.log(`  GET  /api/users     - Get users list`);
  console.log(`  POST /api/users     - Create new user`);
  console.log(`  GET  /api/error     - Test error monitoring`);
  console.log(`  GET  /api/slow      - Test performance monitoring`);
});

module.exports = app;
