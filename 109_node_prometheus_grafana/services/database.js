const { performance } = require('perf_hooks');

class DatabaseService {
  constructor() {
    this.connectionCount = 0;
    this.maxConnections = 100;
    this.queryHistory = [];
    this.isConnected = true;
  }

  async checkConnection() {
    const start = performance.now();
    
    // Simulate database connection check
    await this.simulateDelay(10, 50);
    
    const duration = performance.now() - start;
    
    return {
      connected: this.isConnected,
      responseTime: duration,
      connectionCount: this.connectionCount,
      maxConnections: this.maxConnections
    };
  }

  async executeQuery(queryType, table, query) {
    const start = performance.now();
    this.connectionCount++;
    
    try {
      // Simulate different query types with different delays
      let delay;
      switch (queryType) {
        case 'SELECT':
          delay = this.getRandomDelay(5, 50);
          break;
        case 'INSERT':
          delay = this.getRandomDelay(10, 100);
          break;
        case 'UPDATE':
          delay = this.getRandomDelay(15, 80);
          break;
        case 'DELETE':
          delay = this.getRandomDelay(10, 60);
          break;
        default:
          delay = this.getRandomDelay(10, 100);
      }
      
      await this.simulateDelay(delay);
      
      const duration = performance.now() - start;
      
      const queryRecord = {
        type: queryType,
        table,
        duration,
        timestamp: new Date(),
        success: Math.random() > 0.05 // 95% success rate
      };
      
      this.queryHistory.push(queryRecord);
      
      // Keep only last 1000 queries in memory
      if (this.queryHistory.length > 1000) {
        this.queryHistory = this.queryHistory.slice(-1000);
      }
      
      return {
        success: queryRecord.success,
        duration,
        affectedRows: queryType === 'SELECT' ? Math.floor(Math.random() * 100) : Math.floor(Math.random() * 10)
      };
      
    } finally {
      this.connectionCount--;
    }
  }

  async getMetrics() {
    const recentQueries = this.queryHistory.slice(-100);
    const avgDuration = recentQueries.reduce((sum, q) => sum + q.duration, 0) / recentQueries.length || 0;
    const successRate = recentQueries.filter(q => q.success).length / recentQueries.length || 1;
    
    return {
      connectionCount: this.connectionCount,
      maxConnections: this.maxConnections,
      totalQueries: this.queryHistory.length,
      avgQueryDuration: avgDuration,
      successRate: successRate,
      queryTypes: this.getQueryTypeStats(),
      slowQueries: recentQueries.filter(q => q.duration > 100).length,
      recentErrors: recentQueries.filter(q => !q.success).length
    };
  }

  getQueryTypeStats() {
    const recentQueries = this.queryHistory.slice(-100);
    const stats = {};
    
    recentQueries.forEach(query => {
      if (!stats[query.type]) {
        stats[query.type] = { count: 0, avgDuration: 0 };
      }
      stats[query.type].count++;
    });
    
    // Calculate average duration for each type
    Object.keys(stats).forEach(type => {
      const queriesOfType = recentQueries.filter(q => q.type === type);
      const totalDuration = queriesOfType.reduce((sum, q) => sum + q.duration, 0);
      stats[type].avgDuration = totalDuration / queriesOfType.length;
    });
    
    return stats;
  }

  // Simulate connection issues periodically
  simulateConnectionIssues() {
    setInterval(() => {
      // Randomly simulate connection issues (1% chance every minute)
      if (Math.random() < 0.01) {
        this.isConnected = false;
        console.log('Database connection lost (simulated)');
        
        // Restore connection after 5-30 seconds
        setTimeout(() => {
          this.isConnected = true;
          console.log('Database connection restored');
        }, this.getRandomDelay(5000, 30000));
      }
    }, 60000);
  }

  async simulateDelay(min = 10, max = 100) {
    const delay = this.getRandomDelay(min, max);
    return new Promise(resolve => setTimeout(resolve, delay));
  }

  getRandomDelay(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  // Simulate table-specific operations
  async getUserCount() {
    const result = await this.executeQuery('SELECT', 'users', 'SELECT COUNT(*) FROM users');
    return result.success ? Math.floor(Math.random() * 10000) + 1000 : 0;
  }

  async getOrderCount() {
    const result = await this.executeQuery('SELECT', 'orders', 'SELECT COUNT(*) FROM orders');
    return result.success ? Math.floor(Math.random() * 5000) + 100 : 0;
  }

  async getRevenue() {
    const result = await this.executeQuery('SELECT', 'orders', 'SELECT SUM(amount) FROM orders');
    return result.success ? Math.floor(Math.random() * 1000000) + 50000 : 0;
  }

  // Simulate batch operations
  async executeBatch(queries) {
    const results = [];
    const start = performance.now();
    
    for (const query of queries) {
      const result = await this.executeQuery(query.type, query.table, query.sql);
      results.push(result);
    }
    
    const totalDuration = performance.now() - start;
    
    return {
      results,
      totalDuration,
      successCount: results.filter(r => r.success).length,
      errorCount: results.filter(r => !r.success).length
    };
  }

  // Connection pool simulation
  getConnectionPoolStatus() {
    const activeConnections = this.connectionCount;
    const idleConnections = Math.max(0, Math.floor(Math.random() * 20) - activeConnections);
    
    return {
      active: activeConnections,
      idle: idleConnections,
      total: activeConnections + idleConnections,
      maxConnections: this.maxConnections,
      utilization: ((activeConnections + idleConnections) / this.maxConnections * 100).toFixed(2)
    };
  }
}

// Export singleton instance
module.exports = new DatabaseService();
