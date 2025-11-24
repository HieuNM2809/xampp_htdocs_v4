const database = require('../config/database');
const { v4: uuidv4 } = require('uuid');

class EcommerceProduct {
    constructor() {
        this.productsTable = 'products';
        this.productsByCategoryTable = 'products_by_category';
        this.productsByBrandTable = 'products_by_brand';
        this.productSearchTable = 'product_search_index';
        this.productReviewsTable = 'product_reviews';
        this.productInventoryTable = 'product_inventory';
        this.productVariantsTable = 'product_variants';
        this.productPriceHistoryTable = 'product_price_history';
    }

    // ===================================
    // PRODUCT MANAGEMENT
    // ===================================

    async createProduct(productData) {
        const client = database.getClient();
        const productId = uuidv4();
        const now = new Date();

        try {
            // Generate SEO-friendly slug
            const urlSlug = this.generateSlug(productData.name);
            const popularityScore = 0; // Initial score

            // Batch insert into multiple tables for different access patterns
            const batch = [
                // Main product table
                {
                    query: `INSERT INTO ${this.productsTable}
                            (product_id, sku, name, description, short_description, brand, manufacturer,
                             primary_category_id, category_path, tags, price_cents, original_price_cents,
                             currency, specifications, dimensions, primary_image, image_urls,
                             product_status, availability_status, url_slug, created_at, updated_at)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    params: [
                        productId, productData.sku, productData.name, productData.description,
                        productData.shortDescription, productData.brand, productData.manufacturer,
                        productData.primaryCategoryId, productData.categoryPath, productData.tags,
                        productData.priceCents, productData.originalPriceCents, productData.currency,
                        productData.specifications || {}, productData.dimensions || {},
                        productData.primaryImage, productData.imageUrls || [],
                        'active', productData.availabilityStatus || 'in_stock', urlSlug, now, now
                    ]
                },
                // Products by category (for category browsing)
                {
                    query: `INSERT INTO ${this.productsByCategoryTable}
                            (category_id, price_range, popularity_score, product_id, name, short_description,
                             brand, price_cents, original_price_cents, primary_image, availability_status,
                             rating_average, review_count, created_at)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    params: [
                        productData.primaryCategoryId, this.calculatePriceRange(productData.priceCents),
                        popularityScore, productId, productData.name, productData.shortDescription,
                        productData.brand, productData.priceCents, productData.originalPriceCents,
                        productData.primaryImage, productData.availabilityStatus || 'in_stock',
                        0.0, 0, now
                    ]
                },
                // Products by brand
                {
                    query: `INSERT INTO ${this.productsByBrandTable}
                            (brand, category_id, created_at, product_id, name, price_cents,
                             primary_image, availability_status, rating_average)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    params: [
                        productData.brand, productData.primaryCategoryId, now, productId,
                        productData.name, productData.priceCents, productData.primaryImage,
                        productData.availabilityStatus || 'in_stock', 0.0
                    ]
                },
                // Initialize inventory
                {
                    query: `INSERT INTO ${this.productInventoryTable}
                            (product_id, quantity_available, quantity_reserved, inventory_status,
                             last_updated, updated_by)
                            VALUES (?, ?, ?, ?, ?, ?)`,
                    params: [
                        productId, productData.initialQuantity || 0, 0,
                        productData.initialQuantity > 0 ? 'in_stock' : 'out_of_stock',
                        now, productData.createdBy
                    ]
                }
            ];

            await client.batch(batch, {
                prepare: true,
                consistency: database.consistencyLevels.localQuorum
            });

            // Create search index entries
            await this.indexProductForSearch(productId, productData);

            console.log(`✅ Product created: ${productData.name} (${productId})`);
            return this.findById(productId);

        } catch (error) {
            console.error('❌ Error creating product:', error);
            throw error;
        }
    }

    async findById(productId, includeInventory = true, includeReviews = false) {
        const client = database.getClient();

        try {
            // Get main product data
            const productPromise = client.execute(
                `SELECT * FROM ${this.productsTable} WHERE product_id = ?`,
                [productId],
                { consistency: database.consistencyLevels.localQuorum }
            );

            const promises = [productPromise];

            if (includeInventory) {
                promises.push(
                    client.execute(
                        `SELECT * FROM ${this.productInventoryTable} WHERE product_id = ?`,
                        [productId],
                        { consistency: database.consistencyLevels.one }
                    )
                );
            }

            if (includeReviews) {
                promises.push(this.getProductReviewSummary(productId));
            }

            const results = await Promise.all(promises);
            const product = results[0].rows[0];

            if (!product) return null;

            // Combine results
            const response = { ...product };

            if (includeInventory && results[1].rows.length > 0) {
                response.inventory = results[1].rows[0];
            }

            if (includeReviews && results[2]) {
                response.reviews = results[2];
            }

            // Calculate derived fields
            response.calculated_fields = {
                average_rating: product.rating_count > 0 ?
                    product.rating_sum / product.rating_count : 0,
                price_display: this.formatPrice(product.price_cents, product.currency),
                discount_percentage: this.calculateDiscountPercentage(
                    product.price_cents, product.original_price_cents
                )
            };

            return response;

        } catch (error) {
            console.error('❌ Error finding product:', error);
            throw error;
        }
    }

    // ===================================
    // PRODUCT SEARCH & BROWSING
    // ===================================

    async searchProducts(searchTerm, filters = {}, pagination = {}) {
        const client = database.getClient();
        const limit = pagination.limit || 20;
        const offset = pagination.offset || 0;

        try {
            let query, params;

            if (searchTerm && searchTerm.length > 0) {
                // Text search using search index
                const normalizedTerm = this.normalizeSearchTerm(searchTerm);
                query = `
                    SELECT * FROM ${this.productSearchTable}
                    WHERE search_term = ?
                    ORDER BY relevance_score DESC
                    LIMIT ?
                `;
                params = [normalizedTerm, limit + offset];
            } else {
                // Category or brand browsing
                if (filters.categoryId) {
                    query = `
                        SELECT * FROM ${this.productsByCategoryTable}
                        WHERE category_id = ?
                    `;
                    params = [filters.categoryId];

                    if (filters.priceRange) {
                        query += ` AND price_range = ?`;
                        params.push(filters.priceRange);
                    }

                    query += ` ORDER BY popularity_score DESC LIMIT ?`;
                    params.push(limit + offset);

                } else if (filters.brand) {
                    query = `
                        SELECT * FROM ${this.productsByBrandTable}
                        WHERE brand = ?
                        ORDER BY created_at DESC
                        LIMIT ?
                    `;
                    params = [filters.brand, limit + offset];
                }
            }

            if (!query) {
                throw new Error('Invalid search criteria');
            }

            const result = await client.execute(query, params, {
                consistency: database.consistencyLevels.one
            });

            // Apply additional filtering and sorting
            let products = result.rows;

            // Skip offset items (pagination)
            if (offset > 0) {
                products = products.slice(offset);
            }

            // Apply runtime filters
            if (filters.minPrice) {
                products = products.filter(p => p.price_cents >= filters.minPrice);
            }
            if (filters.maxPrice) {
                products = products.filter(p => p.price_cents <= filters.maxPrice);
            }
            if (filters.inStockOnly) {
                products = products.filter(p => p.availability_status === 'in_stock');
            }

            return {
                products: products.slice(0, limit),
                pagination: {
                    total: result.rows.length,
                    limit,
                    offset,
                    hasMore: result.rows.length > limit + offset
                },
                filters: filters,
                searchTerm
            };

        } catch (error) {
            console.error('❌ Error searching products:', error);
            throw error;
        }
    }

    async getProductsByCategory(categoryId, options = {}) {
        const client = database.getClient();
        const limit = options.limit || 50;
        const sortBy = options.sortBy || 'popularity'; // 'popularity', 'price_low', 'price_high', 'newest'

        try {
            let query = `
                SELECT * FROM ${this.productsByCategoryTable}
                WHERE category_id = ?
            `;
            const params = [categoryId];

            if (options.priceRange) {
                query += ` AND price_range = ?`;
                params.push(options.priceRange);
            }

            // Apply sorting
            if (sortBy === 'popularity') {
                query += ` ORDER BY popularity_score DESC`;
            } else if (sortBy === 'newest') {
                query += ` ORDER BY created_at DESC`;
            }

            query += ` LIMIT ?`;
            params.push(limit);

            const result = await client.execute(query, params, {
                consistency: database.consistencyLevels.one
            });

            let products = result.rows;

            // Apply additional sorting if needed (application level)
            if (sortBy === 'price_low') {
                products.sort((a, b) => a.price_cents - b.price_cents);
            } else if (sortBy === 'price_high') {
                products.sort((a, b) => b.price_cents - a.price_cents);
            }

            return products;

        } catch (error) {
            console.error('❌ Error getting products by category:', error);
            throw error;
        }
    }

    // ===================================
    // PRODUCT REVIEWS
    // ===================================

    async addProductReview(productId, reviewData) {
        const client = database.getClient();
        const now = new Date();
        const reviewId = cassandra.types.TimeUuid.now();
        const reviewDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        try {
            // Verify user purchased this product (optional check)
            if (reviewData.verifyPurchase) {
                const hasPurchased = await this.verifyPurchaseHistory(reviewData.userId, productId);
                if (!hasPurchased) {
                    throw new Error('Chỉ có thể review sản phẩm đã mua');
                }
            }

            const batch = [
                // Insert review
                {
                    query: `INSERT INTO ${this.productReviewsTable}
                            (product_id, review_date, review_timestamp, review_id, user_id, user_name,
                             rating, title, review_text, verified_purchase, review_status,
                             purchase_date, review_images)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    params: [
                        productId, reviewDate, now, reviewId, reviewData.userId, reviewData.userName,
                        reviewData.rating, reviewData.title, reviewData.reviewText,
                        reviewData.verifiedPurchase || false, 'approved',
                        reviewData.purchaseDate || null, reviewData.images || []
                    ]
                },
                // Update product rating counters
                {
                    query: `UPDATE ${this.productsTable}
                            SET rating_sum = rating_sum + ?, rating_count = rating_count + 1
                            WHERE product_id = ?`,
                    params: [reviewData.rating, productId]
                }
            ];

            await client.batch(batch, {
                prepare: true,
                consistency: database.consistencyLevels.localQuorum
            });

            // Update denormalized rating in category and brand tables
            await this.updateDenormalizedRatings(productId);

            return reviewId;

        } catch (error) {
            console.error('❌ Error adding product review:', error);
            throw error;
        }
    }

