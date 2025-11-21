const cassandra = require('cassandra-driver');
require('dotenv').config();

async function createAdvancedSchemas() {
    let client;

    try {
        console.log('🚀 Tạo schemas nâng cao cho multi-table queries...');

        client = new cassandra.Client({
            contactPoints: process.env.CASSANDRA_HOSTS?.split(',') || ['127.0.0.1'],
            localDataCenter: 'datacenter1',
            keyspace: process.env.CASSANDRA_KEYSPACE || 'nodejs_example'
        });

        await client.connect();
        console.log('✅ Đã kết nối với Cassandra');

        // 1. User Profiles table (extended)
        const createUserProfilesTable = `
            CREATE TABLE IF NOT EXISTS user_profiles (
                user_id UUID PRIMARY KEY,
                email TEXT,
                name TEXT,
                bio TEXT,
                avatar_url TEXT,
                location TEXT,
                website TEXT,
                followers_count COUNTER,
                following_count COUNTER,
                posts_count COUNTER,
                created_at TIMESTAMP,
                updated_at TIMESTAMP
            )
        `;
        await client.execute(createUserProfilesTable);
        console.log('✅ Tạo bảng user_profiles');

        // 2. Categories table
        const createCategoriesTable = `
            CREATE TABLE IF NOT EXISTS categories (
                id UUID PRIMARY KEY,
                name TEXT,
                slug TEXT,
                description TEXT,
                posts_count COUNTER,
                created_at TIMESTAMP
            )
        `;
        await client.execute(createCategoriesTable);
        console.log('✅ Tạo bảng categories');

        // 3. Posts by Category (Materialized View pattern)
        const createPostsByCategoryTable = `
            CREATE TABLE IF NOT EXISTS posts_by_category (
                category_id UUID,
                created_at TIMESTAMP,
                post_id UUID,
                user_id UUID,
                title TEXT,
                content TEXT,
                tags SET<TEXT>,
                likes_count COUNTER,
                comments_count COUNTER,
                PRIMARY KEY (category_id, created_at, post_id)
            ) WITH CLUSTERING ORDER BY (created_at DESC, post_id ASC)
        `;
        await client.execute(createPostsByCategoryTable);
        console.log('✅ Tạo bảng posts_by_category');

        // 4. Posts by User (time-series pattern)
        const createPostsByUserTable = `
            CREATE TABLE IF NOT EXISTS posts_by_user (
                user_id UUID,
                year INT,
                created_at TIMESTAMP,
                post_id UUID,
                category_id UUID,
                title TEXT,
                content TEXT,
                tags SET<TEXT>,
                likes_count COUNTER,
                comments_count COUNTER,
                PRIMARY KEY ((user_id, year), created_at, post_id)
            ) WITH CLUSTERING ORDER BY (created_at DESC, post_id ASC)
        `;
        await client.execute(createPostsByUserTable);
        console.log('✅ Tạo bảng posts_by_user');

        // 5. User Followers (many-to-many relationship)
        const createFollowersTable = `
            CREATE TABLE IF NOT EXISTS user_followers (
                user_id UUID,
                follower_id UUID,
                follower_name TEXT,
                follower_avatar TEXT,
                created_at TIMESTAMP,
                PRIMARY KEY (user_id, follower_id)
            )
        `;
        await client.execute(createFollowersTable);
        console.log('✅ Tạo bảng user_followers');

        // 6. User Following (reverse relationship)
        const createFollowingTable = `
            CREATE TABLE IF NOT EXISTS user_following (
                follower_id UUID,
                user_id UUID,
                user_name TEXT,
                user_avatar TEXT,
                created_at TIMESTAMP,
                PRIMARY KEY (follower_id, user_id)
            )
        `;
        await client.execute(createFollowingTable);
        console.log('✅ Tạo bảng user_following');

        // 7. Comments table
        const createCommentsTable = `
            CREATE TABLE IF NOT EXISTS comments (
                post_id UUID,
                comment_id UUID,
                user_id UUID,
                user_name TEXT,
                user_avatar TEXT,
                content TEXT,
                created_at TIMESTAMP,
                updated_at TIMESTAMP,
                PRIMARY KEY (post_id, created_at, comment_id)
            ) WITH CLUSTERING ORDER BY (created_at DESC, comment_id ASC)
        `;
        await client.execute(createCommentsTable);
        console.log('✅ Tạo bảng comments');

        // 8. User Activity Feed (denormalized)
        const createActivityFeedTable = `
            CREATE TABLE IF NOT EXISTS user_activity_feed (
                user_id UUID,
                activity_time TIMESTAMP,
                activity_id UUID,
                activity_type TEXT, -- 'post', 'comment', 'like', 'follow'
                target_user_id UUID,
                target_user_name TEXT,
                post_id UUID,
                post_title TEXT,
                content TEXT,
                PRIMARY KEY (user_id, activity_time, activity_id)
            ) WITH CLUSTERING ORDER BY (activity_time DESC, activity_id ASC)
        `;
        await client.execute(createActivityFeedTable);
        console.log('✅ Tạo bảng user_activity_feed');

        // 9. Post Likes (for aggregation examples)
        const createPostLikesTable = `
            CREATE TABLE IF NOT EXISTS post_likes (
                post_id UUID,
                user_id UUID,
                user_name TEXT,
                created_at TIMESTAMP,
                PRIMARY KEY (post_id, user_id)
            )
        `;
        await client.execute(createPostLikesTable);
        console.log('✅ Tạo bảng post_likes');

        // 10. Tag Statistics (aggregation table)
        const createTagStatsTable = `
            CREATE TABLE IF NOT EXISTS tag_statistics (
                tag TEXT PRIMARY KEY,
                posts_count COUNTER,
                total_likes COUNTER,
                total_comments COUNTER,
                last_used TIMESTAMP
            )
        `;
        await client.execute(createTagStatsTable);
        console.log('✅ Tạo bảng tag_statistics');

        // Create indexes
        console.log('\n📊 Tạo indexes...');

        const indexes = [
            `CREATE INDEX IF NOT EXISTS categories_slug_idx ON categories (slug)`,
            `CREATE INDEX IF NOT EXISTS posts_by_category_user_idx ON posts_by_category (user_id)`,
            `CREATE INDEX IF NOT EXISTS user_activity_type_idx ON user_activity_feed (activity_type)`
        ];

        for (const indexQuery of indexes) {
            try {
                await client.execute(indexQuery);
                console.log('✅ Index created');
            } catch (error) {
                if (!error.message.includes('already exists')) {
                    throw error;
                }
            }
        }

        console.log('\n🎉 Advanced schemas created successfully!');

    } catch (error) {
        console.error('❌ Error creating advanced schemas:', error);
        throw error;
    } finally {
        if (client) {
            await client.shutdown();
        }
    }
}

if (require.main === module) {
    createAdvancedSchemas();
}

module.exports = createAdvancedSchemas;
