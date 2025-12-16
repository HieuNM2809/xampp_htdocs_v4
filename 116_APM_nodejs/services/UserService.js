const { createCustomSpan, captureError, addLabels } = require('../apm');

class UserService {
  constructor(databaseService, redisService) {
    this.db = databaseService;
    this.redis = redisService;
  }

  async getAllUsers() {
    const span = createCustomSpan('get_all_users', 'custom');
    
    try {
      span.addLabels({
        'service.name': 'UserService',
        'service.operation': 'getAllUsers'
      });

      // Try cache first
      const cacheKey = 'users:all';
      let users = await this.redis.get(cacheKey);
      
      if (users) {
        span.addLabels({
          'cache.hit': true,
          'result.count': users.length
        });
        span.end();
        return users;
      }

      // Cache miss - fetch from database
      users = await this.db.findAll('users', 'ORDER BY created_at DESC');
      
      // Cache for 5 minutes
      if (users.length > 0) {
        await this.redis.set(cacheKey, users, 300);
      }
      
      span.addLabels({
        'cache.hit': false,
        'result.count': users.length,
        'database.query': true
      });
      
      span.end();
      return users;
    } catch (error) {
      span.end();
      captureError(error, {
        custom: {
          service: 'UserService',
          method: 'getAllUsers',
          component: 'user_service'
        }
      });
      throw error;
    }
  }

  async getUserById(id) {
    const span = createCustomSpan('get_user_by_id', 'custom');
    
    try {
      span.addLabels({
        'service.name': 'UserService',
        'service.operation': 'getUserById',
        'user.id': id
      });

      // Validate input
      if (!id || isNaN(id)) {
        const error = new Error('Invalid user ID');
        error.statusCode = 400;
        throw error;
      }

      // Try cache first
      const cacheKey = `user:${id}`;
      let user = await this.redis.get(cacheKey);
      
      if (user) {
        span.addLabels({
          'cache.hit': true,
          'user.found': true
        });
        span.end();
        return user;
      }

      // Cache miss - fetch from database
      user = await this.db.findById('users', id);
      
      if (user) {
        // Cache for 10 minutes
        await this.redis.set(cacheKey, user, 600);
        
        span.addLabels({
          'cache.hit': false,
          'user.found': true,
          'user.email': user.email,
          'user.city': user.city
        });
      } else {
        span.addLabels({
          'cache.hit': false,
          'user.found': false
        });
      }
      
      span.end();
      return user;
    } catch (error) {
      span.end();
      captureError(error, {
        custom: {
          service: 'UserService',
          method: 'getUserById',
          userId: id,
          component: 'user_service'
        }
      });
      throw error;
    }
  }

  async createUser(userData) {
    const span = createCustomSpan('create_user', 'custom');
    
    try {
      span.addLabels({
        'service.name': 'UserService',
        'service.operation': 'createUser',
        'user.email': userData.email
      });

      // Validate required fields
      const requiredFields = ['name', 'email'];
      const missingFields = requiredFields.filter(field => !userData[field]);
      
      if (missingFields.length > 0) {
        const error = new Error(`Missing required fields: ${missingFields.join(', ')}`);
        error.statusCode = 400;
        throw error;
      }

      // Check if email already exists
      const existingUser = await this.db.query(
        'SELECT id FROM users WHERE email = $1',
        [userData.email]
      );
      
      if (existingUser.rows.length > 0) {
        const error = new Error('Email already exists');
        error.statusCode = 409;
        throw error;
      }

      // Create user
      const newUser = await this.db.insert('users', {
        name: userData.name,
        email: userData.email,
        age: userData.age || null,
        city: userData.city || null
      });

      // Invalidate cache
      await this.redis.del('users:all');
      
      // Cache new user
      await this.redis.set(`user:${newUser.id}`, newUser, 600);
      
      span.addLabels({
        'user.created': true,
        'user.id': newUser.id
      });
      
      span.end();
      return newUser;
    } catch (error) {
      span.end();
      captureError(error, {
        custom: {
          service: 'UserService',
          method: 'createUser',
          userData: JSON.stringify(userData),
          component: 'user_service'
        }
      });
      throw error;
    }
  }

  async updateUser(id, updateData) {
    const span = createCustomSpan('update_user', 'custom');
    
    try {
      span.addLabels({
        'service.name': 'UserService',
        'service.operation': 'updateUser',
        'user.id': id
      });

      // Validate input
      if (!id || isNaN(id)) {
        const error = new Error('Invalid user ID');
        error.statusCode = 400;
        throw error;
      }

      // Check if user exists
      const existingUser = await this.db.findById('users', id);
      if (!existingUser) {
        const error = new Error('User not found');
        error.statusCode = 404;
        throw error;
      }

      // Check email uniqueness if email is being updated
      if (updateData.email && updateData.email !== existingUser.email) {
        const emailCheck = await this.db.query(
          'SELECT id FROM users WHERE email = $1 AND id != $2',
          [updateData.email, id]
        );
        
        if (emailCheck.rows.length > 0) {
          const error = new Error('Email already exists');
          error.statusCode = 409;
          throw error;
        }
      }

      // Update user
      const updatedUser = await this.db.update('users', id, updateData);
      
      // Update cache
      await this.redis.set(`user:${id}`, updatedUser, 600);
      
      // Invalidate list cache
      await this.redis.del('users:all');
      
      span.addLabels({
        'user.updated': true,
        'updated_fields': Object.keys(updateData).join(',')
      });
      
      span.end();
      return updatedUser;
    } catch (error) {
      span.end();
      captureError(error, {
        custom: {
          service: 'UserService',
          method: 'updateUser',
          userId: id,
          updateData: JSON.stringify(updateData),
          component: 'user_service'
        }
      });
      throw error;
    }
  }

