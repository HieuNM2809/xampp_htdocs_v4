const express = require('express');
const router = express.Router();
const UserService = require('../services/users');
const MetricsCollector = require('../metrics/collector');

// Initialize metrics collector
const metricsCollector = new MetricsCollector();

// Get all users (paginated)
router.get('/', async (req, res) => {
  const start = Date.now();
  
  try {
    const { page = 1, limit = 10 } = req.query;
    
    // Simulate getting paginated users
    await UserService.simulateDelay(50, 200);
    
    const users = Array.from({ length: parseInt(limit) }, (_, i) => ({
      id: (parseInt(page) - 1) * parseInt(limit) + i + 1,
      email: `user${(parseInt(page) - 1) * parseInt(limit) + i + 1}@example.com`,
      name: `User ${(parseInt(page) - 1) * parseInt(limit) + i + 1}`,
      country: UserService.getRandomCountry(),
      status: Math.random() > 0.1 ? 'active' : 'inactive',
      createdAt: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000)
    }));
    
    const duration = Date.now() - start;
    metricsCollector.recordBusinessOperation('get_users', duration, true);
    
    res.json({
      users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: await UserService.getTotalCount()
      },
      meta: {
        responseTime: duration
      }
    });
  } catch (error) {
    const duration = Date.now() - start;
    metricsCollector.recordBusinessOperation('get_users', duration, false);
    metricsCollector.recordError('api_error', 'error', 'users');
    
    res.status(500).json({
      error: 'Failed to fetch users',
      message: error.message,
      responseTime: duration
    });
  }
});

// Get user by ID
router.get('/:id', async (req, res) => {
  const start = Date.now();
  const userId = parseInt(req.params.id);
  
  try {
    const result = await UserService.getUserById(userId);
    const duration = Date.now() - start;
    
    if (result.cached) {
      metricsCollector.recordCacheHit('user_cache', 'user_by_id');
    } else {
      metricsCollector.recordCacheMiss('user_cache', 'user_by_id');
    }
    
    metricsCollector.recordBusinessOperation('get_user_by_id', duration, true);
    
    res.json({
      user: result.user,
      meta: {
        responseTime: duration,
        cached: result.cached
      }
    });
  } catch (error) {
    const duration = Date.now() - start;
    metricsCollector.recordBusinessOperation('get_user_by_id', duration, false);
    metricsCollector.recordError('user_not_found', 'info', 'users');
    
    res.status(404).json({
      error: 'User not found',
      message: error.error,
      responseTime: duration
    });
  }
});

// Create new user
router.post('/', async (req, res) => {
  const start = Date.now();
  
  try {
    const { email, name, country, source } = req.body;
    
    if (!email || !name) {
      const duration = Date.now() - start;
      metricsCollector.recordError('validation_error', 'warning', 'users');
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['email', 'name'],
        responseTime: duration
      });
    }
    
    const result = await UserService.createUser({
      email,
      name,
      country: country || 'Unknown',
      source: source || 'api'
    });
    
    const duration = Date.now() - start;
    
    // Record user registration metrics
    metricsCollector.recordUserRegistration(source || 'api', country || 'Unknown');
    metricsCollector.recordBusinessOperation('create_user', duration, true);
    
    res.status(201).json({
      user: result.user,
      meta: {
        responseTime: duration
      }
    });
  } catch (error) {
    const duration = Date.now() - start;
    metricsCollector.recordBusinessOperation('create_user', duration, false);
    metricsCollector.recordError('user_creation_failed', 'error', 'users');
    
    res.status(400).json({
      error: 'Failed to create user',
      message: error.error,
      responseTime: duration
    });
  }
});

// Update user
router.put('/:id', async (req, res) => {
  const start = Date.now();
  const userId = parseInt(req.params.id);
  
  try {
    const updateData = req.body;
    const result = await UserService.updateUser(userId, updateData);
    
    const duration = Date.now() - start;
    metricsCollector.recordBusinessOperation('update_user', duration, true);
    
    res.json({
      success: result.success,
      affectedRows: result.affectedRows,
      meta: {
        responseTime: duration
      }
    });
  } catch (error) {
    const duration = Date.now() - start;
    metricsCollector.recordBusinessOperation('update_user', duration, false);
    metricsCollector.recordError('user_update_failed', 'error', 'users');
    
    res.status(400).json({
      error: 'Failed to update user',
      message: error.error,
      responseTime: duration
    });
  }
});

// Delete user
router.delete('/:id', async (req, res) => {
  const start = Date.now();
  const userId = parseInt(req.params.id);
  
  try {
    const result = await UserService.deleteUser(userId);
    
    const duration = Date.now() - start;
    metricsCollector.recordBusinessOperation('delete_user', duration, true);
    
    res.json({
      success: result.success,
      affectedRows: result.affectedRows,
      meta: {
        responseTime: duration
      }
    });
  } catch (error) {
    const duration = Date.now() - start;
    metricsCollector.recordBusinessOperation('delete_user', duration, false);
    metricsCollector.recordError('user_deletion_failed', 'error', 'users');
    
    res.status(400).json({
      error: 'Failed to delete user',
      message: error.error,
      responseTime: duration
    });
  }
});

