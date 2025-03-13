Dưới đây là hướng dẫn đầy đủ sử dụng laravel-fractal với cả dữ liệu dựa trên model (Eloquent) và dữ liệu dạng mảng (non-model), kèm theo giải thích chi tiết các tùy chọn và option mở rộng như truyền biến bổ sung, meta data, include relationship,...

---

## 1. Sử dụng với Model (Eloquent)

### Bước 1: Cài đặt Package

Cài đặt package qua Composer:

```bash
composer require spatie/laravel-fractal
```

### Bước 2: Tạo Transformer cho Model

Tạo file `UserTransformer.php` trong thư mục `app/Transformers`:

```php
<?php

namespace App\Transformers;

use App\Models\User;
use League\Fractal\TransformerAbstract;

class UserTransformer extends TransformerAbstract
{
    protected $extraData;

    // Cho phép truyền các biến bổ sung thông qua constructor
    public function __construct($extraData = [])
    {
        $this->extraData = $extraData;
    }

    // Định nghĩa các include (mối quan hệ) nếu cần
    // Ví dụ, nếu User có quan hệ posts:
    // protected $defaultIncludes = ['posts'];
    // public function includePosts(User $user)
    // {
    //     $posts = $user->posts;
    //     return $this->collection($posts, new PostTransformer());
    // }

    public function transform(User $user)
    {
        return [
            'id'    => (int) $user->id,
            'name'  => $user->name,
            'email' => $user->email,
            // Sử dụng biến bổ sung (ví dụ role) nếu có được truyền vào
            'role'  => $this->extraData['role'] ?? null,
        ];
    }
}
```

> **Giải thích:**  
> - **Constructor và biến bổ sung:** Bạn có thể truyền các dữ liệu bổ sung (như role, permissions, …) vào transformer để sử dụng trong quá trình chuyển đổi.  
> - **Include relationship:** Nếu muốn include các mối quan hệ (ví dụ như posts, comments) bạn có thể khai báo trong `$defaultIncludes` hoặc `$availableIncludes` và định nghĩa phương thức tương ứng (ví dụ: `includePosts()`).  

### Bước 3: Sử dụng Transformer trong Controller

Trong controller, bạn gọi transformer và truyền thêm các biến bổ sung:

```php
<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Transformers\UserTransformer;

class UserController extends Controller
{
    public function index()
    {
        $users = User::all();
        
        // Khai báo các biến bổ sung để truyền vào transformer
        $extraData = [
            'role' => 'admin',
        ];

        return fractal()
            ->collection($users)
            ->transformWith(new UserTransformer($extraData))
            // Thêm meta data vào kết quả trả về, ví dụ: tổng số bản ghi
            ->addMeta(['total' => $users->count()])
            ->toArray();
    }
}
```

> **Giải thích các option ở đây:**  
> - **`collection($users)`:** Xác định rằng dữ liệu đầu vào là một tập hợp (collection) các user. Nếu là một item đơn, bạn sẽ dùng `item($user)` thay vì `collection()`.  
> - **`transformWith(new UserTransformer($extraData))`:** Áp dụng transformer đã tạo, kèm theo biến bổ sung nếu cần.  
> - **`addMeta(['total' => $users->count()])`:** Thêm phần meta data vào output. Đây là thông tin không nằm trong phần dữ liệu chính mà cung cấp thêm ngữ cảnh như tổng số bản ghi, thông tin phân trang, …  
> - **`toArray()`:** Chuyển kết quả thành mảng, sẵn sàng trả về dưới dạng JSON.

---

## 2. Sử dụng với Dữ liệu Dạng Mảng (Non-Model)

### Bước 1: Tạo Transformer cho Dữ liệu Mảng

Tạo file `UserArrayTransformer.php` trong thư mục `app/Transformers`:

```php
<?php

namespace App\Transformers;

use League\Fractal\TransformerAbstract;

class UserArrayTransformer extends TransformerAbstract
{
    protected $extraData;

    // Nhận các biến bổ sung qua constructor
    public function __construct($extraData = [])
    {
        $this->extraData = $extraData;
    }

    // Phương thức transform nhận vào một mảng đại diện cho user
    public function transform(array $user)
    {
        return [
            'id'    => (int) $user['id'],
            'name'  => $user['name'],
            'email' => $user['email'],
            // Sử dụng biến bổ sung, ví dụ: thêm thông tin role nếu có
            'role'  => $this->extraData['role'] ?? null,
        ];
    }
}
```

### Bước 2: Sử dụng Transformer trong Controller

Trong controller, truyền dữ liệu dạng mảng và biến bổ sung vào transformer:

