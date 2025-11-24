#!/usr/bin/env node

/**
 * Load Sample E-commerce Data
 * Creates realistic sample data for testing và demonstration
 */

const database = require('../config/database');
const EcommerceUser = require('../models/EcommerceUser');
const Product = require('../models/Product');
const Order = require('../models/Order');
const { v4: uuidv4 } = require('uuid');

class SampleDataLoader {
    constructor() {
        this.createdData = {
            users: [],
            categories: [],
            products: [],
            orders: [],
            carts: []
        };
    }

    async run() {
        console.log('📦 Loading E-commerce Sample Data...');
        console.log('🎯 Creating realistic data for demonstration\n');

        try {
            await database.connect();

            console.log('=== 1. CREATING PRODUCT CATEGORIES ===');
            await this.createCategories();

            console.log('\n=== 2. CREATING SAMPLE USERS ===');
            await this.createUsers();

            console.log('\n=== 3. CREATING SAMPLE PRODUCTS ===');
            await this.createProducts();

            console.log('\n=== 4. CREATING SAMPLE ORDERS ===');
            await this.createOrders();

            console.log('\n=== 5. CREATING SAMPLE REVIEWS ===');
            await this.createReviews();

            console.log('\n=== 6. CREATING ANALYTICS DATA ===');
            await this.createAnalyticsData();

            this.showSummary();

        } catch (error) {
            console.error('❌ Sample data loading failed:', error);
            throw error;
        } finally {
            await database.disconnect();
        }
    }

