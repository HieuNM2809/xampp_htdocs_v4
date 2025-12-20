const _ = require('lodash');

// Utility functions với một số code issues để demo

class UserUtils {
    // Code smell: unused parameter
    static formatUserData(user, options) {
        return {
            id: user.id,
            name: user.name.toUpperCase(),
            email: user.email.toLowerCase()
        };
    }
    
    // Duplicate code
    static isValidEmail(email) {
        const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return regex.test(email);
    }
    
    // Another duplicate email validation
    static checkEmail(email) {
        const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return regex.test(email);
    }
    
    // Code smell: too many parameters
    static createUser(id, firstName, lastName, email, phone, address, city, country, zipCode) {
        return {
            id,
            firstName,
            lastName, 
            email,
            phone,
            address,
            city,
            country,
            zipCode
        };
    }
    
    // Security hotspot: potential SQL injection risk (mô phỏng)
    static searchUsers(query) {
        // Đây chỉ là mô phỏng - trong thực tế sẽ là SQL query
        const sqlQuery = `SELECT * FROM users WHERE name LIKE '%${query}%'`;
        console.log('Executing query:', sqlQuery);
        return [];
    }
}

// Dead code - function không được sử dụng
function unusedFunction() {
    const data = 'this function is never called';
    return data;
}

// Cognitive complexity cao
function processUserData(users, filters, options) {
    let result = [];
    
    for (let user of users) {
        if (filters) {
            if (filters.status) {
                if (user.status === filters.status) {
                    if (filters.role) {
                        if (user.role === filters.role) {
                            if (options) {
                                if (options.includeInactive) {
                                    result.push(user);
                                } else {
                                    if (user.active) {
                                        result.push(user);
                                    }
                                }
                            } else {
                                result.push(user);
                            }
                        }
                    } else {
                        result.push(user);
                    }
                }
            } else {
                result.push(user);
            }
        } else {
            result.push(user);
        }
    }
    
    return result;
}

module.exports = {
    UserUtils,
    processUserData
};
