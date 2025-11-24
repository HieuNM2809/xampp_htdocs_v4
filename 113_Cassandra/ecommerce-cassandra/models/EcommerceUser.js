const database = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

class EcommerceUser {
    constructor() {
        this.usersTable = 'users';
        this.userLoginsTable = 'user_logins';
        this.userSessionsTable = 'user_sessions';
        this.userAddressesTable = 'user_addresses';
        this.userPreferencesTable = 'user_preferences';
        this.authAttemptsTable = 'auth_attempts';
        this.passwordResetTable = 'password_reset_tokens';
    }

    // ===================================
    // USER REGISTRATION & AUTHENTICATION
    // ===================================

    async registerUser(userData) {
        const client = database.getClient();
        const userId = uuidv4();
        const now = new Date();

        try {
            // Check if email already exists
            const existingUser = await this.findByEmail(userData.email);
            if (existingUser) {
                throw new Error('Email đã được sử dụng');
            }

            // Hash password
            const passwordHash = await bcrypt.hash(userData.password, 12);

            // Batch insert user data
            const batch = [
                // Main user record
                {
                    query: `INSERT INTO ${this.usersTable}
                            (user_id, email, username, password_hash, first_name, last_name,
                             phone, account_status, email_verified, phone_verified,
                             created_at, updated_at, privacy_settings)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    params: [
                        userId, userData.email, userData.username || null,
                        passwordHash, userData.firstName, userData.lastName,
                        userData.phone || null, 'active', false, false,
                        now, now, userData.privacySettings || {}
                    ]
                },
                // Login lookup table
                {
                    query: `INSERT INTO ${this.userLoginsTable}
                            (email, user_id, password_hash, account_status, created_at)
                            VALUES (?, ?, ?, ?, ?)`,
                    params: [userData.email, userId, passwordHash, 'active', now]
                },
                // Default preferences
                {
                    query: `INSERT INTO ${this.userPreferencesTable}
                            (user_id, email_notifications, sms_notifications, push_notifications,
                             items_per_page, default_sort_order, currency_preference, language_preference,
                             updated_at)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    params: [
                        userId,
                        { 'order_updates': true, 'promotions': true, 'newsletters': false },
                        { 'order_updates': false, 'promotions': false },
                        { 'order_updates': true, 'promotions': false },
                        20, 'relevance', 'USD', 'en',
                        now
                    ]
                }
            ];

            await client.batch(batch, {
                prepare: true,
                consistency: database.consistencyLevels.localQuorum
            });

            console.log(`✅ User registered successfully: ${userData.email}`);
            return this.findById(userId);

        } catch (error) {
            console.error('❌ User registration failed:', error);
            throw error;
        }
    }

    async authenticateUser(email, password, sessionContext = {}) {
        const client = database.getClient();
        const now = new Date();

        try {
            // Log authentication attempt
            await this.logAuthAttempt(email, sessionContext, null, false);

            // Get user login info
            const loginResult = await client.execute(
                `SELECT * FROM ${this.userLoginsTable} WHERE email = ?`,
                [email],
                { consistency: database.consistencyLevels.localQuorum }
            );

            if (loginResult.rows.length === 0) {
                await this.logAuthAttempt(email, sessionContext, 'email_not_found', false);
                throw new Error('Email không tồn tại');
            }

            const loginData = loginResult.rows[0];

            // Check account status
            if (loginData.account_status !== 'active') {
                await this.logAuthAttempt(email, sessionContext, 'account_inactive', false);
                throw new Error('Tài khoản đã bị khóa');
            }

            // Verify password
            const passwordMatch = await bcrypt.compare(password, loginData.password_hash);
            if (!passwordMatch) {
                await this.logAuthAttempt(email, sessionContext, 'invalid_password', false);
                await this.incrementFailedAttempts(email);
                throw new Error('Mật khẩu không đúng');
            }

            // Successful authentication
            await this.logAuthAttempt(email, sessionContext, null, true);

            // Create session
            const session = await this.createUserSession(loginData.user_id, email, sessionContext);

            // Update last login
            await client.execute(
                `UPDATE ${this.usersTable} SET last_login = ? WHERE user_id = ?`,
                [now, loginData.user_id],
                { consistency: database.consistencyLevels.one }
            );

            return {
                user: await this.findById(loginData.user_id),
                session: session
            };

        } catch (error) {
            console.error('❌ Authentication failed:', error);
            throw error;
        }
    }

