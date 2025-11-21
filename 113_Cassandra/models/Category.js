const database = require('../config/database');
const { v4: uuidv4 } = require('uuid');

class Category {
    constructor() {
        this.tableName = 'categories';
    }

    // Tạo category mới
    async create(categoryData) {
        const client = database.getClient();
        const id = uuidv4();
        const now = new Date();

        const query = `
            INSERT INTO ${this.tableName} (id, name, slug, description, created_at)
            VALUES (?, ?, ?, ?, ?)
        `;

        const params = [
            id,
            categoryData.name,
            categoryData.slug || this.generateSlug(categoryData.name),
            categoryData.description || null,
            now
        ];

        try {
            await client.execute(query, params, { prepare: true });
            return this.findById(id);
        } catch (error) {
            console.error('Lỗi khi tạo category:', error);
            throw error;
        }
    }

    // Tìm category theo ID
    async findById(categoryId) {
        const client = database.getClient();
        const query = `SELECT * FROM ${this.tableName} WHERE id = ?`;

        try {
            const result = await client.execute(query, [categoryId], { prepare: true });
            return result.rows[0] || null;
        } catch (error) {
            console.error('Lỗi khi tìm category:', error);
            throw error;
        }
    }

    // Tìm category theo slug
    async findBySlug(slug) {
        const client = database.getClient();
        const query = `SELECT * FROM ${this.tableName} WHERE slug = ? ALLOW FILTERING`;

        try {
            const result = await client.execute(query, [slug], { prepare: true });
            return result.rows[0] || null;
        } catch (error) {
            console.error('Lỗi khi tìm category theo slug:', error);
            throw error;
        }
    }

    // Lấy tất cả categories
    async findAll(limit = 100) {
        const client = database.getClient();
        const query = `SELECT * FROM ${this.tableName} LIMIT ?`;

        try {
            const result = await client.execute(query, [limit], { prepare: true });
            return result.rows;
        } catch (error) {
            console.error('Lỗi khi lấy categories:', error);
            throw error;
        }
    }

    // Lấy category với posts (multi-table query)
    async getCategoryWithPosts(categoryId, options = {}) {
        const client = database.getClient();

        try {
            // 1. Lấy thông tin category
            const categoryPromise = this.findById(categoryId);

            // 2. Lấy posts trong category
            const postsPromise = this.getCategoryPosts(categoryId, options.postsLimit || 20);

            // 3. Lấy top tags trong category
            const topTagsPromise = this.getCategoryTopTags(categoryId, options.tagsLimit || 10);

            // Chạy parallel
            const [category, posts, topTags] = await Promise.all([
                categoryPromise,
                postsPromise,
                topTagsPromise
            ]);

            if (!category) {
                return null;
            }

            return {
                ...category,
                posts: posts,
                top_tags: topTags,
                stats: {
                    total_posts: category.posts_count,
                    active_posts: posts.length
                }
            };

        } catch (error) {
            console.error('Lỗi khi lấy category với posts:', error);
            throw error;
        }
    }

    // Lấy posts trong category (sử dụng materialized view pattern)
    async getCategoryPosts(categoryId, limit = 20) {
        const client = database.getClient();

        const query = `
            SELECT post_id, user_id, title, content, tags, likes_count, comments_count, created_at
            FROM posts_by_category
            WHERE category_id = ?
            LIMIT ?
        `;

        try {
            const result = await client.execute(query, [categoryId, limit], { prepare: true });
            return result.rows;
        } catch (error) {
            console.error('Lỗi khi lấy category posts:', error);
            return [];
        }
    }

    // Lấy top tags trong category
    async getCategoryTopTags(categoryId, limit = 10) {
        const client = database.getClient();

        try {
            // Lấy tất cả posts trong category trước
            const posts = await this.getCategoryPosts(categoryId, 100);

            // Aggregate tags
            const tagCounts = new Map();

            posts.forEach(post => {
                if (post.tags) {
                    post.tags.forEach(tag => {
                        tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
                    });
                }
            });

            // Sort và limit
            const sortedTags = Array.from(tagCounts.entries())
                .sort((a, b) => b[1] - a[1])
                .slice(0, limit)
                .map(([tag, count]) => ({ tag, count }));

            return sortedTags;

        } catch (error) {
            console.error('Lỗi khi lấy top tags:', error);
            return [];
        }
    }