```php
<?php

namespace App\Http\Controllers;

use App\Transformers\UserArrayTransformer;

class UserController extends Controller
{
    public function index()
    {
        // Dữ liệu dạng mảng không dựa trên model Eloquent
        $users = [
            [
                'id'    => 1,
                'name'  => 'John Doe',
                'email' => 'john@example.com'
            ],
            [
                'id'    => 2,
                'name'  => 'Jane Doe',
                'email' => 'jane@example.com'
            ]
        ];

        // Các biến bổ sung cần truyền vào transformer
        $extraData = [
            'role' => 'admin',
        ];

        return fractal()
            ->collection($users)
            ->transformWith(new UserArrayTransformer($extraData))
            // Thêm meta data, ví dụ: tổng số bản ghi của mảng
            ->addMeta(['total' => count($users)])
            ->toArray();
    }
}
```

> **Giải thích:**  
> - **Dữ liệu dạng mảng:** Khi không sử dụng model, bạn truyền trực tiếp dữ liệu dạng mảng.  
> - Các bước tương tự như với model: sử dụng `collection()`, `transformWith()` và thêm meta data nếu cần.

---

## 3. Các Tùy Chọn Nâng Cao

Ngoài những thao tác cơ bản, laravel-fractal hỗ trợ nhiều option giúp bạn tùy biến output API một cách linh hoạt:

### 3.1. Meta Data (`->addMeta()`)

- **Mục đích:** Thêm các thông tin bổ sung ngoài dữ liệu chính, chẳng hạn như tổng số bản ghi, thông tin phân trang, thời gian xử lý, …  
- **Ví dụ:**  
  ```php
  ->addMeta(['total' => $users->count(), 'timestamp' => now()])
  ```
- **Giải thích:** Dữ liệu meta sẽ được gộp vào output cùng với phần `data` chính, giúp client dễ dàng tiếp nhận các thông tin cần thiết cho xử lý hiển thị hoặc phân trang.

### 3.2. Include Relationships

- **Mục đích:** Cho phép bao gồm các mối quan hệ liên quan (ví dụ: posts, comments) vào kết quả trả về.  
- **Cách sử dụng:**  
  - Trong transformer, khai báo các relationship thông qua thuộc tính `$defaultIncludes` (các include luôn được kèm theo) hoặc `$availableIncludes` (cho phép client lựa chọn).  
  - Định nghĩa phương thức include, ví dụ:
    ```php
    protected $availableIncludes = ['posts'];

    public function includePosts(User $user)
    {
        $posts = $user->posts;
        return $this->collection($posts, new PostTransformer());
    }
    ```
- **Giải thích:** Nếu client muốn include dữ liệu quan hệ, họ có thể truyền tham số `?include=posts` trong URL (nếu bạn đã cấu hình serializer hỗ trợ). Điều này giúp API trở nên linh hoạt, chỉ trả về dữ liệu mở rộng khi cần thiết.

### 3.3. Pagination

- **Mục đích:** Hỗ trợ phân trang cho các tập hợp dữ liệu lớn.  
- **Cách sử dụng:**  
  Khi sử dụng Eloquent hoặc Collection đã được phân trang, bạn có thể truyền đối tượng paginator vào fractal:
  ```php
  $users = User::paginate(10);
  return fractal()
      ->collection($users)
      ->transformWith(new UserTransformer($extraData))
      ->paginateWith(new \Spatie\Fractalistic\ArraySerializer())
      ->toArray();
  ```
- **Giải thích:** Tích hợp phân trang giúp API trả về thông tin liên quan như trang hiện tại, tổng số trang, … mà không cần viết thêm mã xử lý.

### 3.4. Custom Serializer

- **Mục đích:** Cho phép thay đổi cách dữ liệu được đóng gói, ví dụ: có thể bỏ bọc dữ liệu trong key `data` hoặc thay đổi cấu trúc output theo nhu cầu.  
- **Cách sử dụng:**  
  Bạn có thể cấu hình serializer mặc định trong file cấu hình của package hoặc chỉ định serializer cụ thể cho mỗi request:
  ```php
  return fractal()
      ->collection($users)
      ->transformWith(new UserTransformer($extraData))
      ->serializeWith(new \Spatie\Fractalistic\ArraySerializer())
      ->toArray();
  ```
- **Giải thích:** Serializer xác định cách dữ liệu cuối cùng sẽ được trình bày, giúp dễ dàng tích hợp với các chuẩn API khác nhau.

---

## Tổng Kết

Với các ví dụ trên, bạn có thể tích hợp laravel-fractal một cách linh hoạt cho cả dữ liệu dựa trên model và dữ liệu dạng mảng. Bạn cũng có thể mở rộng khả năng của transformer thông qua:

- **Truyền biến bổ sung:** Giúp cá nhân hóa dữ liệu đầu ra theo từng trường hợp cụ thể.
- **Meta Data (`addMeta()`):** Cung cấp thông tin bổ sung không nằm trong dữ liệu chính.
- **Include Relationships:** Tự động include các mối quan hệ nếu cần thiết.
- **Pagination và Custom Serializer:** Tùy biến cấu trúc trả về và tích hợp phân trang.

Những tùy chọn này giúp API của bạn trở nên linh hoạt, dễ mở rộng và phù hợp với nhiều yêu cầu khác nhau từ phía client.