    async getProductReviews(productId, options = {}) {
        const client = database.getClient();
        const limit = options.limit || 20;
        const startDate = options.startDate || new Date('2020-01-01');

        try {
            const result = await client.execute(`
                SELECT * FROM ${this.productReviewsTable}
                WHERE product_id = ? AND review_date >= ?
                ORDER BY review_timestamp DESC
                LIMIT ?
            `, [productId, startDate, limit], {
                consistency: database.consistencyLevels.one
            });

            return result.rows;

        } catch (error) {
            console.error('❌ Error getting product reviews:', error);
            throw error;
        }
    }

    // ===================================
    // INVENTORY MANAGEMENT
    // ===================================

    async updateInventory(productId, quantityChange, context = {}) {
        const client = database.getClient();
        const now = new Date();
        const movementId = cassandra.types.TimeUuid.now();
        const movementDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        try {
            // Get current inventory
            const currentInventory = await client.execute(
                `SELECT * FROM ${this.productInventoryTable} WHERE product_id = ?`,
                [productId]
            );

            if (currentInventory.rows.length === 0) {
                throw new Error('Product inventory record not found');
            }

            const inventory = currentInventory.rows[0];
            const quantityBefore = inventory.quantity_available;
            const quantityAfter = quantityBefore + quantityChange;

            if (quantityAfter < 0) {
                throw new Error('Cannot reduce inventory below zero');
            }

            const batch = [
                // Update inventory status
                {
                    query: `UPDATE ${this.productInventoryTable}
                            SET quantity_available = ?, inventory_status = ?, last_updated = ?, updated_by = ?
                            WHERE product_id = ?`,
                    params: [
                        quantityAfter,
                        this.calculateInventoryStatus(quantityAfter, inventory.reorder_point),
                        now, context.updatedBy, productId
                    ]
                },
                // Log inventory movement
                {
                    query: `INSERT INTO inventory_movements
                            (product_id, movement_date, movement_timestamp, movement_id, movement_type,
                             quantity_change, quantity_before, quantity_after, reference_id, reference_type,
                             reason_code, notes, created_by, created_by_type, source_system)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    params: [
                        productId, movementDate, now, movementId, context.movementType || 'adjustment',
                        quantityChange, quantityBefore, quantityAfter, context.referenceId,
                        context.referenceType, context.reasonCode, context.notes,
                        context.updatedBy, context.updatedByType || 'system', context.sourceSystem || 'api'
                    ]
                }
            ];

            // Update product availability status
            const newAvailabilityStatus = this.calculateAvailabilityStatus(quantityAfter, inventory.reorder_point);
            if (newAvailabilityStatus !== inventory.availability_status) {
                batch.push({
                    query: `UPDATE ${this.productsTable} SET availability_status = ? WHERE product_id = ?`,
                    params: [newAvailabilityStatus, productId]
                });

                // Update denormalized tables
                batch.push({
                    query: `UPDATE ${this.productsByCategoryTable}
                            SET availability_status = ?
                            WHERE category_id = ? AND product_id = ? IF EXISTS`,
                    params: [newAvailabilityStatus, inventory.primary_category_id, productId]
                });
            }

            await client.batch(batch, {
                prepare: true,
                consistency: database.consistencyLevels.quorum // Important for inventory accuracy
            });

            // Check for low stock alerts
            if (quantityAfter <= inventory.reorder_point) {
                await this.createLowStockAlert(productId, quantityAfter, inventory);
            }

            return {
                productId,
                quantityBefore,
                quantityAfter,
                quantityChange,
                newStatus: newAvailabilityStatus
            };

        } catch (error) {
            console.error('❌ Error updating inventory:', error);
            throw error;
        }
    }

    async reserveInventory(productId, quantity, orderId) {
        const client = database.getClient();

        try {
            // Use lightweight transaction to prevent overselling
            const result = await client.execute(`
                UPDATE ${this.productInventoryTable}
                SET quantity_available = quantity_available - ?,
                    quantity_reserved = quantity_reserved + ?
                WHERE product_id = ?
                IF quantity_available >= ?
            `, [quantity, quantity, productId, quantity], {
                consistency: database.consistencyLevels.quorum
            });

            if (!result.rows[0]['[applied]']) {
                throw new Error('Insufficient inventory to reserve');
            }

            // Log the reservation
            await this.logInventoryMovement(productId, -quantity, {
                movementType: 'reservation',
                referenceId: orderId,
                referenceType: 'order'
            });

            return true;

        } catch (error) {
            console.error('❌ Error reserving inventory:', error);
            throw error;
        }
    }

    async releaseInventoryReservation(productId, quantity, orderId) {
        const client = database.getClient();

        try {
            await client.execute(`
                UPDATE ${this.productInventoryTable}
                SET quantity_available = quantity_available + ?,
                    quantity_reserved = quantity_reserved - ?
                WHERE product_id = ?
            `, [quantity, quantity, productId], {
                consistency: database.consistencyLevels.quorum
            });

            // Log the release
            await this.logInventoryMovement(productId, quantity, {
                movementType: 'release_reservation',
                referenceId: orderId,
                referenceType: 'order_cancellation'
            });

            return true;

        } catch (error) {
            console.error('❌ Error releasing inventory reservation:', error);
            throw error;
        }
    }

    // ===================================
    // PRODUCT ANALYTICS
    // ===================================

    async incrementProductViews(productId, userId = null, sessionContext = {}) {
        const client = database.getClient();

        try {
            // Update product view counter
            await client.execute(
                `UPDATE ${this.productsTable} SET view_count = view_count + 1 WHERE product_id = ?`,
                [productId],
                { consistency: database.consistencyLevels.one }
            );

            // Log detailed view analytics
            if (userId) {
                await this.logProductView(productId, userId, sessionContext);
            }

            // Update popularity score (simple algorithm)
            await this.updatePopularityScore(productId);

        } catch (error) {
            console.error('❌ Error incrementing product views:', error);
            // Don't throw - view tracking shouldn't break product display
        }
    }

    async updateProductRating(productId, oldRating, newRating) {
        const client = database.getClient();

        try {
            const ratingDiff = newRating - (oldRating || 0);
            const countDiff = oldRating ? 0 : 1; // Only increment count for new ratings

            await client.execute(`
                UPDATE ${this.productsTable}
                SET rating_sum = rating_sum + ?, rating_count = rating_count + ?
                WHERE product_id = ?
            `, [ratingDiff, countDiff, productId], {
                consistency: database.consistencyLevels.localQuorum
            });

            // Update denormalized ratings in other tables
            await this.updateDenormalizedRatings(productId);

        } catch (error) {
            console.error('❌ Error updating product rating:', error);
            throw error;
        }
    }

    // ===================================
    // SEARCH INDEXING
    // ===================================

    async indexProductForSearch(productId, productData) {
        const client = database.getClient();

        try {
            // Generate search terms from product data
            const searchTerms = this.generateSearchTerms(productData);
            const now = new Date();

            const batch = [];

            searchTerms.forEach(({ term, relevance }) => {
                batch.push({
                    query: `INSERT INTO ${this.productSearchTable}
                            (search_term, relevance_score, product_id, name, brand, price_cents,
                             primary_image, availability_status, category_path, indexed_at)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    params: [
                        term, relevance, productId, productData.name, productData.brand,
                        productData.priceCents, productData.primaryImage,
                        productData.availabilityStatus, productData.categoryPath, now
                    ]
                });
            });