  async deleteUser(id) {
    const span = createCustomSpan('delete_user', 'custom');
    
    try {
      span.addLabels({
        'service.name': 'UserService',
        'service.operation': 'deleteUser',
        'user.id': id
      });

      // Validate input
      if (!id || isNaN(id)) {
        const error = new Error('Invalid user ID');
        error.statusCode = 400;
        throw error;
      }

      // Check if user exists
      const existingUser = await this.db.findById('users', id);
      if (!existingUser) {
        const error = new Error('User not found');
        error.statusCode = 404;
        throw error;
      }

      // Check if user has orders (business logic)
      const userOrders = await this.db.query(
        'SELECT COUNT(*) as order_count FROM orders WHERE user_id = $1',
        [id]
      );
      
      const orderCount = parseInt(userOrders.rows[0].order_count);
      
      if (orderCount > 0) {
        const error = new Error(`Cannot delete user with ${orderCount} orders`);
        error.statusCode = 409;
        throw error;
      }

      // Delete user
      const deletedUser = await this.db.delete('users', id);
      
      // Remove from cache
      await this.redis.del(`user:${id}`);
      await this.redis.del('users:all');
      
      span.addLabels({
        'user.deleted': true,
        'user.email': deletedUser.email
      });
      
      span.end();
      return deletedUser;
    } catch (error) {
      span.end();
      captureError(error, {
        custom: {
          service: 'UserService',
          method: 'deleteUser',
          userId: id,
          component: 'user_service'
        }
      });
      throw error;
    }
  }

  async getUsersWithOrders() {
    const span = createCustomSpan('get_users_with_orders', 'custom');
    
    try {
      const cacheKey = 'users:with_orders';
      let result = await this.redis.get(cacheKey);
      
      if (result) {
        span.addLabels({
          'cache.hit': true,
          'result.count': result.length
        });
        span.end();
        return result;
      }

      // Fetch from database
      result = await this.db.getUsersWithOrders();
      
      // Cache for 2 minutes (more dynamic data)
      if (result.length > 0) {
        await this.redis.set(cacheKey, result, 120);
      }
      
      span.addLabels({
        'cache.hit': false,
        'result.count': result.length,
        'database.join_query': true
      });
      
      span.end();
      return result;
    } catch (error) {
      span.end();
      captureError(error, {
        custom: {
          service: 'UserService',
          method: 'getUsersWithOrders',
          component: 'user_service'
        }
      });
      throw error;
    }
  }

  async getUserOrders(userId) {
    const span = createCustomSpan('get_user_orders', 'custom');
    
    try {
      span.addLabels({
        'service.name': 'UserService',
        'service.operation': 'getUserOrders',
        'user.id': userId
      });

      const cacheKey = `user:${userId}:orders`;
      let orders = await this.redis.get(cacheKey);
      
      if (orders) {
        span.addLabels({
          'cache.hit': true,
          'orders.count': orders.length
        });
        span.end();
        return orders;
      }

      // Fetch from database
      orders = await this.db.getOrdersByUserId(userId);
      
      // Cache for 1 minute (order data changes frequently)
      if (orders.length > 0) {
        await this.redis.set(cacheKey, orders, 60);
      }
      
      span.addLabels({
        'cache.hit': false,
        'orders.count': orders.length,
        'database.join_query': true
      });
      
      span.end();
      return orders;
    } catch (error) {
      span.end();
      captureError(error, {
        custom: {
          service: 'UserService',
          method: 'getUserOrders',
          userId,
          component: 'user_service'
        }
      });
      throw error;
    }
  }

  async searchUsers(query, limit = 10) {
    const span = createCustomSpan('search_users', 'custom');
    
    try {
      span.addLabels({
        'service.name': 'UserService',
        'service.operation': 'searchUsers',
        'search.query': query,
        'search.limit': limit
      });

      if (!query || query.trim().length < 2) {
        const error = new Error('Search query must be at least 2 characters');
        error.statusCode = 400;
        throw error;
      }

      const searchQuery = `
        SELECT * FROM users 
        WHERE name ILIKE $1 OR email ILIKE $1 OR city ILIKE $1
        ORDER BY 
          CASE WHEN name ILIKE $2 THEN 1 ELSE 2 END,
          created_at DESC
        LIMIT $3
      `;
      
      const searchPattern = `%${query.trim()}%`;
      const exactPattern = `${query.trim()}%`;
      
      const result = await this.db.query(searchQuery, [
        searchPattern, 
        exactPattern, 
        limit
      ]);
      
      span.addLabels({
        'search.results': result.rows.length,
        'search.pattern': searchPattern
      });
      
      span.end();
      return result.rows;
    } catch (error) {
      span.end();
      captureError(error, {
        custom: {
          service: 'UserService',
          method: 'searchUsers',
          query,
          limit,
          component: 'user_service'
        }
      });
      throw error;
    }
  }
}

module.exports = UserService;
