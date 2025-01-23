**Binlog** (viết tắt của *Binary Log*) là một trong những thành phần quan trọng trong **MySQL** (hoặc MariaDB) dùng để ghi lại tất cả các sự kiện, giao dịch (transactions) thay đổi dữ liệu hoặc cấu trúc của cơ sở dữ liệu. Mục đích chính của Binlog là:

1. **Phục hồi dữ liệu (Point-in-Time Recovery)**: Trong trường hợp bạn có các bản sao lưu (backup) định kỳ, Binlog lưu giữ chi tiết những thay đổi đã diễn ra sau lần sao lưu cuối cùng. Nếu hệ thống gặp sự cố, bạn có thể dùng Binlog để “replay” lại các thay đổi, khôi phục dữ liệu tại một thời điểm mong muốn.
2. **Replication** (nhân bản dữ liệu): MySQL Replication hoạt động bằng cách copy và “replay” các sự kiện ghi trong Binlog từ **Primary** sang **Replica**. Điều này cho phép đồng bộ dữ liệu giữa nhiều máy chủ.

---

## Ví dụ minh hoạ

Giả sử bạn có một cơ sở dữ liệu MySQL với cấu hình Binlog đã được bật. Dưới đây là quy trình khái quát:

### 1. Bật Binlog trong MySQL

Để bật Binlog, bạn cần thiết lập một vài cấu hình trong **my.cnf** hoặc **my.ini** (tùy hệ điều hành), chẳng hạn:

```
[mysqld]
log_bin         = /var/log/mysql/mysql-bin.log   # Đường dẫn file binlog
binlog_format   = ROW                            # Định dạng ghi binlog (ROW/STATEMENT/MIXED)
server_id       = 1                              # Mỗi server phải có 1 ID duy nhất
expire_logs_days= 7                              # Số ngày lưu trữ binlog

```

Sau khi chỉnh sửa, khởi động lại MySQL để áp dụng cấu hình.

### 2. Tạo bảng và ghi dữ liệu

Mở terminal/command line, truy cập MySQL:

```sql
CREATE DATABASE example_db;
USE example_db;

CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50),
  email VARCHAR(50)
);

INSERT INTO users (name, email) VALUES ('Alice', 'alice@example.com');

```

Khi bạn thực hiện các lệnh SQL thay đổi dữ liệu (như `INSERT`, `UPDATE`, `DELETE`, v.v.), MySQL sẽ ghi lại chi tiết trong tệp Binlog (thường là các file như `mysql-bin.000001`, `mysql-bin.000002`,…).

### 3. Kiểm tra nội dung binlog

Bạn có thể dùng lệnh **mysqlbinlog** (được cài kèm MySQL) để xem nội dung các binlog file. Ví dụ:

```bash
mysqlbinlog /var/log/mysql/mysql-bin.000001

```

Đầu ra sẽ chứa chi tiết các sự kiện, dạng text (dù bản chất ban đầu là nhị phân) hiển thị các lệnh SQL hoặc các ghi chú về thay đổi hàng (nếu dùng định dạng ROW).

### 4. Ứng dụng: Phục hồi dữ liệu

Giả sử bạn có một bản backup của `example_db` được tạo 1 ngày trước, nhưng đã xóa nhầm dữ liệu hôm nay. Bạn có thể phục hồi bằng cách:

1. **Khôi phục** cơ sở dữ liệu từ file backup (dữ liệu sẽ về trạng thái ngày hôm qua).
2. **Dùng binlog** replay các thay đổi đã được ghi nhận từ hôm qua đến thời điểm trước khi xóa nhầm.

Chẳng hạn, chạy:

```bash
C1: mysqlbinlog --stop-datetime="2025-01-22 12:00:00" \
  /var/log/mysql/mysql-bin.000001 | mysql -u root -p

C2: mysqlbinlog --stop-datetime="2025-01-23 13:20:00" /var/log/mysql/mysql-bin.000001 | mysql -u root -p --force
```
(`--force` xoá hết và tạo lại).
(`--stop-datetime` giúp dừng replay binlog trước thời điểm bạn gây ra xóa nhầm).

Nhờ đó, bạn khôi phục được dữ liệu mà không mất những thay đổi quan trọng.

---

### Tổng kết nhanh

- **Binlog**: Nhật ký nhị phân lưu vết mọi thay đổi dữ liệu/struktur.
- **Phục hồi Point-in-Time**: Dựa vào Binlog để khôi phục đúng thời điểm.
- **Replication**: Thông qua Binlog để đồng bộ từ Primary sang Replica.

Hiểu rõ Binlog giúp bạn quản lý, sao lưu và khôi phục dữ liệu một cách an toàn và linh hoạt trong các môi trường MySQL/MariaDB.