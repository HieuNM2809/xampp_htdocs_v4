-- ===================================
-- E-COMMERCE KEYSPACE SETUP
-- ===================================

-- Drop keyspace if exists (for fresh setup)
DROP KEYSPACE IF EXISTS ecommerce;

-- Create main keyspace với production replication strategy
CREATE KEYSPACE ecommerce
WITH REPLICATION = {
    'class': 'NetworkTopologyStrategy',
    'datacenter1': 3,     -- Primary datacenter: 3 replicas
    'datacenter2': 2,     -- Secondary datacenter: 2 replicas
    'datacenter3': 2      -- Disaster recovery: 2 replicas
}
AND durable_writes = true;

-- For single datacenter development/testing
-- CREATE KEYSPACE ecommerce
-- WITH REPLICATION = {
--     'class': 'SimpleStrategy',
--     'replication_factor': 3
-- }
-- AND durable_writes = true;

USE ecommerce;

-- ===================================
-- KEYSPACE CONFIGURATION
-- ===================================

-- Set default consistency levels for different operations
-- These will be handled in application code, documented here for reference:

/*
CONSISTENCY STRATEGY:
- User Authentication: LOCAL_QUORUM (balanced security + performance)
- Product Catalog: LOCAL_QUORUM (ensure consistent product info)
- Shopping Cart: LOCAL_QUORUM (ensure cart consistency)
- Order Placement: QUORUM (critical - prevent double orders)
- Inventory Updates: QUORUM (prevent overselling)
- Analytics/Reporting: ONE (eventual consistency OK for analytics)
- Admin Operations: QUORUM (ensure data accuracy)
*/

-- ===================================
-- INITIAL SETUP VERIFICATION
-- ===================================

-- Verify keyspace creation
DESCRIBE KEYSPACE ecommerce;
