const express = require('express');
const _ = require('lodash');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// Sample data
let users = [
    { id: 1, name: 'John Doe', email: 'john@example.com' },
    { id: 2, name: 'Jane Smith', email: 'jane@example.com' }
];

// Routes
app.get('/', (req, res) => {
    res.json({ message: 'Welcome to Node.js SonarQube Demo API' });
});

// Get all users
app.get('/api/users', (req, res) => {
    res.json(users);
});

// Get user by ID - có một số code smell cố ý để demo
app.get('/api/users/:id', (req, res) => {
    const id = parseInt(req.params.id);
    
    // Code smell: unused variable
    const unusedVar = 'this is unused';
    
    // Code smell: inefficient loop
    let foundUser = null;
    for (let i = 0; i < users.length; i++) {
        if (users[i].id == id) { // Code smell: == thay vì ===
            foundUser = users[i];
            break;
        }
    }
    
    if (foundUser) {
        res.json(foundUser);
    } else {
        res.status(404).json({ error: 'User not found' });
    }
});

// Create new user
app.post('/api/users', (req, res) => {
    const { name, email } = req.body;
    
    // Code smell: no input validation
    const newUser = {
        id: users.length + 1,
        name: name,
        email: email
    };
    
    users.push(newUser);
    res.status(201).json(newUser);
});

// Duplicate code - code smell
function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function validateUserEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Function with high complexity - code smell
function complexFunction(data) {
    if (data) {
        if (data.type === 'user') {
            if (data.status === 'active') {
                if (data.permissions) {
                    if (data.permissions.read) {
                        if (data.permissions.write) {
                            if (data.permissions.admin) {
                                return 'full-access';
                            } else {
                                return 'read-write';
                            }
                        } else {
                            return 'read-only';
                        }
                    } else {
                        return 'no-access';
                    }
                } else {
                    return 'no-permissions';
                }
            } else {
                return 'inactive';
            }
        } else {
            return 'not-user';
        }
    } else {
        return 'no-data';
    }
}

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

module.exports = app;
