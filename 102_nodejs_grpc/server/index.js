const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// Đường dẫn đến file proto
const PROTO_PATH = path.join(__dirname, '../proto/todo.proto');

// Tải file proto
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

// Tạo package proto từ định nghĩa
const todoProto = grpc.loadPackageDefinition(packageDefinition).todo;

// Dữ liệu tạm thời (trong thực tế nên sử dụng database)
const todos = [];

// Triển khai các phương thức của service
const createTodo = (call, callback) => {
  const todoItem = call.request;
  todoItem.id = uuidv4(); // Tạo ID duy nhất cho todo mới
  todos.push(todoItem);
  callback(null, todoItem);
  console.log(`Todo created: "${todoItem.title}" with ID: ${todoItem.id}`);
};

const getTodos = (call, callback) => {
  callback(null, { items: todos });
  console.log(`Retrieved ${todos.length} todos`);
};

const getTodo = (call, callback) => {
  const todoId = call.request.id;
  const todoItem = todos.find(item => item.id === todoId);
  
  if (todoItem) {
    callback(null, todoItem);
    console.log(`Retrieved todo: "${todoItem.title}"`);
  } else {
    callback({
      code: grpc.status.NOT_FOUND,
      details: `Todo with ID ${todoId} not found`
    });
    console.log(`Todo with ID ${todoId} not found`);
  }
};

const updateTodo = (call, callback) => {
  const updatedTodo = call.request;
  const index = todos.findIndex(item => item.id === updatedTodo.id);
  
  if (index !== -1) {
    todos[index] = updatedTodo;
    callback(null, updatedTodo);
    console.log(`Updated todo: "${updatedTodo.title}"`);
  } else {
    callback({
      code: grpc.status.NOT_FOUND,
      details: `Todo with ID ${updatedTodo.id} not found`
    });
    console.log(`Todo with ID ${updatedTodo.id} not found for update`);
  }
};

const deleteTodo = (call, callback) => {
  const todoId = call.request.id;
  const index = todos.findIndex(item => item.id === todoId);
  
  if (index !== -1) {
    const deletedTodo = todos[index];
    todos.splice(index, 1);
    callback(null, {});
    console.log(`Deleted todo: "${deletedTodo.title}"`);
  } else {
    callback({
      code: grpc.status.NOT_FOUND,
      details: `Todo with ID ${todoId} not found`
    });
    console.log(`Todo with ID ${todoId} not found for deletion`);
  }
};

// Khởi tạo server
const startServer = () => {
  const server = new grpc.Server();
  
  // Đăng ký các phương thức của service
  server.addService(todoProto.TodoService.service, {
    createTodo,
    getTodos,
    getTodo,
    updateTodo,
    deleteTodo
  });
  
  // Khởi động server
  server.bindAsync('0.0.0.0:50051', grpc.ServerCredentials.createInsecure(), (error, port) => {
    if (error) {
      console.error(`Error starting server: ${error}`);
      return;
    }
    console.log(`gRPC server running at http://0.0.0.0:${port}`);
    server.start();
  });
};

startServer(); 