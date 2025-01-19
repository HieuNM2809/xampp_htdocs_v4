const db = require('./db');

// Tạo một bảng mẫu (nếu chưa có)
const createTable = async () => {
  try {
    const exists = await db.schema.hasTable('users');
    if (!exists) {
      await db.schema.createTable('users', (table) => {
        table.increments('id').primary(); // ID tự tăng
        table.string('name').notNullable(); // Cột tên
        table.integer('age').notNullable(); // Cột tuổi
      });
      console.log('Table "users" created successfully.');
    }
  } catch (error) {
    console.error('Error creating table:', error);
  }
};

// Thêm dữ liệu
const insertUser = async (name, age) => {
  try {
    const result = await db('users').insert({ name, age });
    console.log('User added with ID:', result[0]);
  } catch (error) {
    console.error('Error inserting user:', error);
  }
};

// Lấy dữ liệu
const getUsers = async () => {
  try {
    const users = await db('users').select('*');
    console.log('Users:', users);
  } catch (error) {
    console.error('Error fetching users:', error);
  }
};

// Sửa dữ liệu
const updateUser = async (id, newName, newAge) => {
  try {
    await db('users').where('id', id).update({ name: newName, age: newAge });
    console.log(`User with ID ${id} updated successfully.`);
  } catch (error) {
    console.error('Error updating user:', error);
  }
};

// Xóa dữ liệu
const deleteUser = async (id) => {
  try {
    await db('users').where('id', id).del();
    console.log(`User with ID ${id} deleted successfully.`);
  } catch (error) {
    console.error('Error deleting user:', error);
  }
};

// // Main function to test
const main = async () => {
  await createTable(); // Tạo bảng nếu chưa có

  console.log('Inserting users...');
  await insertUser('Alice', 25);
  await insertUser('Bob', 30);

  console.log('Fetching users...');
  await getUsers();

  console.log('Updating user...');
  await updateUser(1, 'Alice Updated', 26);

  console.log('Fetching users again...');
  await getUsers();

  console.log('Deleting user...');
  await deleteUser(2);

  console.log('Fetching final users...');
  await getUsers();

  console.log('Fetching raw sql...');
  await db.raw('SELECT * FROM users WHERE age < ?', [18])
  .then(data => console.log(data));

  // Đừng quên đóng kết nối
  db.destroy();
};

main();