    async createUserSession(userId, email, sessionContext) {
        const client = database.getClient();
        const sessionId = crypto.randomBytes(32).toString('hex');
        const now = new Date();

        // Get user details for session
        const user = await this.findById(userId);

        const sessionTTL = this.calculateSessionTTL(sessionContext.deviceType, sessionContext.rememberMe);

        await client.execute(`
            INSERT INTO ${this.userSessionsTable}
            (session_id, user_id, user_email, user_name, user_role,
             ip_address, user_agent, device_info, last_activity, created_at, session_data)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            USING TTL ?
        `, [
            sessionId, userId, email,
            `${user.first_name} ${user.last_name}`, 'customer',
            sessionContext.ipAddress, sessionContext.userAgent,
            sessionContext.deviceInfo || {}, now, now, {}
            , sessionTTL
        ]);

        return {
            sessionId,
            expiresAt: new Date(Date.now() + (sessionTTL * 1000)),
            ttl: sessionTTL
        };
    }

    calculateSessionTTL(deviceType, rememberMe) {
        const baseTTL = {
            'mobile': 30 * 24 * 60 * 60,     // 30 days for mobile
            'desktop': 7 * 24 * 60 * 60,     // 7 days for desktop
            'tablet': 14 * 24 * 60 * 60      // 14 days for tablet
        };

        let ttl = baseTTL[deviceType] || baseTTL['desktop'];

        if (rememberMe) {
            ttl *= 4; // Extended session if "remember me" is checked
        }

        return ttl;
    }

    // ===================================
    // USER DATA MANAGEMENT
    // ===================================

    async findById(userId) {
        const client = database.getClient();

        try {
            const result = await client.execute(
                `SELECT * FROM ${this.usersTable} WHERE user_id = ?`,
                [userId],
                { consistency: database.consistencyLevels.localQuorum }
            );

            if (result.rows.length === 0) return null;

            const user = result.rows[0];

            // Calculate derived fields
            const avgOrderValue = user.total_orders > 0 ?
                user.total_spent / user.total_orders : 0;

            return {
                ...user,
                calculated_fields: {
                    avg_order_value_cents: avgOrderValue,
                    account_age_days: Math.floor((Date.now() - user.created_at.getTime()) / (1000 * 60 * 60 * 24))
                }
            };

        } catch (error) {
            console.error('❌ Error finding user by ID:', error);
            throw error;
        }
    }

    async findByEmail(email) {
        const client = database.getClient();

        try {
            const result = await client.execute(
                `SELECT * FROM ${this.userLoginsTable} WHERE email = ?`,
                [email],
                { consistency: database.consistencyLevels.localQuorum }
            );

            if (result.rows.length === 0) return null;

            const loginData = result.rows[0];
            return await this.findById(loginData.user_id);

        } catch (error) {
            console.error('❌ Error finding user by email:', error);
            throw error;
        }
    }

    async updateUserProfile(userId, updateData) {
        const client = database.getClient();
        const now = new Date();

        try {
            // Dynamic update query building
            const updateFields = [];
            const params = [];

            if (updateData.firstName !== undefined) {
                updateFields.push('first_name = ?');
                params.push(updateData.firstName);
            }
            if (updateData.lastName !== undefined) {
                updateFields.push('last_name = ?');
                params.push(updateData.lastName);
            }
            if (updateData.phone !== undefined) {
                updateFields.push('phone = ?');
                params.push(updateData.phone);
            }
            if (updateData.profilePicture !== undefined) {
                updateFields.push('profile_picture = ?');
                params.push(updateData.profilePicture);
            }
            if (updateData.bio !== undefined) {
                updateFields.push('bio = ?');
                params.push(updateData.bio);
            }

            updateFields.push('updated_at = ?');
            params.push(now);
            params.push(userId); // WHERE condition

            if (updateFields.length > 1) { // More than just updated_at
                const query = `
                    UPDATE ${this.usersTable}
                    SET ${updateFields.join(', ')}
                    WHERE user_id = ?
                `;

                await client.execute(query, params, {
                    prepare: true,
                    consistency: database.consistencyLevels.localQuorum
                });
            }

            return this.findById(userId);

        } catch (error) {
            console.error('❌ Error updating user profile:', error);
            throw error;
        }
    }

    // ===================================
    // SESSION MANAGEMENT
    // ===================================

    async getValidSession(sessionId) {
        const client = database.getClient();

        try {
            const result = await client.execute(
                `SELECT * FROM ${this.userSessionsTable} WHERE session_id = ?`,
                [sessionId],
                { consistency: database.consistencyLevels.one } // Fast session lookup
            );

            if (result.rows.length === 0) return null;

            const session = result.rows[0];

            // Update last activity
            await client.execute(
                `UPDATE ${this.userSessionsTable} SET last_activity = ? WHERE session_id = ?`,
                [new Date(), sessionId],
                { consistency: database.consistencyLevels.one }
            );

            return session;

        } catch (error) {
            console.error('❌ Error getting session:', error);
            return null;
        }
    }

