#!/usr/bin/env node

/**
 * E-commerce Database Setup Script
 * Creates keyspace và all required tables for the e-commerce system
 */

const cassandra = require('cassandra-driver');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

class EcommerceSetup {
    constructor() {
        this.client = null;
        this.schemasDir = path.join(__dirname, '..', 'schemas');
    }

    async run() {
        console.log('🚀 E-commerce Database Setup Starting...');
        console.log('📊 This will create a complete e-commerce schema in Cassandra\n');

        try {
            await this.connect();
            await this.executeSchemas();
            await this.verifySetup();
            console.log('\n🎉 E-commerce database setup completed successfully!');

        } catch (error) {
            console.error('\n❌ Setup failed:', error);
            process.exit(1);
        } finally {
            await this.disconnect();
        }
    }

    async connect() {
        try {
            console.log('🔌 Connecting to Cassandra cluster...');

            // Connect without keyspace first to create keyspace
            this.client = new cassandra.Client({
                contactPoints: process.env.CASSANDRA_HOSTS?.split(',') || ['127.0.0.1'],
                localDataCenter: process.env.CASSANDRA_LOCAL_DC || 'datacenter1',
                credentials: process.env.CASSANDRA_USERNAME && process.env.CASSANDRA_PASSWORD ? {
                    username: process.env.CASSANDRA_USERNAME,
                    password: process.env.CASSANDRA_PASSWORD
                } : undefined
            });

            await this.client.connect();
            console.log('✅ Connected to Cassandra cluster');

        } catch (error) {
            console.error('❌ Connection failed:', error);
            throw error;
        }
    }

    async executeSchemas() {
        console.log('\n📋 Executing schema files...');

        // Get all schema files in order
        const schemaFiles = [
            '01-keyspace.cql',
            '02-users.cql',
            '03-products.cql',
            '04-orders.cql',
            '05-inventory.cql',
            '06-analytics.cql'
        ];

        for (const filename of schemaFiles) {
            await this.executeSchemaFile(filename);
        }
    }

    async executeSchemaFile(filename) {
        const filePath = path.join(this.schemasDir, filename);

        try {
            console.log(`📄 Processing: ${filename}`);

            if (!fs.existsSync(filePath)) {
                console.warn(`⚠️ Schema file not found: ${filename}`);
                return;
            }

            const sqlContent = fs.readFileSync(filePath, 'utf8');

            // Split by semicolon và execute each statement
            const statements = this.parseCQLStatements(sqlContent);

            for (const statement of statements) {
                if (statement.trim()) {
                    try {
                        await this.client.execute(statement);

                        // Extract operation type for logging
                        const operation = this.extractOperation(statement);
                        if (operation) {
                            console.log(`   ✅ ${operation}`);
                        }

                    } catch (error) {
                        // Check if it's a "already exists" error (which is OK)
                        if (error.message.includes('already exists') ||
                            error.message.includes('Cannot add existing keyspace')) {
                            console.log(`   ⚠️ Already exists - skipping`);
                        } else {
                            console.error(`   ❌ Error executing statement: ${error.message}`);
                            console.error(`   Statement: ${statement.substring(0, 100)}...`);
                            throw error;
                        }
                    }
                }
            }

            console.log(`   📋 ${filename} completed\n`);

        } catch (error) {
            console.error(`❌ Error processing ${filename}:`, error);
            throw error;
        }
    }