    // Complex query: Lấy categories với statistics
    async getCategoriesWithStats() {
        const client = database.getClient();

        try {
            const categories = await this.findAll();

            // Lấy statistics cho mỗi category parallel
            const categoriesWithStats = await Promise.all(
                categories.map(async (category) => {
                    const [postsCount, recentPosts] = await Promise.all([
                        this.getCategoryPostsCount(category.id),
                        this.getCategoryPosts(category.id, 5) // 5 recent posts
                    ]);

                    return {
                        ...category,
                        actual_posts_count: postsCount,
                        recent_posts: recentPosts,
                        last_activity: recentPosts[0]?.created_at || null
                    };
                })
            );

            // Sort theo số posts
            return categoriesWithStats.sort((a, b) => b.actual_posts_count - a.actual_posts_count);

        } catch (error) {
            console.error('Lỗi khi lấy categories with stats:', error);
            throw error;
        }
    }

    // Helper: Đếm số posts trong category
    async getCategoryPostsCount(categoryId) {
        const client = database.getClient();

        const query = `
            SELECT COUNT(*) as count
            FROM posts_by_category
            WHERE category_id = ?
        `;

        try {
            const result = await client.execute(query, [categoryId], { prepare: true });
            return parseInt(result.rows[0].count) || 0;
        } catch (error) {
            console.error('Lỗi khi đếm posts:', error);
            return 0;
        }
    }

    // Cập nhật counter khi có post mới
    async incrementPostsCount(categoryId, increment = 1) {
        const client = database.getClient();

        const query = `
            UPDATE ${this.tableName}
            SET posts_count = posts_count + ?
            WHERE id = ?
        `;

        try {
            await client.execute(query, [increment, categoryId], { prepare: true });
        } catch (error) {
            console.error('Lỗi khi cập nhật posts count:', error);
            throw error;
        }
    }

    // Multi-table search: Tìm categories và posts
    async searchCategoriesAndPosts(searchTerm, limit = 50) {
        const client = database.getClient();

        try {
            // 1. Search categories
            const categoriesPromise = client.execute(
                `SELECT * FROM ${this.tableName} WHERE name CONTAINS ? ALLOW FILTERING LIMIT ?`,
                [searchTerm, limit],
                { prepare: true }
            );

            // 2. Search posts có chứa search term trong title
            const postsPromise = client.execute(
                `SELECT DISTINCT category_id, post_id, title, user_id, created_at
                 FROM posts_by_category
                 WHERE title CONTAINS ? ALLOW FILTERING LIMIT ?`,
                [searchTerm, limit],
                { prepare: true }
            );

            const [categoriesResult, postsResult] = await Promise.all([
                categoriesPromise,
                postsPromise
            ]);

            // Group posts by category
            const postsByCategory = new Map();
            postsResult.rows.forEach(post => {
                if (!postsByCategory.has(post.category_id)) {
                    postsByCategory.set(post.category_id, []);
                }
                postsByCategory.get(post.category_id).push(post);
            });

            // Combine results
            const results = {
                categories: categoriesResult.rows,
                posts_by_category: Object.fromEntries(postsByCategory),
                total_categories: categoriesResult.rows.length,
                total_posts: postsResult.rows.length
            };

            return results;

        } catch (error) {
            console.error('Lỗi khi search categories và posts:', error);
            throw error;
        }
    }

    // Generate slug từ name
    generateSlug(name) {
        return name
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .trim();
    }

    // Delete category (với cascade logic)
    async deleteById(categoryId) {
        const client = database.getClient();

        try {
            // Kiểm tra có posts không
            const postsCount = await this.getCategoryPostsCount(categoryId);

            if (postsCount > 0) {
                throw new Error(`Không thể xóa category có ${postsCount} posts. Hãy di chuyển posts trước.`);
            }

            const query = `DELETE FROM ${this.tableName} WHERE id = ?`;
            await client.execute(query, [categoryId], { prepare: true });

            return true;

        } catch (error) {
            console.error('Lỗi khi xóa category:', error);
            throw error;
        }
    }
}

module.exports = new Category();