    async invalidateSession(sessionId) {
        const client = database.getClient();

        try {
            // Set TTL to 1 second to expire session immediately
            await client.execute(
                `UPDATE ${this.userSessionsTable} SET session_data = ? WHERE session_id = ? USING TTL ?`,
                [{ invalidated: 'true' }, sessionId, 1],
                { consistency: database.consistencyLevels.localQuorum }
            );

            console.log(`✅ Session invalidated: ${sessionId}`);

        } catch (error) {
            console.error('❌ Error invalidating session:', error);
            throw error;
        }
    }

    // ===================================
    // ADDRESS MANAGEMENT
    // ===================================

    async addUserAddress(userId, addressData) {
        const client = database.getClient();
        const addressId = uuidv4();
        const now = new Date();

        try {
            await client.execute(`
                INSERT INTO ${this.userAddressesTable}
                (user_id, address_id, address_type, is_default, recipient_name,
                 street_line1, street_line2, city, state_province, postal_code, country,
                 delivery_instructions, address_label, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                userId, addressId, addressData.type, addressData.isDefault || false,
                addressData.recipientName, addressData.streetLine1, addressData.streetLine2,
                addressData.city, addressData.stateProvince, addressData.postalCode, addressData.country,
                addressData.deliveryInstructions, addressData.label, now, now
            ], {
                prepare: true,
                consistency: database.consistencyLevels.localQuorum
            });

            // If this is set as default, update other addresses
            if (addressData.isDefault) {
                await this.setDefaultAddress(userId, addressId, addressData.type);
            }

            return addressId;

        } catch (error) {
            console.error('❌ Error adding user address:', error);
            throw error;
        }
    }

    async getUserAddresses(userId, addressType = null) {
        const client = database.getClient();

        try {
            let query = `SELECT * FROM ${this.userAddressesTable} WHERE user_id = ?`;
            const params = [userId];

            if (addressType) {
                query += ` AND address_type = ? ALLOW FILTERING`;
                params.push(addressType);
            }

            const result = await client.execute(query, params, {
                consistency: database.consistencyLevels.one
            });

            return result.rows;

        } catch (error) {
            console.error('❌ Error getting user addresses:', error);
            throw error;
        }
    }

    // ===================================
    // SECURITY & ANALYTICS
    // ===================================

    async logAuthAttempt(email, sessionContext, failureReason, success) {
        const client = database.getClient();
        const now = new Date();
        const attemptId = cassandra.types.TimeUuid.now();

        try {
            await client.execute(`
                INSERT INTO ${this.authAttemptsTable}
                (email, attempt_timestamp, attempt_id, success, failure_reason,
                 ip_address, user_agent, country, suspicious_indicators)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                email, now, attemptId, success, failureReason,
                sessionContext.ipAddress, sessionContext.userAgent,
                sessionContext.country || null, sessionContext.suspiciousIndicators || []
            ], {
                consistency: database.consistencyLevels.one // Fast logging
            });

            // Update rate limiting counter
            if (!success) {
                await client.execute(
                    `UPDATE ${this.authAttemptsTable} SET attempts_in_window = attempts_in_window + 1 WHERE email = ?`,
                    [email]
                );
            }

        } catch (error) {
            console.error('❌ Error logging auth attempt:', error);
            // Don't throw - logging failures shouldn't break authentication
        }
    }

    async incrementFailedAttempts(email) {
        const client = database.getClient();

        try {
            await client.execute(
                `UPDATE ${this.userLoginsTable}
                 SET failed_login_attempts = failed_login_attempts + 1, last_failed_login = ?
                 WHERE email = ?`,
                [new Date(), email],
                { consistency: database.consistencyLevels.one }
            );

            // Check if account should be locked
            const loginData = await client.execute(
                `SELECT failed_login_attempts FROM ${this.userLoginsTable} WHERE email = ?`,
                [email]
            );

            const failedAttempts = loginData.rows[0]?.failed_login_attempts || 0;

            if (failedAttempts >= 5) {
                await this.lockAccount(email, 'too_many_failed_attempts');
            }

        } catch (error) {
            console.error('❌ Error incrementing failed attempts:', error);
        }
    }

    async createPasswordResetToken(email) {
        const client = database.getClient();
        const token = crypto.randomBytes(32).toString('hex');
        const now = new Date();
        const expiresAt = new Date(Date.now() + 3600000); // 1 hour

        try {
            const user = await this.findByEmail(email);
            if (!user) {
                throw new Error('Email không tồn tại');
            }

            await client.execute(`
                INSERT INTO ${this.passwordResetTable}
                (token, user_id, email, created_at, expires_at, is_used)
                VALUES (?, ?, ?, ?, ?, ?)
            `, [token, user.user_id, email, now, expiresAt, false], {
                consistency: database.consistencyLevels.localQuorum
            });

            return { token, expiresAt };

        } catch (error) {
            console.error('❌ Error creating password reset token:', error);
            throw error;
        }
    }

    // ===================================
    // USER ANALYTICS
    // ===================================

    async getUserAnalytics(userId, days = 30) {
        const client = database.getClient();
        const fromDate = new Date();
        fromDate.setDate(fromDate.getDate() - days);

        try {
            // Get user activity summary
            const [orderHistory, behaviorData] = await Promise.all([
                this.getUserOrderSummary(userId, days),
                this.getUserBehaviorSummary(userId, days)
            ]);

            return {
                period_days: days,
                order_analytics: orderHistory,
                behavior_analytics: behaviorData,
                clv_metrics: await this.calculateCustomerLifetimeValue(userId),
                engagement_score: this.calculateEngagementScore(orderHistory, behaviorData)
            };

        } catch (error) {
            console.error('❌ Error getting user analytics:', error);
            throw error;
        }
    }

    async getUserOrderSummary(userId, days) {
        const client = database.getClient();
        const fromDate = new Date();
        fromDate.setDate(fromDate.getDate() - days);

        try {
            // Query orders by user in time range
            const result = await client.execute(`
                SELECT COUNT(*) as order_count, SUM(total_cents) as total_spent
                FROM orders_by_user
                WHERE user_id = ? AND order_date >= ? ALLOW FILTERING
            `, [userId, fromDate], {
                consistency: database.consistencyLevels.one
            });

            return result.rows[0] || { order_count: 0, total_spent: 0 };

        } catch (error) {
            console.error('❌ Error getting user order summary:', error);
            return { order_count: 0, total_spent: 0 };
        }
    }

    calculateEngagementScore(orderData, behaviorData) {
        // Simple engagement scoring algorithm
        const orderScore = Math.min(orderData.order_count * 0.3, 1.0);
        const behaviorScore = Math.min(behaviorData.session_count * 0.1, 1.0);

        return (orderScore + behaviorScore) / 2;
    }

    async updateCustomerCounters(userId, counterUpdates) {
        const client = database.getClient();

        try {
            const updateClauses = [];
            const params = [];

            if (counterUpdates.total_orders !== undefined) {
                updateClauses.push('total_orders = total_orders + ?');
                params.push(counterUpdates.total_orders);
            }

            if (counterUpdates.total_spent !== undefined) {
                updateClauses.push('total_spent = total_spent + ?');
                params.push(counterUpdates.total_spent);
            }

            if (counterUpdates.loyalty_points !== undefined) {
                updateClauses.push('loyalty_points = loyalty_points + ?');
                params.push(counterUpdates.loyalty_points);
            }

            if (updateClauses.length === 0) return;

            params.push(userId);

            await client.execute(`
                UPDATE ${this.usersTable}
                SET ${updateClauses.join(', ')}
                WHERE user_id = ?
            `, params, {
                consistency: database.consistencyLevels.localQuorum
            });

        } catch (error) {
            console.error('❌ Error updating customer counters:', error);
            throw error;
        }
    }

    // ===================================
    // HELPER METHODS
    // ===================================

    async setDefaultAddress(userId, addressId, addressType) {
        const client = database.getClient();

        try {
            // First, unset all current default addresses of this type
            await client.execute(
                `UPDATE ${this.userAddressesTable} SET is_default = false
                 WHERE user_id = ? AND address_type = ? ALLOW FILTERING`,
                [userId, addressType]
            );

            // Then set the new default
            await client.execute(
                `UPDATE ${this.userAddressesTable} SET is_default = true
                 WHERE user_id = ? AND address_id = ?`,
                [userId, addressId]
            );

        } catch (error) {
            console.error('❌ Error setting default address:', error);
            throw error;
        }
    }

    async lockAccount(email, reason) {
        const client = database.getClient();

        try {
            await client.execute(
                `UPDATE ${this.userLoginsTable} SET account_status = ? WHERE email = ?`,
                ['suspended', email]
            );

            console.log(`⚠️ Account locked: ${email} - Reason: ${reason}`);

        } catch (error) {
            console.error('❌ Error locking account:', error);
        }
    }
}

module.exports = new EcommerceUser();
