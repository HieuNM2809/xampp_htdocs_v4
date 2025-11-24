const express = require('express');
const router = express.Router();
const Product = require('../../models/Product');

// ===================================
// PRODUCT CATALOG ROUTES
// ===================================

// GET /api/products/search - Product search
router.get('/search', async (req, res) => {
    try {
        const {
            q: searchTerm = '',
            category,
            brand,
            minPrice,
            maxPrice,
            inStock = false,
            sortBy = 'relevance',
            limit = 20,
            offset = 0
        } = req.query;

        // Build filters object
        const filters = {};
        if (category) filters.categoryId = category;
        if (brand) filters.brand = brand;
        if (minPrice) filters.minPrice = parseInt(minPrice);
        if (maxPrice) filters.maxPrice = parseInt(maxPrice);
        if (inStock === 'true') filters.inStockOnly = true;

        const pagination = {
            limit: Math.min(parseInt(limit), 100), // Max 100 items per request
            offset: parseInt(offset)
        };

        const results = await Product.searchProducts(searchTerm, filters, pagination);

        res.json({
            success: true,
            data: {
                products: results.products,
                pagination: results.pagination,
                searchTerm: searchTerm,
                appliedFilters: filters
            }
        });

    } catch (error) {
        console.error('Product search error:', error);
        res.status(500).json({
            error: 'Search failed',
            message: 'Không thể tìm kiếm sản phẩm'
        });
    }
});

// GET /api/products/:id - Get product details
router.get('/:id', async (req, res) => {
    try {
        const { id: productId } = req.params;
        const { includeReviews = false } = req.query;

        // Validate UUID format
        if (!this.isValidUUID(productId)) {
            return res.status(400).json({
                error: 'Invalid product ID',
                message: 'Product ID phải là UUID hợp lệ'
            });
        }

        const product = await Product.findById(
            productId,
            true,  // includeInventory
            includeReviews === 'true'
        );

        if (!product) {
            return res.status(404).json({
                error: 'Product not found',
                message: 'Sản phẩm không tồn tại'
            });
        }

        // Increment view count (async, don't wait)
        const userId = req.headers['x-user-id'];
        const sessionContext = {
            sessionId: req.headers['x-session-id'],
            ipAddress: req.ip,
            userAgent: req.get('User-Agent')
        };

        // Don't await this - fire and forget for performance
        Product.incrementProductViews(productId, userId, sessionContext).catch(error => {
            console.error('Error incrementing views:', error);
        });

        res.json({
            success: true,
            data: product
        });

    } catch (error) {
        console.error('Get product error:', error);
        res.status(500).json({
            error: 'Failed to get product',
            message: 'Không thể lấy thông tin sản phẩm'
        });
    }
});

// GET /api/products/category/:categoryId - Browse products by category
router.get('/category/:categoryId', async (req, res) => {
    try {
        const { categoryId } = req.params;
        const {
            sortBy = 'popularity',
            priceRange,
            limit = 50
        } = req.query;

        if (!this.isValidUUID(categoryId)) {
            return res.status(400).json({
                error: 'Invalid category ID',
                message: 'Category ID phải là UUID hợp lệ'
            });
        }

        const options = {
            sortBy,
            priceRange,
            limit: Math.min(parseInt(limit), 100)
        };

        const products = await Product.getProductsByCategory(categoryId, options);

        res.json({
            success: true,
            data: {
                products,
                categoryId,
                appliedOptions: options
            }
        });

    } catch (error) {
        console.error('Category products error:', error);
        res.status(500).json({
            error: 'Failed to get category products',
            message: 'Không thể lấy sản phẩm theo danh mục'
        });
    }
});