    async createCategories() {
        const client = database.getClient();

        const categories = [
            {
                name: 'Electronics',
                description: 'Electronic devices và gadgets',
                children: [
                    { name: 'Smartphones', description: 'Mobile phones và accessories' },
                    { name: 'Laptops', description: 'Computers và laptops' },
                    { name: 'Tablets', description: 'Tablets và e-readers' }
                ]
            },
            {
                name: 'Fashion',
                description: 'Clothing và accessories',
                children: [
                    { name: 'Men\'s Clothing', description: 'Men\'s fashion' },
                    { name: 'Women\'s Clothing', description: 'Women\'s fashion' },
                    { name: 'Shoes', description: 'Footwear for all' }
                ]
            },
            {
                name: 'Home & Garden',
                description: 'Home improvement và gardening',
                children: [
                    { name: 'Furniture', description: 'Home furniture' },
                    { name: 'Kitchen', description: 'Kitchen appliances' },
                    { name: 'Garden', description: 'Garden tools và plants' }
                ]
            }
        ];

        const batch = [];

        categories.forEach(category => {
            const categoryId = uuidv4();
            const now = new Date();

            // Main category
            batch.push({
                query: `INSERT INTO product_categories
                        (category_id, parent_category_id, category_level, name, description,
                         url_slug, status, display_order, created_at, updated_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                params: [
                    categoryId, null, 0, category.name, category.description,
                    this.generateSlug(category.name), 'active', 1, now, now
                ]
            });

            this.createdData.categories.push({ id: categoryId, name: category.name, level: 0 });

            // Subcategories
            category.children.forEach((child, index) => {
                const childId = uuidv4();

                batch.push({
                    query: `INSERT INTO product_categories
                            (category_id, parent_category_id, category_level, name, description,
                             url_slug, status, display_order, created_at, updated_at)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    params: [
                        childId, categoryId, 1, child.name, child.description,
                        this.generateSlug(child.name), 'active', index + 1, now, now
                    ]
                });

                this.createdData.categories.push({
                    id: childId,
                    name: child.name,
                    level: 1,
                    parent: categoryId
                });
            });
        });

        await client.batch(batch, { prepare: true });
        console.log(`✅ Created ${this.createdData.categories.length} categories`);
    }

    async createUsers() {
        const sampleUsers = [
            {
                email: 'john.doe@example.com',
                password: 'SecurePass123!',
                firstName: 'John',
                lastName: 'Doe',
                phone: '+1-555-0101'
            },
            {
                email: 'jane.smith@example.com',
                password: 'SecurePass123!',
                firstName: 'Jane',
                lastName: 'Smith',
                phone: '+1-555-0102'
            },
            {
                email: 'admin@ecommerce.com',
                password: 'AdminPass123!',
                firstName: 'Admin',
                lastName: 'User',
                phone: '+1-555-0103'
            },
            {
                email: 'demo@customer.com',
                password: 'DemoPass123!',
                firstName: 'Demo',
                lastName: 'Customer',
                phone: '+1-555-0104'
            }
        ];

        for (const userData of sampleUsers) {
            try {
                const user = await EcommerceUser.registerUser(userData);
                this.createdData.users.push(user);
                console.log(`   ✅ Created user: ${userData.email}`);

                // Add sample address for each user
                await this.addSampleAddress(user.user_id, userData.firstName);

            } catch (error) {
                if (error.message.includes('Email đã được sử dụng')) {
                    console.log(`   ⚠️ User already exists: ${userData.email}`);
                } else {
                    console.error(`   ❌ Error creating user ${userData.email}:`, error.message);
                }
            }
        }

        console.log(`✅ Created ${this.createdData.users.length} users`);
    }

    async addSampleAddress(userId, firstName) {
        const sampleAddresses = [
            {
                type: 'both',
                isDefault: true,
                recipientName: `${firstName} Sample`,
                streetLine1: '123 Main Street',
                streetLine2: 'Apt 4B',
                city: 'New York',
                stateProvince: 'NY',
                postalCode: '10001',
                country: 'USA',
                label: 'Home'
            }
        ];

        for (const address of sampleAddresses) {
            try {
                await EcommerceUser.addUserAddress(userId, address);
            } catch (error) {
                console.error('Error adding address:', error);
            }
        }
    }

    async createProducts() {
        const brands = ['Apple', 'Samsung', 'Nike', 'Adidas', 'Sony', 'Dell', 'HP', 'Canon'];
        const electronicsCategory = this.createdData.categories.find(c => c.name === 'Smartphones');
        const fashionCategory = this.createdData.categories.find(c => c.name === 'Men\'s Clothing');

        const sampleProducts = [
            {
                name: 'iPhone 15 Pro Max',
                description: 'Latest iPhone với advanced camera system và titanium design',
                shortDescription: 'Premium smartphone với professional camera',
                brand: 'Apple',
                sku: 'APPLE-IP15PM-256-TB',
                primaryCategoryId: electronicsCategory?.id,
                categoryPath: ['Electronics', 'Smartphones'],
                tags: ['smartphone', 'apple', 'premium', 'camera', 'titanium'],
                priceCents: 119900, // $1,199
                originalPriceCents: 119900,
                currency: 'USD',
                specifications: {
                    'display': '6.7-inch Super Retina XDR',
                    'storage': '256GB',
                    'camera': '48MP Main + 12MP Ultra Wide',
                    'battery': 'All-day battery life',
                    'color': 'Titanium Blue'
                },
                primaryImage: 'https://example.com/images/iphone15pro.jpg',
                imageUrls: [
                    'https://example.com/images/iphone15pro-1.jpg',
                    'https://example.com/images/iphone15pro-2.jpg'
                ],
                availabilityStatus: 'in_stock',
                initialQuantity: 50
            },
            {
                name: 'Samsung Galaxy S24 Ultra',
                description: 'Flagship Android smartphone với S Pen và advanced AI features',
                shortDescription: 'Premium Android với S Pen',
                brand: 'Samsung',
                sku: 'SAM-GS24U-512-TG',
                primaryCategoryId: electronicsCategory?.id,
                categoryPath: ['Electronics', 'Smartphones'],
                tags: ['smartphone', 'samsung', 'android', 's-pen', 'ai'],
                priceCents: 129900, // $1,299
                originalPriceCents: 129900,
                currency: 'USD',
                specifications: {
                    'display': '6.8-inch Dynamic AMOLED 2X',
                    'storage': '512GB',
                    'camera': '200MP Main + 50MP Periscope',
                    'battery': '5000mAh',
                    'color': 'Titanium Gray'
                },
                primaryImage: 'https://example.com/images/galaxys24ultra.jpg',
                availabilityStatus: 'in_stock',
                initialQuantity: 35
            },
            {
                name: 'Nike Air Jordan 1 Retro',
                description: 'Classic basketball sneakers với iconic design',
                shortDescription: 'Classic basketball sneakers',
                brand: 'Nike',
                sku: 'NIKE-AJ1-10-BRW',
                primaryCategoryId: fashionCategory?.id,
                categoryPath: ['Fashion', 'Shoes'],
                tags: ['sneakers', 'nike', 'jordan', 'basketball', 'retro'],
                priceCents: 17000, // $170
                originalPriceCents: 17000,
                currency: 'USD',
                specifications: {
                    'size': '10 US',
                    'material': 'Leather',
                    'color': 'Bred (Black/Red)',
                    'style': 'High Top'
                },
                primaryImage: 'https://example.com/images/jordan1.jpg',
                availabilityStatus: 'in_stock',
                initialQuantity: 25
            }
        ];

        for (const productData of sampleProducts) {
            try {
                productData.createdBy = this.createdData.users[0]?.user_id; // Admin user
                const product = await Product.createProduct(productData);
                this.createdData.products.push(product);
                console.log(`   ✅ Created product: ${productData.name}`);

            } catch (error) {
                console.error(`   ❌ Error creating product ${productData.name}:`, error.message);
            }
        }

        console.log(`✅ Created ${this.createdData.products.length} products`);
    }

    async createOrders() {
        // Create sample orders for demonstration
        const customer = this.createdData.users[0];
        const products = this.createdData.products.slice(0, 2);

        if (!customer || products.length === 0) {
            console.log('⚠️ No users or products available for order creation');
            return;
        }

        try {
            // Create a shopping cart first
            const cartId = await Order.createCart(
                customer.user_id,
                'demo_session_123',
                {
                    deviceInfo: { type: 'desktop', browser: 'chrome' },
                    userAgent: 'Sample Data Loader',
                    ipAddress: '192.168.1.100'
                }
            );

            // Add products to cart
            for (const product of products) {
                await Order.addToCart(cartId, product.product_id, 1);
            }

            // Create order from cart
            const orderData = {
                customerId: customer.user_id,
                customerEmail: customer.email,
                customerName: `${customer.first_name} ${customer.last_name}`,
                customerPhone: customer.phone,
                paymentMethod: 'credit_card',
                shippingMethod: 'standard',
                shippingAddress: {
                    street_line1: '123 Main Street',
                    city: 'New York',
                    state_province: 'NY',
                    postal_code: '10001',
                    country: 'USA'
                },
                billingAddress: {
                    street_line1: '123 Main Street',
                    city: 'New York',
                    state_province: 'NY',
                    postal_code: '10001',
                    country: 'USA'
                },
                ipAddress: '192.168.1.100'
            };

            const order = await Order.createOrder(cartId, orderData);
            this.createdData.orders.push(order);

            console.log(`   ✅ Created order: ${order.order_number}`);

        } catch (error) {
            console.error('   ❌ Error creating sample order:', error.message);
        }
    }

    async createReviews() {
        const customer = this.createdData.users[1]; // Different user for reviews
        const products = this.createdData.products;

        if (!customer || products.length === 0) {
            console.log('⚠️ No data available for review creation');
            return;
        }

        const sampleReviews = [
            {
                productId: products[0].product_id,
                rating: 5,
                title: 'Excellent smartphone!',
                reviewText: 'Amazing camera quality and battery life. Highly recommended!',
                verifiedPurchase: true
            },
            {
                productId: products[1].product_id,
                rating: 4,
                title: 'Great phone, minor issues',
                reviewText: 'Good performance overall, but the price is a bit high.',
                verifiedPurchase: false
            }
        ];

        for (const review of sampleReviews) {
            try {
                const reviewData = {
                    ...review,
                    userId: customer.user_id,
                    userName: `${customer.first_name} ${customer.last_name}`,
                    verifyPurchase: false // Skip purchase verification for demo
                };

                await Product.addProductReview(review.productId, reviewData);
                console.log(`   ✅ Created review for product ${review.productId.substring(0, 8)}...`);

            } catch (error) {
                console.error(`   ❌ Error creating review:`, error.message);
            }
        }
    }

    async createAnalyticsData() {
        const client = database.getClient();
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        try {
            // Create sample daily analytics
            const batch = [
                {
                    query: `UPDATE daily_order_stats
                            SET order_count = order_count + ?, revenue_cents = revenue_cents + ?,
                                new_customers = new_customers + ?, returning_customers = returning_customers + ?
                            WHERE stats_date = ? AND hour_bucket = ? AND datacenter = ?`,
                    params: [
                        5, 50000, 2, 3, // 5 orders, $500 revenue, 2 new + 3 returning customers
                        today, now.getHours(), 'datacenter1'
                    ]
                }
            ];

            await client.batch(batch, { prepare: true });
            console.log('   ✅ Created sample analytics data');

        } catch (error) {
            console.error('   ❌ Error creating analytics data:', error.message);
        }
    }

    showSummary() {
        console.log('\n📊 SAMPLE DATA SUMMARY:');
        console.log(`   👥 Users: ${this.createdData.users.length}`);
        console.log(`   📁 Categories: ${this.createdData.categories.length}`);
        console.log(`   📦 Products: ${this.createdData.products.length}`);
        console.log(`   📋 Orders: ${this.createdData.orders.length}`);

        console.log('\n🎯 Test Users Created:');
        this.createdData.users.forEach(user => {
            console.log(`   📧 ${user.email} | 👤 ${user.first_name} ${user.last_name}`);
        });

        console.log('\n📦 Test Products Created:');
        this.createdData.products.forEach(product => {
            console.log(`   🏷️  ${product.name} | 💰 ${this.formatPrice(product.price_cents)}`);
        });

        console.log('\n🚀 What you can do now:');
        console.log('   1. Start API server: npm run start-ecommerce');
        console.log('   2. Test authentication: POST /api/auth/login');
        console.log('   3. Browse products: GET /api/products/search');
        console.log('   4. Create shopping cart: POST /api/cart');
        console.log('   5. Place orders: POST /api/orders');

        console.log('\n🧪 Sample API calls:');
        console.log(`
# Login
curl -X POST http://localhost:3001/api/auth/login \\
  -H "Content-Type: application/json" \\
  -d '{"email":"john.doe@example.com","password":"SecurePass123!"}'

# Search products
curl "http://localhost:3001/api/products/search?q=iphone"

# Get product details
curl "http://localhost:3001/api/products/${this.createdData.products[0]?.product_id}"
        `);
    }

    generateSlug(name) {
        return name
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .trim();
    }

    formatPrice(priceCents, currency = 'USD') {
        const price = priceCents / 100;
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency
        }).format(price);
    }
}

// ===================================
// EXECUTION
// ===================================

if (require.main === module) {
    const loader = new SampleDataLoader();

    console.log('🛒 E-commerce Sample Data Loader');
    console.log('📋 Creating realistic test data for e-commerce platform\n');

    loader.run().then(() => {
        console.log('\n🎉 Sample data loading completed!');
        console.log('📚 Check ecommerce-cassandra/README.md for API usage examples');
        process.exit(0);
    }).catch(error => {
        console.error('\n💥 Sample data loading failed:', error);
        process.exit(1);
    });
}

module.exports = SampleDataLoader;