            if (batch.length > 0) {
                await client.batch(batch, { prepare: true });
            }

        } catch (error) {
            console.error('❌ Error indexing product for search:', error);
            throw error;
        }
    }

    generateSearchTerms(productData) {
        const terms = [];

        // Product name terms
        const nameTerms = this.extractTerms(productData.name);
        nameTerms.forEach(term => terms.push({ term, relevance: 1.0 }));

        // Brand terms
        if (productData.brand) {
            terms.push({ term: productData.brand.toLowerCase(), relevance: 0.9 });
        }

        // Category terms
        if (productData.categoryPath) {
            productData.categoryPath.forEach(category => {
                terms.push({ term: category.toLowerCase(), relevance: 0.7 });
            });
        }

        // Tag terms
        if (productData.tags) {
            productData.tags.forEach(tag => {
                terms.push({ term: tag.toLowerCase(), relevance: 0.6 });
            });
        }

        // Description terms (lower relevance)
        if (productData.description) {
            const descTerms = this.extractTerms(productData.description);
            descTerms.forEach(term => terms.push({ term, relevance: 0.3 }));
        }

        return terms;
    }

    // ===================================
    // UTILITY METHODS
    // ===================================

    calculatePriceRange(priceCents) {
        if (priceCents < 5000) return 'under_50';       // < $50
        if (priceCents < 10000) return '50_100';        // $50-$100
        if (priceCents < 50000) return '100_500';       // $100-$500
        return 'over_500';                              // > $500
    }

    calculateInventoryStatus(quantity, reorderPoint) {
        if (quantity <= 0) return 'out_of_stock';
        if (quantity <= reorderPoint) return 'low_stock';
        return 'in_stock';
    }

    calculateAvailabilityStatus(quantity, reorderPoint) {
        if (quantity <= 0) return 'out_of_stock';
        if (quantity <= reorderPoint) return 'low_stock';
        return 'in_stock';
    }

    generateSlug(name) {
        return name
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .trim();
    }

    formatPrice(priceCents, currency = 'USD') {
        const price = priceCents / 100;
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency
        }).format(price);
    }

    calculateDiscountPercentage(currentPrice, originalPrice) {
        if (!originalPrice || originalPrice <= currentPrice) return 0;
        return Math.round(((originalPrice - currentPrice) / originalPrice) * 100);
    }

    extractTerms(text) {
        return text
            .toLowerCase()
            .replace(/[^a-z0-9\s]/g, ' ')
            .split(/\s+/)
            .filter(term => term.length > 2)
            .slice(0, 20); // Limit to prevent too many terms
    }

    normalizeSearchTerm(term) {
        return term
            .toLowerCase()
            .trim()
            .replace(/\s+/g, ' ');
    }
}

module.exports = new EcommerceProduct();
