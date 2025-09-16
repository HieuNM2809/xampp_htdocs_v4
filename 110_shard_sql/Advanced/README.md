# SQL Sharding Demo with Node.js and Docker

This project demonstrates a professional implementation of SQL database sharding using Node.js and Docker. It showcases horizontal database partitioning to improve performance, scalability, and availability.

## Features

- **Horizontal Sharding**: Data distributed across multiple MySQL database instances
- **Consistent Hashing**: Deterministic routing of data to the appropriate shard
- **RESTful API**: Node.js Express API with proper architecture
- **Containerized Setup**: Complete Docker setup for easy deployment
- **Complete Implementation**: Models, services, controllers, and utility functions
- **Testing & Benchmarking**: Scripts to test sharding functionality and performance

## Architecture Overview

### Sharding Strategy

This demo uses a hash-based sharding approach:

1. **Shard Key Selection**: We use UUIDs as the primary sharding key
2. **Hash Function**: MD5 hash function converts the key to a deterministic shard ID
3. **Data Consistency**: Related data stays on the same shard (e.g., all orders of a user)

### Components

- **API Server**: Node.js Express application exposing RESTful endpoints
- **Database Shards**: Multiple MySQL instances, each containing a subset of the data
- **Shard Routing Layer**: Middleware that determines which shard to query
- **Data Aggregation**: Service layer that combines results from multiple shards when needed

## Project Structure

```
.
├── docker/                     # Docker configuration files
│   ├── app/                    # API application Docker setup
│   ├── mysql-shard1/           # Configuration for first MySQL shard
│   ├── mysql-shard2/           # Configuration for second MySQL shard
│   └── proxy/                  # (Optional) Proxy configuration
├── src/                        # Source code
│   ├── api/                    # API endpoints
│   │   ├── controllers/        # Request handlers
│   │   └── routes.js           # Route definitions
│   ├── config/                 # Configuration files
│   ├── models/                 # Data models
│   ├── services/               # Business logic & shard operations
│   ├── utils/                  # Utility functions
│   │   ├── benchmark.js        # Sharding performance benchmarks
│   │   ├── logger.js           # Logging utility
│   │   ├── shard.utils.js      # Sharding utilities
│   │   └── test-shard.js       # Test script for sharding
│   └── index.js                # Application entry point
├── docker-compose.yml          # Docker Compose configuration
├── package.json                # Node.js dependencies
└── README.md                   # Project documentation
```

## Getting Started

### Prerequisites

- Docker and Docker Compose
- Node.js 16+ (for local development)

### Running the Demo

1. Clone the repository:

```bash
git clone https://github.com/yourusername/sql-sharding-demo.git
cd sql-sharding-demo
```

2. Start the containers:

```bash
docker-compose up -d
```

3. Access the API:
   - API Server: http://localhost:3000
   - Health Check: http://localhost:3000/health
   - Database Admin: http://localhost:8080

### Exploring the Demo

#### REST API Endpoints

- **Users API**:
  - GET `/api/users` - List all users across shards
  - GET `/api/users/:id` - Get a specific user
  - POST `/api/users` - Create a new user
  - PUT `/api/users/:id` - Update a user
  - DELETE `/api/users/:id` - Delete a user

- **Products API**:
  - GET `/api/products` - List all products
  - GET `/api/products/:id` - Get a specific product
  - POST `/api/products` - Create a new product
  - PUT `/api/products/:id` - Update a product
  - DELETE `/api/products/:id` - Delete a product

- **Orders API**:
  - GET `/api/orders` - List all orders
  - GET `/api/orders/:id` - Get a specific order
  - POST `/api/orders` - Create a new order
  - PUT `/api/orders/:id` - Update an order
  - DELETE `/api/orders/:id` - Delete an order

- **Analytics API**:
  - GET `/api/analytics/sales` - Sales analytics across shards
  - GET `/api/analytics/users` - User analytics across shards

#### Running the Test Scripts

To test sharding functionality:

```bash
docker exec -it sharding-api node src/utils/test-shard.js
```

To benchmark sharding performance:

```bash
docker exec -it sharding-api node src/utils/benchmark.js
```

## Sharding Demonstration

### How Sharding Works in This Project

1. **Data Distribution**: Each entity is assigned to a shard based on its primary key
2. **Query Routing**: Requests are routed to the appropriate shard based on the key
3. **Cross-Shard Queries**: Some queries need to aggregate data from multiple shards
4. **Transaction Management**: Transactions are contained within a single shard

### Shard Key Strategy

- **Users**: Sharded by `user_id`
- **Products**: Sharded by `product_id`
- **Orders**: Sharded by `user_id` to keep user orders on the same shard

## Performance Considerations

Sharding provides several performance benefits:

- **Horizontal Scaling**: Add more shards to handle increased load
- **Parallel Processing**: Queries run in parallel across multiple shards
- **Reduced Contention**: Less lock contention on individual database instances
- **Improved Cache Efficiency**: Each shard has a smaller working set of data

## Future Enhancements

- **Shard Rebalancing**: Dynamic redistribution of data across shards
- **Read Replicas**: Add read replicas for each shard to distribute read load
- **Shard Discovery Service**: Dynamic shard registration and discovery
- **Multi-Region Deployment**: Geographical data distribution

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- The MySQL team for a great database
- The Node.js community for excellent tools and libraries
