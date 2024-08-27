Dưới đây là một ví dụ chi tiết và nâng cao về việc sử dụng Mongoose middleware với `pre` và `post`, với cấu trúc tách file rõ ràng. Chúng ta sẽ tạo một ứng dụng Node.js đơn giản, sử dụng MongoDB, và áp dụng middleware để thực hiện các thao tác trước và sau khi lưu dữ liệu vào cơ sở dữ liệu.

### 1. Cài đặt dự án

Trước tiên, tạo một thư mục dự án và cài đặt các gói cần thiết:

```bash
mkdir mongoose-middleware-example
cd mongoose-middleware-example
npm init -y
npm install mongoose
```

### 2. Cấu trúc dự án

Dưới đây là cấu trúc thư mục cho dự án:

```
mongoose-middleware-example/
│
├── models/
│   └── user.model.js
│
├── middleware/
│   └── user.middleware.js
│
├── index.js
└── config/
    └── database.js
```

### 3. Tạo kết nối cơ sở dữ liệu

Tạo tệp `config/database.js` để thiết lập kết nối với MongoDB:

```javascript
// config/database.js
const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    await mongoose.connect('mongodb://localhost:27017/middleware_example', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB connected...');
  } catch (error) {
    console.error('MongoDB connection failed:', error);
    process.exit(1);
  }
};

module.exports = connectDB;
```

### 4. Tạo mô hình dữ liệu `User`

Tạo tệp `models/user.model.js` để định nghĩa mô hình `User` và áp dụng middleware:

```javascript
// models/user.model.js
const mongoose = require('mongoose');
const { preSave, postSave } = require('../middleware/user.middleware');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Pre-save middleware
userSchema.pre('save', preSave);

// Post-save middleware
userSchema.post('save', postSave);

const User = mongoose.model('User', userSchema);

module.exports = User;
```

### 5. Tạo Middleware cho `User`

Tạo tệp `middleware/user.middleware.js` để xử lý logic trong middleware:

```javascript
// middleware/user.middleware.js
const bcrypt = require('bcrypt');

// Pre-save middleware: Hash password before saving
const preSave = async function (next) {
  try {
    if (!this.isModified('password')) return next();

    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
};

// Post-save middleware: Log user details after saving
const postSave = function (doc, next) {
  console.log('New user was created and saved:', doc);
  next();
};

module.exports = {
  preSave,
  postSave,
};
```

### 6. Tạo điểm vào chính

Tạo tệp `index.js` để khởi động ứng dụng và thực hiện các thao tác với mô hình `User`:

```javascript
// index.js
const mongoose = require('mongoose');
const connectDB = require('./config/database');
const User = require('./models/user.model');

connectDB();

const createUser = async () => {
  try {
    const user = new User({
      name: 'John Doe',
      email: 'john@example.com',
      password: '123456',
    });

    await user.save();
    console.log('User created successfully');
  } catch (error) {
    console.error('Error creating user:', error);
  } finally {
    mongoose.connection.close();
  }
};

createUser();
```

### 7. Chạy ứng dụng

Chạy ứng dụng của bạn bằng lệnh:

```bash
node index.js
```

### 8. Kết quả

Khi bạn chạy ứng dụng, middleware `pre-save` sẽ băm mật khẩu người dùng trước khi lưu vào cơ sở dữ liệu, và middleware `post-save` sẽ ghi log thông tin người dùng sau khi đã được lưu thành công.

### Giải thích chi tiết:

1. **`preSave` Middleware**: 
   - Được gọi trước khi một tài liệu `User` được lưu vào MongoDB.
   - Middleware này kiểm tra xem trường `password` có bị thay đổi không (`this.isModified('password')`). Nếu có, nó sẽ băm mật khẩu bằng `bcrypt` và lưu giá trị đã băm lại trong trường `password`.
   
2. **`postSave` Middleware**:
   - Được gọi sau khi một tài liệu `User` đã được lưu thành công.
   - Middleware này chỉ đơn giản là ghi log thông tin của người dùng vừa được tạo.

3. **Tách file**: 
   - Chúng ta đã tách cấu trúc file một cách rõ ràng để dễ dàng quản lý và mở rộng dự án, đặc biệt trong các dự án lớn.

Hy vọng ví dụ này đã cung cấp cho bạn một cái nhìn toàn diện về cách sử dụng Mongoose middleware một cách nâng cao và chuyên nghiệp!