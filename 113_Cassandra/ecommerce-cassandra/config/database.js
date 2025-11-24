const cassandra = require('cassandra-driver');
require('dotenv').config();

class EcommerceDatabase {
    constructor() {
        this.client = null;
        this.keyspace = 'ecommerce';

        // Consistency levels for different operations
        this.consistencyLevels = {
            one: cassandra.types.consistencies.one,
            localQuorum: cassandra.types.consistencies.localQuorum,
            quorum: cassandra.types.consistencies.quorum,
            all: cassandra.types.consistencies.all
        };

        // Query timeout settings
        this.queryOptions = {
            readTimeout: 10000,    // 10 seconds for read operations
            writeTimeout: 15000,   // 15 seconds for write operations
            prepare: true,         // Always use prepared statements
            autoPage: true         // Automatic pagination for large result sets
        };
    }

    async connect() {
        try {
            console.log('🔌 Connecting to Cassandra cluster...');

            // Production cluster configuration
            this.client = new cassandra.Client({
                contactPoints: process.env.CASSANDRA_HOSTS?.split(',') || ['127.0.0.1'],
                localDataCenter: process.env.CASSANDRA_LOCAL_DC || 'datacenter1',
                keyspace: this.keyspace,

                // Authentication
                credentials: process.env.CASSANDRA_USERNAME && process.env.CASSANDRA_PASSWORD ? {
                    username: process.env.CASSANDRA_USERNAME,
                    password: process.env.CASSANDRA_PASSWORD
                } : undefined,

                // Connection pooling
                pooling: {
                    coreConnectionsPerHost: {
                        [cassandra.types.distance.local]: 4,
                        [cassandra.types.distance.remote]: 1
                    },
                    maxConnectionsPerHost: {
                        [cassandra.types.distance.local]: 8,
                        [cassandra.types.distance.remote]: 2
                    },
                    maxRequestsPerConnection: 128,
                    heartBeatInterval: 30000
                },

                // Query options
                queryOptions: {
                    consistency: this.consistencyLevels.localQuorum,
                    fetchSize: 100,
                    prepare: true,
                    readTimeout: 10000
                },

                // Policies
                policies: {
                    loadBalancing: new cassandra.policies.loadBalancing.DCAwareRoundRobinPolicy(),
                    reconnection: new cassandra.policies.reconnection.ExponentialReconnectionPolicy(1000, 10 * 60 * 1000),
                    retry: new cassandra.policies.retry.RetryPolicy()
                },

                // SSL/TLS (for production)
                sslOptions: process.env.CASSANDRA_SSL_ENABLED === 'true' ? {
                    ca: process.env.CASSANDRA_CA_CERT,
                    cert: process.env.CASSANDRA_CLIENT_CERT,
                    key: process.env.CASSANDRA_CLIENT_KEY,
                    rejectUnauthorized: true
                } : undefined,

                // Metrics collection
                metrics: {
                    enabled: true
                }
            });

            await this.client.connect();

            console.log('✅ Successfully connected to Cassandra cluster');
            console.log(`📊 Using keyspace: ${this.keyspace}`);
            console.log(`🌐 Local datacenter: ${process.env.CASSANDRA_LOCAL_DC || 'datacenter1'}`);

            // Log cluster information
            await this.logClusterInfo();

            return this.client;

        } catch (error) {
            console.error('❌ Failed to connect to Cassandra:', error);
            throw error;
        }
    }

    async logClusterInfo() {
        try {
            const hosts = this.client.hosts;
            const metadata = this.client.metadata;

            console.log('\n📋 Cluster Information:');
            console.log(`   Cluster Name: ${metadata.clusterName || 'Unknown'}`);
            console.log(`   Keyspaces: ${Object.keys(metadata.keyspaces).length}`);
            console.log(`   Connected Hosts: ${hosts.length}`);

            hosts.forEach((host, index) => {
                console.log(`   Host ${index + 1}: ${host.address} (${host.datacenter}/${host.rack})`);
            });

        } catch (error) {
            console.error('❌ Error getting cluster info:', error);
        }
    }

    async disconnect() {
        if (this.client) {
            try {
                await this.client.shutdown();
                console.log('🔐 Disconnected from Cassandra cluster');
            } catch (error) {
                console.error('❌ Error disconnecting from Cassandra:', error);
            }
        }
    }

