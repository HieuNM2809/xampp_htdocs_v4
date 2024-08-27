Dưới đây là một ví dụ về cách sử dụng Mongoose middleware (pre và post) một cách chi tiết và nâng cao, cùng với giải thích để bạn hiểu rõ cách hoạt động và ứng dụng của chúng.

**Ví dụ: Xây dựng hệ thống kiểm duyệt nội dung tự động**

Giả sử bạn đang xây dựng một ứng dụng blog cho phép người dùng đăng bài viết. Bạn muốn triển khai một hệ thống kiểm duyệt nội dung tự động để lọc các bài viết có chứa từ ngữ nhạy cảm trước khi chúng được công khai.

**1. Định nghĩa Schema và Model**

```javascript
const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
  title: String,
  content: String,
  isApproved: { type: Boolean, default: false }, // Trạng thái kiểm duyệt
  approvedBy: String, // Người kiểm duyệt (nếu có)
});
```

**2. Middleware Pre-save: Kiểm tra nội dung**

```javascript
const badWords = ['từ_nhạy_cảm_1', 'từ_nhạy_cảm_2']; // Danh sách từ nhạy cảm

postSchema.pre('save', function(next) {
  const post = this;

  // Kiểm tra nội dung bài viết
  const hasBadWords = badWords.some(word => post.content.includes(word));

  if (hasBadWords) {
    post.isApproved = false; // Từ chối bài viết
  } else {
    post.isApproved = true; // Chấp nhận bài viết
    post.approvedBy = 'Hệ thống tự động'; 
  }

  next(); 
});
```

**3. Middleware Post-save: Gửi thông báo (nếu cần)**

```javascript
postSchema.post('save', function(doc, next) {
  if (!doc.isApproved) {
    // Gửi thông báo đến quản trị viên hoặc tác giả về việc bài viết bị từ chối
    console.log('Bài viết bị từ chối do chứa nội dung không phù hợp.');
    // Ở đây, bạn có thể tích hợp với hệ thống gửi email hoặc thông báo khác
  }

  next();
});
```

**4. Tạo Model và sử dụng**

```javascript
const Post = mongoose.model('Post', postSchema);

// ... (Phần còn lại của ứng dụng)

const newPost = new Post({
  title: 'Tiêu đề bài viết',
  content: 'Nội dung bài viết có thể chứa hoặc không chứa từ nhạy cảm'
});

newPost.save()
  .then(post => {
    console.log(post); // Bài viết đã được lưu, trạng thái isApproved sẽ được cập nhật
  })
  .catch(err => {
    console.error(err);
  });
```

**Giải thích:**

* **Middleware `pre('save')`:** Thực hiện **trước** khi một document mới được lưu hoặc một document đã tồn tại được cập nhật. Trong ví dụ này, nó kiểm tra nội dung bài viết và tự động cập nhật trạng thái `isApproved`.
* **Middleware `post('save')`:** Thực hiện **sau** khi một document đã được lưu thành công. Trong ví dụ, nó gửi thông báo nếu bài viết bị từ chối.
* **`this` trong middleware:** Tham chiếu đến document đang được xử lý.
* **`next()`:** Hàm callback cần được gọi để tiếp tục quá trình lưu hoặc cập nhật document.

**Các điểm nâng cao:**

* **Sử dụng các middleware khác:** Mongoose cung cấp nhiều loại middleware khác như `pre('validate')`, `post('init')`, `pre('remove')`, ... để bạn có thể can thiệp vào các giai đoạn khác nhau của vòng đời document.
* **Truyền tham số vào middleware:** Bạn có thể truyền thêm tham số vào middleware bằng cách sử dụng `.pre('save', { query: true }, function(next, done) { ... })`.
* **Xử lý lỗi trong middleware:** Sử dụng `next(err)` để truyền lỗi lên phía trên và ngăn chặn quá trình lưu hoặc cập nhật document.
* **Kết hợp nhiều middleware:** Bạn có thể định nghĩa nhiều middleware cho cùng một hook (ví dụ: nhiều `pre('save')`). Chúng sẽ được thực hiện theo thứ tự định nghĩa.

**Lưu ý quan trọng:**

* Middleware có thể làm chậm quá trình xử lý, đặc biệt khi bạn có nhiều middleware phức tạp. Hãy sử dụng chúng một cách hợp lý và tối ưu hóa khi cần thiết.
* Luôn kiểm tra kỹ hoạt động của middleware để đảm bảo chúng không gây ra các tác dụng phụ không mong muốn.

Đây chỉ là một ví dụ minh họa. Bạn có thể tùy chỉnh và mở rộng việc sử dụng middleware để đáp ứng các yêu cầu cụ thể của ứng dụng của bạn.

Nếu bạn muốn tìm hiểu thêm về một khía cạnh cụ thể hoặc có một trường hợp sử dụng khác, hãy cho tôi biết! 