// GET /api/products/:id/reviews - Get product reviews
router.get('/:id/reviews', async (req, res) => {
    try {
        const { id: productId } = req.params;
        const { limit = 20, startDate } = req.query;

        if (!this.isValidUUID(productId)) {
            return res.status(400).json({
                error: 'Invalid product ID',
                message: 'Product ID phải là UUID hợp lệ'
            });
        }

        const options = {
            limit: Math.min(parseInt(limit), 100)
        };

        if (startDate) {
            options.startDate = new Date(startDate);
        }

        const reviews = await Product.getProductReviews(productId, options);

        res.json({
            success: true,
            data: {
                reviews,
                productId,
                count: reviews.length
            }
        });

    } catch (error) {
        console.error('Get reviews error:', error);
        res.status(500).json({
            error: 'Failed to get reviews',
            message: 'Không thể lấy đánh giá sản phẩm'
        });
    }
});

// POST /api/products/:id/reviews - Add product review (requires auth)
router.post('/:id/reviews', async (req, res) => {
    try {
        // This would typically use authentication middleware
        const userId = req.headers['x-user-id'];
        if (!userId) {
            return res.status(401).json({
                error: 'Authentication required',
                message: 'Cần đăng nhập để đánh giá sản phẩm'
            });
        }

        const { id: productId } = req.params;
        const { rating, title, reviewText, images } = req.body;

        if (!this.isValidUUID(productId)) {
            return res.status(400).json({
                error: 'Invalid product ID',
                message: 'Product ID phải là UUID hợp lệ'
            });
        }

        // Validate review data
        if (!rating || rating < 1 || rating > 5) {
            return res.status(400).json({
                error: 'Invalid rating',
                message: 'Rating phải từ 1 đến 5 sao'
            });
        }

        if (!title || !reviewText) {
            return res.status(400).json({
                error: 'Missing review content',
                message: 'Title và review text là bắt buộc'
            });
        }

        const reviewData = {
            userId,
            userName: req.headers['x-user-name'] || 'Anonymous',
            rating: parseInt(rating),
            title: title.trim(),
            reviewText: reviewText.trim(),
            images: images || [],
            verifiedPurchase: req.body.verifiedPurchase || false,
            verifyPurchase: true // Verify user purchased this product
        };

        const reviewId = await Product.addProductReview(productId, reviewData);

        res.status(201).json({
            success: true,
            data: {
                reviewId,
                productId,
                rating: reviewData.rating
            },
            message: 'Đánh giá đã được thêm thành công'
        });

    } catch (error) {
        console.error('Add review error:', error);

        if (error.message.includes('Chỉ có thể review sản phẩm đã mua')) {
            return res.status(403).json({
                error: 'Purchase required',
                message: 'Chỉ có thể đánh giá sản phẩm đã mua'
            });
        }

        res.status(500).json({
            error: 'Review submission failed',
            message: 'Không thể gửi đánh giá'
        });
    }
});

// GET /api/products/:id/inventory - Check product availability
router.get('/:id/inventory', async (req, res) => {
    try {
        const { id: productId } = req.params;

        if (!this.isValidUUID(productId)) {
            return res.status(400).json({
                error: 'Invalid product ID',
                message: 'Product ID phải là UUID hợp lệ'
            });
        }

        const product = await Product.findById(productId, true, false);

        if (!product) {
            return res.status(404).json({
                error: 'Product not found',
                message: 'Sản phẩm không tồn tại'
            });
        }

        const inventory = product.inventory || {};

        res.json({
            success: true,
            data: {
                productId,
                productName: product.name,
                availability: {
                    status: inventory.inventory_status || 'unknown',
                    quantityAvailable: inventory.quantity_available || 0,
                    quantityReserved: inventory.quantity_reserved || 0,
                    inStock: (inventory.quantity_available || 0) > 0,
                    lowStock: (inventory.quantity_available || 0) <= (inventory.reorder_point || 0)
                },
                restockInfo: {
                    lastRestockDate: inventory.last_restock_date,
                    nextExpectedRestock: inventory.next_expected_restock,
                    leadTimeDays: inventory.lead_time_days
                }
            }
        });

    } catch (error) {
        console.error('Inventory check error:', error);
        res.status(500).json({
            error: 'Inventory check failed',
            message: 'Không thể kiểm tra tồn kho'
        });
    }
});

// ===================================
// UTILITY METHODS
// ===================================

router.isValidUUID = function(uuid) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
};

module.exports = router;