    getClient() {
        if (!this.client) {
            throw new Error('Database not connected. Call connect() first.');
        }
        return this.client;
    }

    // ===================================
    // HEALTH CHECK & MONITORING
    // ===================================

    async healthCheck() {
        try {
            if (!this.client) {
                return { status: 'disconnected', healthy: false };
            }

            // Test connection with simple query
            const startTime = Date.now();
            const result = await this.client.execute(
                'SELECT now() FROM system.local',
                [],
                { consistency: this.consistencyLevels.one, readTimeout: 5000 }
            );
            const responseTime = Date.now() - startTime;

            // Get cluster state
            const hosts = this.client.hosts;
            const connectedHosts = hosts.filter(host => host.isUp()).length;
            const totalHosts = hosts.length;

            // Check if majority of nodes are available
            const healthy = connectedHosts >= Math.ceil(totalHosts / 2);

            return {
                status: 'connected',
                healthy: healthy,
                responseTime: responseTime,
                cluster: {
                    connectedHosts: connectedHosts,
                    totalHosts: totalHosts,
                    availability: `${connectedHosts}/${totalHosts}`
                },
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            console.error('❌ Health check failed:', error);
            return {
                status: 'error',
                healthy: false,
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }

    // ===================================
    // QUERY EXECUTION HELPERS
    // ===================================

    async executeWithRetry(query, params, options = {}, maxRetries = 3) {
        let lastError;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                const startTime = Date.now();
                const result = await this.client.execute(query, params, {
                    ...this.queryOptions,
                    ...options
                });
                const duration = Date.now() - startTime;

                // Log slow queries
                if (duration > 100) {
                    console.warn(`⚠️ Slow query detected: ${duration}ms`);
                    console.warn(`   Query: ${query.substring(0, 100)}...`);
                }

                return result;

            } catch (error) {
                lastError = error;
                console.error(`❌ Query attempt ${attempt}/${maxRetries} failed:`, error.message);

                if (attempt < maxRetries) {
                    // Exponential backoff
                    const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        }

        throw lastError;
    }

    async executeBatch(queries, options = {}) {
        try {
            const batch = new cassandra.types.BatchStatement(queries, {
                consistency: options.consistency || this.consistencyLevels.localQuorum,
                prepare: true,
                ...options
            });

            return await this.client.batch(batch);

        } catch (error) {
            console.error('❌ Batch execution failed:', error);
            throw error;
        }
    }

    // ===================================
    // METRICS & MONITORING
    // ===================================

    getConnectionMetrics() {
        if (!this.client) return null;

        const state = this.client.getState();
        const hosts = state.getConnectedHosts();

        return {
            connectedHosts: hosts.length,
            hostDetails: hosts.map(host => ({
                address: host.address,
                datacenter: host.datacenter,
                rack: host.rack,
                connections: host.getOpenConnections(),
                inFlightQueries: host.getInFlightQueries()
            }))
        };
    }

    async getClusterMetrics() {
        try {
            // Query cluster-wide metrics
            const [nodesInfo, keyspaceInfo] = await Promise.all([
                this.client.execute('SELECT * FROM system.peers'),
                this.client.execute(`SELECT * FROM system_schema.keyspaces WHERE keyspace_name = ?`, [this.keyspace])
            ]);

            return {
                cluster: {
                    totalNodes: nodesInfo.rows.length + 1, // +1 for current coordinator
                    keyspace: keyspaceInfo.rows[0],
                    replicationFactor: this.getReplicationFactor(keyspaceInfo.rows[0])
                },
                connection: this.getConnectionMetrics()
            };

        } catch (error) {
            console.error('❌ Error getting cluster metrics:', error);
            return null;
        }
    }

    getReplicationFactor(keyspaceInfo) {
        try {
            const replication = keyspaceInfo.replication;
            if (replication.class === 'SimpleStrategy') {
                return parseInt(replication.replication_factor);
            } else if (replication.class === 'NetworkTopologyStrategy') {
                return Object.values(replication).reduce((sum, rf) => {
                    return typeof rf === 'string' && !isNaN(rf) ? sum + parseInt(rf) : sum;
                }, 0);
            }
            return 0;
        } catch (error) {
            return 0;
        }
    }
}

// Singleton instance
const ecommerceDatabase = new EcommerceDatabase();

module.exports = ecommerceDatabase;