// User authentication
router.post('/auth/login', async (req, res) => {
  const start = Date.now();
  
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      const duration = Date.now() - start;
      metricsCollector.recordError('validation_error', 'warning', 'auth');
      return res.status(400).json({
        error: 'Missing credentials',
        responseTime: duration
      });
    }
    
    const result = await UserService.authenticateUser(email, password);
    
    const duration = Date.now() - start;
    metricsCollector.recordUserLogin(result.method, true);
    metricsCollector.recordBusinessOperation('user_authentication', duration, true);
    
    res.json({
      success: result.success,
      user: result.user,
      token: result.token,
      meta: {
        responseTime: duration,
        method: result.method
      }
    });
  } catch (error) {
    const duration = Date.now() - start;
    metricsCollector.recordUserLogin('password', false);
    metricsCollector.recordBusinessOperation('user_authentication', duration, false);
    metricsCollector.recordError('authentication_failed', 'warning', 'auth');
    
    res.status(401).json({
      error: 'Authentication failed',
      message: error.error,
      responseTime: duration
    });
  }
});

// Track user activity
router.post('/:id/activity', async (req, res) => {
  const start = Date.now();
  const userId = parseInt(req.params.id);
  
  try {
    const { activity } = req.body;
    
    if (!activity) {
      const duration = Date.now() - start;
      metricsCollector.recordError('validation_error', 'warning', 'users');
      return res.status(400).json({
        error: 'Missing activity data',
        responseTime: duration
      });
    }
    
    const result = await UserService.trackUserActivity(userId, activity);
    
    const duration = Date.now() - start;
    metricsCollector.recordBusinessOperation('track_user_activity', duration, result.success);
    
    res.json({
      success: result.success,
      activity: result.activity,
      meta: {
        responseTime: duration
      }
    });
  } catch (error) {
    const duration = Date.now() - start;
    metricsCollector.recordBusinessOperation('track_user_activity', duration, false);
    metricsCollector.recordError('activity_tracking_failed', 'error', 'users');
    
    res.status(500).json({
      error: 'Failed to track activity',
      message: error.error,
      responseTime: duration
    });
  }
});

// Bulk create users
router.post('/bulk', async (req, res) => {
  const start = Date.now();
  
  try {
    const { users } = req.body;
    
    if (!users || !Array.isArray(users)) {
      const duration = Date.now() - start;
      metricsCollector.recordError('validation_error', 'warning', 'users');
      return res.status(400).json({
        error: 'Invalid users data',
        expected: 'Array of user objects',
        responseTime: duration
      });
    }
    
    const result = await UserService.bulkCreateUsers(users);
    
    const duration = Date.now() - start;
    metricsCollector.recordBusinessOperation('bulk_create_users', duration, result.successful > 0);
    
    // Record individual registrations
    result.results.forEach(userResult => {
      if (userResult.success) {
        metricsCollector.recordUserRegistration('bulk_api', 'Unknown');
      }
    });
    
    res.json({
      total: result.total,
      successful: result.successful,
      failed: result.failed,
      results: result.results,
      meta: {
        responseTime: duration
      }
    });
  } catch (error) {
    const duration = Date.now() - start;
    metricsCollector.recordBusinessOperation('bulk_create_users', duration, false);
    metricsCollector.recordError('bulk_operation_failed', 'error', 'users');
    
    res.status(500).json({
      error: 'Bulk operation failed',
      message: error.message,
      responseTime: duration
    });
  }
});

// Get user analytics
router.get('/analytics/overview', async (req, res) => {
  const start = Date.now();
  
  try {
    const analytics = await UserService.getUserAnalytics();
    
    const duration = Date.now() - start;
    metricsCollector.recordBusinessOperation('get_user_analytics', duration, true);
    
    res.json({
      ...analytics,
      meta: {
        responseTime: duration,
        generatedAt: new Date()
      }
    });
  } catch (error) {
    const duration = Date.now() - start;
    metricsCollector.recordBusinessOperation('get_user_analytics', duration, false);
    metricsCollector.recordError('analytics_failed', 'error', 'users');
    
    res.status(500).json({
      error: 'Failed to generate analytics',
      message: error.error,
      responseTime: duration
    });
  }
});

// Get cache statistics
router.get('/cache/stats', (req, res) => {
  const start = Date.now();
  
  try {
    const cacheStats = UserService.getCacheStats();
    const duration = Date.now() - start;
    
    metricsCollector.recordBusinessOperation('get_cache_stats', duration, true);
    
    res.json({
      ...cacheStats,
      meta: {
        responseTime: duration
      }
    });
  } catch (error) {
    const duration = Date.now() - start;
    metricsCollector.recordBusinessOperation('get_cache_stats', duration, false);
    
    res.status(500).json({
      error: 'Failed to get cache stats',
      responseTime: duration
    });
  }
});

// Clear cache
router.delete('/cache', (req, res) => {
  const start = Date.now();
  
  try {
    UserService.clearCache();
    const duration = Date.now() - start;
    
    metricsCollector.recordBusinessOperation('clear_cache', duration, true);
    
    res.json({
      success: true,
      message: 'Cache cleared successfully',
      meta: {
        responseTime: duration
      }
    });
  } catch (error) {
    const duration = Date.now() - start;
    metricsCollector.recordBusinessOperation('clear_cache', duration, false);
    
    res.status(500).json({
      error: 'Failed to clear cache',
      responseTime: duration
    });
  }
});

module.exports = router;
