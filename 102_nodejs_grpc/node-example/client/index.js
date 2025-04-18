const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");
const path = require("path");
const readline = require("readline");

// Đường dẫn đến file proto
const PROTO_PATH = path.join(__dirname, "../proto/todo.proto");

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

const client = new todoProto.TodoService(
  "localhost:50051", // Địa chỉ server gRPC
  grpc.credentials.createInsecure() // Credentials cho kết nối không bảo mật
);

// Interface đọc input từ console
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// Hiển thị menu
function showMenu() {
  console.log("\n==== Todo App ====");
  console.log("1. Tạo công việc");
  console.log("2. Xem danh sách công việc");
  console.log("3. Xem chi tiết công việc");
  console.log("4. Cập nhật công việc");
  console.log("5. Xóa công việc");
  console.log("0. Thoát");
  console.log("=================");

  rl.question("Chọn chức năng: ", (choice) => {
    switch (choice) {
      case "1":
        createTodo();
        break;
      case "2":
        listTodos();
        break;
      case "3":
        viewTodo();
        break;
      case "4":
        updateTodo();
        break;
      case "5":
        deleteTodo();
        break;
      case "0":
        console.log("Tạm biệt!");
        rl.close();
        process.exit(0);
        break;
      default:
        console.log("Lựa chọn không hợp lệ!");
        showMenu();
        break;
    }
  });
}

// Tạo công việc mới
function createTodo() {
  rl.question("Tiêu đề: ", (title) => {
    rl.question("Mô tả: ", (description) => {
      client.createTodo(
        {
          title,
          description,
          completed: false,
        },
        (error, response) => {
          if (error) {
            console.error("Lỗi:", error.details);
          } else {
            console.log("Công việc đã được tạo thành công!");
            console.log("ID:", response.id);
            console.log("Tiêu đề:", response.title);
            console.log("Mô tả:", response.description);
            console.log(
              "Trạng thái:",
              response.completed ? "Hoàn thành" : "Chưa hoàn thành"
            );
          }
          showMenu();
        }
      );
    });
  });
}

// Hiển thị danh sách công việc
function listTodos() {
  client.getTodos({}, (error, response) => {
    if (error) {
      console.error("Lỗi:", error.details);
    } else {
      console.log("\n==== Danh sách công việc ====");
      if (response.items.length === 0) {
        console.log("Chưa có công việc nào.");
      } else {
        response.items.forEach((todo, index) => {
          console.log(
            `${index + 1}. [${todo.completed ? "X" : " "}] ${todo.title} (ID: ${
              todo.id
            })`
          );
        });
      }
    }
    showMenu();
  });
}

// Xem chi tiết công việc
function viewTodo() {
  rl.question("Nhập ID công việc: ", (id) => {
    client.getTodo({ id }, (error, response) => {
      if (error) {
        console.error("Lỗi:", error.details);
      } else {
        console.log("\n==== Chi tiết công việc ====");
        console.log("ID:", response.id);
        console.log("Tiêu đề:", response.title);
        console.log("Mô tả:", response.description);
        console.log(
          "Trạng thái:",
          response.completed ? "Hoàn thành" : "Chưa hoàn thành"
        );
      }
      showMenu();
    });
  });
}

// Cập nhật công việc
function updateTodo() {
  rl.question("Nhập ID công việc: ", (id) => {
    client.getTodo({ id }, (error, todo) => {
      if (error) {
        console.error("Lỗi:", error.details);
        showMenu();
        return;
      }

      console.log("\nThông tin hiện tại:");
      console.log("Tiêu đề:", todo.title);
      console.log("Mô tả:", todo.description);
      console.log(
        "Trạng thái:",
        todo.completed ? "Hoàn thành" : "Chưa hoàn thành"
      );

      rl.question("Tiêu đề mới (nhấn Enter để giữ nguyên): ", (title) => {
        rl.question("Mô tả mới (nhấn Enter để giữ nguyên): ", (description) => {
          rl.question(
            "Trạng thái (1: Hoàn thành, 0: Chưa hoàn thành, Enter để giữ nguyên): ",
            (completed) => {
              const updatedTodo = {
                id,
                title: title || todo.title,
                description: description || todo.description,
                completed:
                  completed === "1"
                    ? true
                    : completed === "0"
                    ? false
                    : todo.completed,
              };

              client.updateTodo(updatedTodo, (error, response) => {
                if (error) {
                  console.error("Lỗi:", error.details);
                } else {
                  console.log("Cập nhật thành công!");
                }
                showMenu();
              });
            }
          );
        });
      });
    });
  });
}

// Xóa công việc
function deleteTodo() {
  rl.question("Nhập ID công việc cần xóa: ", (id) => {
    client.deleteTodo({ id }, (error, response) => {
      if (error) {
        console.error("Lỗi:", error.details);
      } else {
        console.log("Công việc đã được xóa thành công!");
      }
      showMenu();
    });
  });
}

// Bắt đầu ứng dụng
console.log("Kết nối đến gRPC server...");
showMenu();
