

---

## A. Các lệnh Redis Sentinel

> **Chạy trong container Sentinel**
> `docker exec redis-sentinel-1 redis-cli -p 26379 <LỆNH>`

| Lệnh                                           | Mô tả                                                          |
| ---------------------------------------------- | -------------------------------------------------------------- |
| `SENTINEL masters`                             | Liệt kê tất cả các nhóm master mà Sentinel đang giám sát.      |
| `SENTINEL master <mymaster>`                   | Hiển thị thông tin chi tiết của nhóm master `mymaster`.        |
| `SENTINEL slaves <mymaster>`                   | Liệt kê các replica (slave) đang thuộc nhóm `mymaster`.        |
| `SENTINEL sentinels <mymaster>`                | Hiển thị các Sentinel khác cùng giám sát `mymaster`.           |
| `SENTINEL get-master-addr-by-name <mymaster>`  | Trả về `[IP, PORT]` của master hiện tại.                       |
| `SENTINEL ckquorum <mymaster>`                 | Kiểm tra đủ quorum (phiếu) để thực hiện failover không.        |
| `SENTINEL failover <mymaster>`                 | Bắt buộc Sentinel khởi động quy trình failover cho `mymaster`. |
| `SENTINEL monitor <name> <ip> <port> <quorum>` | Thêm nhóm master mới vào Sentinel (dynamic).                   |
| `SENTINEL remove <name>`                       | Xóa nhóm master khỏi Sentinel (dynamic).                       |
| `SENTINEL reset <pattern>`                     | Xóa toàn bộ thông tin nhóm master khớp `pattern`.              |
| `SENTINEL flushconfig`                         | Ép Sentinel ghi ngay file config ra đĩa.                       |

---

## B. Các lệnh trên Redis Master

> **Chạy trong container Master**
> `docker exec redis-master redis-cli <LỆNH>`

| Lệnh                       | Mô tả                                                     |
| -------------------------- | --------------------------------------------------------- |
| `INFO replication`         | Xem trạng thái replication (master/slaves, offset, v.v.). |
| `INFO persistence`         | Xem trạng thái AOF/RDB, last save, v.v.                   |
| `CONFIG GET *`             | Lấy toàn bộ hoặc một mục cấu hình.                        |
| `CONFIG SET <key> <value>` | Thay đổi cấu hình runtime (ví dụ `save ""`).              |
| `CLIENT LIST`              | Liệt kê tất cả client đang kết nối.                       |
| `CLIENT KILL <ip:port>`    | Đóng kết nối client cụ thể.                               |
| `MONITOR`                  | Chuyển sang chế độ log mọi lệnh (dùng debug).             |
| `SLOWLOG GET [count]`      | Xem slowlog, các lệnh chậm.                               |

---

## C. Các lệnh trên Redis Replica

> **Chạy trong container Replica**
> `docker exec redis-replica-1 redis-cli <LỆNH>`

| Lệnh                    | Mô tả                                                                        |
| ----------------------- | ---------------------------------------------------------------------------- |
| `INFO replication`      | — `role: slave`<br/>— `master_host`/`master_port`<br/>— `master_link_status` |
| `SLAVEOF <host> <port>` | Thiết lập lại replica của node khác (dynamic).                               |
| `REPLICAOF NO ONE`      | Chuyển replica thành master (promote thủ công).                              |
| `PSYNC` (internals)     | Xem tiến trình partial/full resync giữa master–replica.                      |
| `CLIENT PAUSE <ms>`     | Tạm dừng replica nhận bản ghi từ master (ví dụ khi backup).                  |

---

### Ví dụ kết hợp kiểm tra

```bash
# Sentinel xem nhóm master
docker exec redis-sentinel-1 redis-cli -p 26379 SENTINEL masters

# Replica 1: kiểm tra kết nối
docker exec redis-replica-1 redis-cli INFO replication \
  | grep -E "role:|master_host|master_port|master_link_status"

# Trực tiếp promote replica thành master (không qua Sentinel)
docker exec redis-replica-1 redis-cli REPLICAOF NO ONE
```

---

> **Lưu ý chung**
>
> * Thay `grep`/`findstr` cho phù hợp môi trường Linux/Windows.
> * Khi cấu hình file readonly hoặc chạy trong Docker, đảm bảo bạn mount đúng quyền để Sentinel có thể ghi config nếu cần.

