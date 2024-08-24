Dưới đây là một ví dụ nâng cao về cách sử dụng `yargs` để xây dựng một ứng dụng CLI với nhiều lệnh, xác thực dữ liệu đầu vào, và sử dụng `middleware` để xử lý các tác vụ trước khi lệnh chính được thực thi.

### 1. Tạo ứng dụng quản lý người dùng

Ứng dụng CLI này sẽ có các lệnh như `add`, `remove`, `list`, và `update` để quản lý người dùng. Dữ liệu người dùng sẽ được lưu trữ trong một tệp JSON đơn giản.

#### a. Cấu trúc thư mục:
```
.
├── app.js
└── users.json
```

#### b. Nội dung tệp `app.js`:
```javascript
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
        users.push({ id: argv.id, name: argv.name, email: argv.email });
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
```

#### c. Nội dung tệp `users.json`:
Tệp này có thể bắt đầu trống:
```json
[]
```

### 2. Giải thích mã nguồn

- **Load và lưu trữ dữ liệu người dùng:** Các hàm `loadUsers` và `saveUsers` đọc và ghi dữ liệu người dùng vào tệp JSON.

- **Xác thực đầu vào:** `yargs` sử dụng `builder` để xác định các tham số và kiểm tra chúng trước khi lệnh được thực thi. Ví dụ, trong lệnh `add`, tham số `email` được xác thực định dạng.

- **Middleware:** `yargs` hỗ trợ sử dụng middleware để thực hiện các tác vụ trước khi lệnh chính được chạy. Ở đây, middleware `userExists` kiểm tra xem người dùng có tồn tại trước khi thực hiện lệnh `remove` hoặc `update`.

- **Các lệnh:**
    - `add`: Thêm một người dùng mới.
    - `remove`: Xóa một người dùng dựa trên ID.
    - `list`: Liệt kê tất cả người dùng.
    - `update`: Cập nhật thông tin người dùng.

### 3. Cách sử dụng ứng dụng

**Thêm người dùng:**
```bash
node app.js add --id="1" --name="Alice" --email="alice@example.com"
```

**Liệt kê người dùng:**
```bash
node app.js list
```

**Cập nhật người dùng:**
```bash
node app.js update --id="1" --name="Alice Johnson"
```

**Xóa người dùng:**
```bash
node app.js remove --id="1"
```

### 4. Mở rộng

Bạn có thể mở rộng ví dụ này bằng cách thêm các lệnh khác, sử dụng các tính năng như `completion` (tự động hoàn thành lệnh), hoặc tích hợp với cơ sở dữ liệu thực sự thay vì sử dụng tệp JSON.

### 5. Tích hợp hoàn thiện

Ứng dụng này có thể dễ dàng tích hợp vào hệ thống CI/CD, viết script tự động để quản lý dữ liệu, hoặc tạo các công cụ CLI phức tạp hơn với các tính năng như logging, thống kê, hoặc thậm chí là tích hợp với API bên ngoài.