### Knex là gì?

Knex.js là một **SQL query builder** dành cho Node.js, được sử dụng để tương tác với cơ sở dữ liệu theo cách dễ dàng và có thể mở rộng. Nó cho phép bạn viết các truy vấn cơ sở dữ liệu một cách ngắn gọn và thân thiện hơn so với việc sử dụng trực tiếp cú pháp SQL thuần túy. Knex hỗ trợ nhiều loại cơ sở dữ liệu phổ biến như:

- PostgreSQL
- MySQL
- SQLite3
- Oracle
- Microsoft SQL Server
- MariaDB

---

### Các tính năng nổi bật của Knex.js:

1. **Query Builder (Trình tạo truy vấn):**
   - Knex cung cấp cú pháp JavaScript để viết các truy vấn SQL như `SELECT`, `INSERT`, `UPDATE`, và `DELETE`. Điều này giúp tránh các lỗi cú pháp SQL phức tạp.

2. **Migration và Seeding:**
   - Knex hỗ trợ **migration** để quản lý và thay đổi cấu trúc cơ sở dữ liệu theo từng phiên bản.
   - Nó cũng hỗ trợ **seeding** để tạo dữ liệu mẫu trong cơ sở dữ liệu.

3. **Hỗ trợ Promise:**
   - Knex tích hợp Promise, giúp dễ dàng xử lý các truy vấn bất đồng bộ.

4. **Đa cơ sở dữ liệu:**
   - Knex hỗ trợ nhiều cơ sở dữ liệu khác nhau, giúp bạn dễ dàng thay đổi giữa các hệ thống cơ sở dữ liệu mà không cần sửa đổi nhiều code.

5. **Cấu hình linh hoạt:**
   - Dễ dàng cấu hình các thông số kết nối, như host, username, password, port, và database.

---

### Ví dụ sử dụng Knex.js:

#### 1. Cài đặt Knex.js:
Trước tiên, cài đặt Knex và driver cho cơ sở dữ liệu mà bạn sử dụng (ví dụ, MySQL):
```bash
npm install knex mysql
```

#### 2. Khởi tạo Knex:
```javascript
const knex = require('knex')({
  client: 'mysql', // Hoặc 'pg', 'sqlite3', v.v.
  connection: {
    host: '127.0.0.1',
    user: 'your_database_user',
    password: 'your_database_password',
    database: 'your_database_name'
  }
});
```

#### 3. Ví dụ truy vấn:

- **SELECT**:
  ```javascript
  knex('users')
    .select('*')
    .where('id', 1)
    .then(rows => console.log(rows))
    .catch(err => console.error(err));
  ```

- **INSERT**:
  ```javascript
  knex('users')
    .insert({ name: 'John', age: 30 })
    .then(() => console.log('User inserted'))
    .catch(err => console.error(err));
  ```

- **UPDATE**:
  ```javascript
  knex('users')
    .where('id', 1)
    .update({ age: 31 })
    .then(() => console.log('User updated'))
    .catch(err => console.error(err));
  ```

- **DELETE**:
  ```javascript
  knex('users')
    .where('id', 1)
    .del()
    .then(() => console.log('User deleted'))
    .catch(err => console.error(err));
  ```

#### 4. Migration:
Tạo migration:
```bash
npx knex migrate:make create_users_table
```

Tệp migration mẫu:
```javascript
exports.up = function(knex) {
  return knex.schema.createTable('users', table => {
    table.increments('id').primary();
    table.string('name');
    table.integer('age');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('users');
};
```

Chạy migration:
```bash
npx knex migrate:latest
```

---

### Khi nào nên sử dụng Knex.js?
Knex.js phù hợp khi:
- Bạn cần viết các truy vấn SQL nhưng muốn quản lý code rõ ràng, có cấu trúc hơn.
- Bạn làm việc trên các dự án Node.js sử dụng cơ sở dữ liệu quan hệ.
- Bạn muốn sử dụng một công cụ linh hoạt và mạnh mẽ, hỗ trợ quản lý schema (migration) và dữ liệu mẫu (seeding). 

Knex.js thường được sử dụng với các framework như **Express.js** hoặc **Koa.js** trong các ứng dụng Node.js.