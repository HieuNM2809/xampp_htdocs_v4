const yargs = require('yargs');
const fs = require('fs');

// Load users from JSON file
const loadUsers = () => {
    try {
        const dataBuffer = fs.readFileSync('users.json');
        return JSON.parse(dataBuffer.toString());
    } catch (e) {
        return [];
    }
};

// Save users to JSON file
const saveUsers = (users) => {
    fs.writeFileSync('users.json', JSON.stringify(users));
};

// Middleware to check if user exists
const userExists = (argv) => {
    const users = loadUsers();
    const user = users.find(user => user.id === argv.id);
    if (!user) {
        throw new Error(`User with ID ${argv.id} not found.`);
    }
    return true;
};

yargs
    .command({
        command: 'add',
        describe: 'Add a new user',
        builder: {
            id: {
                describe: 'User ID',
                demandOption: true,
                type: 'string'
            },
            name: {
                describe: 'User name',
                demandOption: true,
                type: 'string'
            },
            email: {
                describe: 'User email',
                demandOption: true,
                type: 'string',
                coerce: (email) => {
                    if (!email.includes('@')) {
                        throw new Error('Invalid email format.');
                    }
                    return email;
                }
            }
        },
        handler(argv) {
            const users = loadUsers();
            const duplicateUser = users.find(user => user.id === argv.id);

            if (duplicateUser) {
                console.log('User ID already exists. Please use a unique ID.');
            } else {
                users.push({id: argv.id, name: argv.name, email: argv.email});
                saveUsers(users);
                console.log('User added successfully.');
            }
        }
    })
    .command({
        command: 'remove',
        describe: 'Remove a user',
        builder: {
            id: {
                describe: 'User ID',
                demandOption: true,
                type: 'string'
            }
        },
        middleware: [userExists],
        handler(argv) {
            let users = loadUsers();
            users = users.filter(user => user.id !== argv.id);
            saveUsers(users);
            console.log('User removed successfully.');
        }
    })
    .command({
        command: 'list',
        describe: 'List all users',
        handler() {
            const users = loadUsers();
            console.log('Listing all users:');
            users.forEach(user => {
                console.log(`ID: ${user.id}, Name: ${user.name}, Email: ${user.email}`);
            });
        }
    })
    .command({
        command: 'update',
        describe: 'Update user information',
        builder: {
            id: {
                describe: 'User ID',
                demandOption: true,
                type: 'string'
            },
            name: {
                describe: 'New user name',
                type: 'string'
            },
            email: {
                describe: 'New user email',
                type: 'string',
                coerce: (email) => {
                    if (email && !email.includes('@')) {
                        throw new Error('Invalid email format.');
                    }
                    return email;
                }
            }
        },
        middleware: [userExists],
        handler(argv) {
            const users = loadUsers();
            const user = users.find(user => user.id === argv.id);

            if (argv.name) user.name = argv.name;
            if (argv.email) user.email = argv.email;

            saveUsers(users);
            console.log('User updated successfully.');
        }
    })
    .help()
    .argv;