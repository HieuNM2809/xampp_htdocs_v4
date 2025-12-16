const { Pool } = require('pg');
const { apm, createCustomSpan, captureError } = require('../apm');

class DatabaseService {
  constructor() {
    this.pool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME || 'apm_demo',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    this.pool.on('error', (err) => {
      console.error('PostgreSQL pool error:', err);
      captureError(err, {
        custom: {
          component: 'database_pool',
          action: 'pool_error'
        }
      });
    });

    this.init();
  }

  async init() {
    try {
      // Test connection
      const client = await this.pool.connect();
      console.log('📊 PostgreSQL connected successfully');
      client.release();
      
      // Create tables if not exist
      await this.createTables();
    } catch (error) {
      console.error('❌ PostgreSQL connection failed:', error);
      captureError(error, {
        custom: {
          component: 'database_service',
          action: 'connection_failed'
        }
      });
    }
  }

  async createTables() {
    const createUsersTable = `
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        age INTEGER,
        city VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    const createOrdersTable = `
      CREATE TABLE IF NOT EXISTS orders (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        product_name VARCHAR(255) NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        status VARCHAR(50) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    try {
      const span = createCustomSpan('create_tables', 'database');
      await this.pool.query(createUsersTable);
      await this.pool.query(createOrdersTable);
      
      // Insert sample data if table is empty
      await this.insertSampleData();
      
      span.end();
      console.log('✅ Database tables created/verified');
    } catch (error) {
      captureError(error, {
        custom: {
          component: 'database_service',
          action: 'create_tables'
        }
      });
      throw error;
    }
  }

  async insertSampleData() {
    try {
      // Check if users exist
      const userCount = await this.pool.query('SELECT COUNT(*) FROM users');
      
      if (parseInt(userCount.rows[0].count) === 0) {
        const insertUsers = `
          INSERT INTO users (name, email, age, city) VALUES
          ('Nguyễn Văn A', 'a@example.com', 25, 'Hà Nội'),
          ('Trần Thị B', 'b@example.com', 30, 'Hồ Chí Minh'),
          ('Lê Văn C', 'c@example.com', 28, 'Đà Nẵng'),
          ('Phạm Thị D', 'd@example.com', 32, 'Cần Thơ'),
          ('Hoàng Văn E', 'e@example.com', 27, 'Hải Phòng')
        `;
        
        await this.pool.query(insertUsers);
        
        // Insert sample orders
        const insertOrders = `
          INSERT INTO orders (user_id, product_name, amount, status) VALUES
          (1, 'Laptop Dell', 15000000, 'completed'),
          (1, 'Mouse Logitech', 500000, 'pending'),
          (2, 'iPhone 15', 25000000, 'completed'),
          (3, 'Samsung Monitor', 8000000, 'shipping'),
          (4, 'Mechanical Keyboard', 2000000, 'pending'),
          (5, 'Webcam HD', 1500000, 'completed')
        `;
        
        await this.pool.query(insertOrders);
        console.log('✅ Sample data inserted');
      }
    } catch (error) {
      captureError(error, {
        custom: {
          component: 'database_service',
          action: 'insert_sample_data'
        }
      });
      // Don't throw, sample data is optional
      console.warn('⚠️  Could not insert sample data:', error.message);
    }
  }

  async query(text, params = []) {
    const span = createCustomSpan('database_query', 'database');
    const start = Date.now();
    
    try {
      span.addLabels({
        'db.statement': text.substring(0, 100), // First 100 chars
        'db.type': 'postgresql'
      });
      
      const result = await this.pool.query(text, params);
      const duration = Date.now() - start;
      
      span.addLabels({
        'db.rows_affected': result.rowCount || 0,
        'db.duration_ms': duration
      });
      
      if (duration > 1000) {
        console.warn(`🐌 Slow query (${duration}ms):`, text.substring(0, 50));
      }
      
      span.end();
      return result;
    } catch (error) {
      span.end();
      captureError(error, {
        custom: {
          query: text.substring(0, 200),
          params: JSON.stringify(params),
          component: 'database_service'
        }
      });
      throw error;
    }
  }

  async findAll(table, conditions = '', params = []) {
    const query = `SELECT * FROM ${table} ${conditions}`;
    const result = await this.query(query, params);
    return result.rows;
  }

  async findById(table, id) {
    const query = `SELECT * FROM ${table} WHERE id = $1`;
    const result = await this.query(query, [id]);
    return result.rows[0] || null;
  }

  async insert(table, data) {
    const keys = Object.keys(data);
    const values = Object.values(data);
    const placeholders = keys.map((_, index) => `$${index + 1}`).join(', ');
    
    const query = `
      INSERT INTO ${table} (${keys.join(', ')}) 
      VALUES (${placeholders}) 
      RETURNING *
    `;
    
    const result = await this.query(query, values);
    return result.rows[0];
  }

  async update(table, id, data) {
    const keys = Object.keys(data);
    const values = Object.values(data);
    const setClause = keys.map((key, index) => `${key} = $${index + 2}`).join(', ');
    
    const query = `
      UPDATE ${table} 
      SET ${setClause}, updated_at = CURRENT_TIMESTAMP 
      WHERE id = $1 
      RETURNING *
    `;
    
    const result = await this.query(query, [id, ...values]);
    return result.rows[0];
  }

  async delete(table, id) {
    const query = `DELETE FROM ${table} WHERE id = $1 RETURNING *`;
    const result = await this.query(query, [id]);
    return result.rows[0];
  }

  // Advanced queries for APM demo
  async getUsersWithOrders() {
    const query = `
      SELECT 
        u.id, u.name, u.email, u.city,
        COUNT(o.id) as order_count,
        COALESCE(SUM(o.amount), 0) as total_spent
      FROM users u
      LEFT JOIN orders o ON u.id = o.user_id
      GROUP BY u.id, u.name, u.email, u.city
      ORDER BY total_spent DESC
    `;
    
    const result = await this.query(query);
    return result.rows;
  }

  async getOrdersByUserId(userId) {
    const query = `
      SELECT o.*, u.name as user_name, u.email as user_email
      FROM orders o
      JOIN users u ON o.user_id = u.id
      WHERE u.id = $1
      ORDER BY o.created_at DESC
    `;
    
    const result = await this.query(query, [userId]);
    return result.rows;
  }

  async getStats() {
    const span = createCustomSpan('calculate_database_stats', 'custom');
    
    try {
      const [userStats, orderStats, revenueStats] = await Promise.all([
        this.query('SELECT COUNT(*) as total_users FROM users'),
        this.query('SELECT COUNT(*) as total_orders, COUNT(DISTINCT user_id) as unique_customers FROM orders'),
        this.query(`
          SELECT 
            SUM(amount) as total_revenue,
            AVG(amount) as avg_order_value,
            COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_orders
          FROM orders
        `)
      ]);
      
      span.end();
      
      return {
        users: parseInt(userStats.rows[0].total_users),
        orders: parseInt(orderStats.rows[0].total_orders),
        unique_customers: parseInt(orderStats.rows[0].unique_customers),
        total_revenue: parseFloat(revenueStats.rows[0].total_revenue) || 0,
        avg_order_value: parseFloat(revenueStats.rows[0].avg_order_value) || 0,
        completed_orders: parseInt(revenueStats.rows[0].completed_orders)
      };
    } catch (error) {
      span.end();
      throw error;
    }
  }

  async close() {
    try {
      await this.pool.end();
      console.log('📊 PostgreSQL pool closed');
    } catch (error) {
      captureError(error, {
        custom: {
          component: 'database_service',
          action: 'close_pool'
        }
      });
      console.error('❌ Error closing PostgreSQL pool:', error);
    }
  }
}

module.exports = DatabaseService;