    parseCQLStatements(content) {
        // Remove comments và split statements
        const cleanContent = content
            .replace(/--[^\r\n]*/g, '') // Remove -- comments
            .replace(/\/\*[\s\S]*?\*\//g, '') // Remove /* */ comments
            .replace(/\s+/g, ' ') // Normalize whitespace
            .trim();

        // Split by semicolon but be careful with strings
        const statements = [];
        let current = '';
        let inString = false;
        let stringChar = '';

        for (let i = 0; i < cleanContent.length; i++) {
            const char = cleanContent[i];

            if (!inString && (char === "'" || char === '"')) {
                inString = true;
                stringChar = char;
            } else if (inString && char === stringChar) {
                inString = false;
                stringChar = '';
            } else if (!inString && char === ';') {
                if (current.trim()) {
                    statements.push(current.trim());
                    current = '';
                }
                continue;
            }

            current += char;
        }

        if (current.trim()) {
            statements.push(current.trim());
        }

        return statements.filter(stmt =>
            stmt &&
            !stmt.startsWith('--') &&
            !stmt.startsWith('/*') &&
            stmt.length > 10
        );
    }

    extractOperation(statement) {
        const upperStmt = statement.toUpperCase().trim();

        if (upperStmt.startsWith('CREATE KEYSPACE')) {
            const match = statement.match(/CREATE KEYSPACE\s+(\w+)/i);
            return match ? `Created keyspace: ${match[1]}` : 'Created keyspace';
        } else if (upperStmt.startsWith('CREATE TABLE')) {
            const match = statement.match(/CREATE TABLE\s+(?:\w+\.)?(\w+)/i);
            return match ? `Created table: ${match[1]}` : 'Created table';
        } else if (upperStmt.startsWith('CREATE INDEX')) {
            const match = statement.match(/CREATE INDEX\s+(\w+)/i);
            return match ? `Created index: ${match[1]}` : 'Created index';
        } else if (upperStmt.startsWith('USE')) {
            const match = statement.match(/USE\s+(\w+)/i);
            return match ? `Using keyspace: ${match[1]}` : 'Using keyspace';
        }

        return null;
    }

    async verifySetup() {
        console.log('🔍 Verifying database setup...');

        try {
            // Verify keyspace exists
            const keyspaceResult = await this.client.execute(
                "SELECT * FROM system_schema.keyspaces WHERE keyspace_name = ?",
                ['ecommerce']
            );

            if (keyspaceResult.rows.length === 0) {
                throw new Error('Keyspace "ecommerce" not found');
            }

            console.log('✅ Keyspace "ecommerce" verified');

            // Verify critical tables exist
            const criticalTables = [
                'users', 'user_logins', 'user_sessions', 'user_addresses',
                'products', 'products_by_category', 'product_inventory',
                'orders', 'orders_by_user', 'order_items',
                'shopping_carts', 'cart_items'
            ];

            const tableResult = await this.client.execute(
                "SELECT table_name FROM system_schema.tables WHERE keyspace_name = ?",
                ['ecommerce']
            );

            const existingTables = tableResult.rows.map(row => row.table_name);
            console.log(`📊 Found ${existingTables.length} tables in ecommerce keyspace`);

            // Check each critical table
            const missingTables = [];
            criticalTables.forEach(tableName => {
                if (existingTables.includes(tableName)) {
                    console.log(`   ✅ ${tableName}`);
                } else {
                    console.log(`   ❌ ${tableName} - MISSING`);
                    missingTables.push(tableName);
                }
            });

            if (missingTables.length > 0) {
                throw new Error(`Missing critical tables: ${missingTables.join(', ')}`);
            }

            // Test basic operations
            console.log('\n🧪 Testing basic operations...');

            // Test insert and select
            const testUserId = cassandra.types.Uuid.random();
            await this.client.execute(`
                INSERT INTO users (user_id, email, first_name, created_at)
                VALUES (?, ?, ?, ?)
            `, [testUserId, 'test@setup.com', 'Setup Test', new Date()]);

            const testResult = await this.client.execute(
                'SELECT * FROM users WHERE user_id = ?',
                [testUserId]
            );

            if (testResult.rows.length === 1) {
                console.log('✅ Insert/Select operations working');

                // Cleanup test data
                await this.client.execute('DELETE FROM users WHERE user_id = ?', [testUserId]);
                await this.client.execute('DELETE FROM user_logins WHERE email = ?', ['test@setup.com']);
                console.log('✅ Test cleanup completed');
            } else {
                throw new Error('Insert/Select test failed');
            }

            console.log('\n📈 Database Performance Check:');
            const healthCheck = await this.performanceCheck();
            console.log(`   Response Time: ${healthCheck.responseTime}ms`);
            console.log(`   Cluster Health: ${healthCheck.healthy ? 'HEALTHY' : 'UNHEALTHY'}`);
            console.log(`   Available Nodes: ${healthCheck.cluster.availability}`);

        } catch (error) {
            console.error('❌ Verification failed:', error);
            throw error;
        }
    }

    async performanceCheck() {
        try {
            const startTime = Date.now();
            await this.client.execute('SELECT now() FROM system.local');
            const responseTime = Date.now() - startTime;

            const hosts = this.client.hosts;
            const connectedHosts = hosts.filter(host => host.isUp()).length;

            return {
                responseTime: responseTime,
                healthy: connectedHosts >= Math.ceil(hosts.length / 2),
                cluster: {
                    connectedHosts: connectedHosts,
                    totalHosts: hosts.length,
                    availability: `${connectedHosts}/${hosts.length}`
                }
            };

        } catch (error) {
            console.error('❌ Performance check failed:', error);
            return {
                responseTime: null,
                healthy: false,
                error: error.message
            };
        }
    }

    async disconnect() {
        if (this.client) {
            try {
                await this.client.shutdown();
                console.log('🔐 Database connection closed');
            } catch (error) {
                console.error('❌ Error closing connection:', error);
            }
        }
    }
}

// ===================================
// EXECUTION
// ===================================

if (require.main === module) {
    const setup = new EcommerceSetup();

    console.log('🛒 Cassandra E-commerce Database Setup');
    console.log('📋 This will create a production-ready e-commerce schema\n');

    setup.run().then(() => {
        console.log('\n🚀 Next Steps:');
        console.log('   1. Load sample data: npm run load-sample-data');
        console.log('   2. Start API server: npm run start-ecommerce');
        console.log('   3. Run tests: npm run test-ecommerce');
        console.log('\n📚 Documentation: ecommerce-cassandra/README.md');
        process.exit(0);
    }).catch(error => {
        console.error('\n💥 Setup failed completely:', error.message);
        console.error('\n🔧 Troubleshooting:');
        console.error('   - Check Cassandra is running: docker ps | grep cassandra');
        console.error('   - Check connection settings in .env file');
        console.error('   - Verify network connectivity: telnet localhost 9042');
        process.exit(1);
    });
}

module.exports = EcommerceSetup;
