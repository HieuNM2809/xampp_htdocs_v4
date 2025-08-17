Dưới đây là các ví dụ về cách sử dụng **yield** (generator) trong PHP và Node.js, từ cơ bản đến nâng cao.

---

## PHP

### 1. Cơ bản: Generator đơn giản

```php
<?php
function simpleGenerator() {
    yield 'first';
    yield 'second';
    yield 'third';
}

foreach (simpleGenerator() as $value) {
    echo $value, PHP_EOL;
}
```

**Giải thích**

* Hàm `simpleGenerator()` không trả về mảng mà trả về một *Generator* object.
* Mỗi lần gọi `yield`, generator giữ trạng thái và trả về giá trị.

### 2. Trung cấp: Truyền giá trị vào Generator

```php
<?php
function interactiveGenerator() {
    $received = yield 'start';
    yield "You sent: $received";
}

$gen = interactiveGenerator();
echo $gen->current(), PHP_EOL;         // 'start'
echo $gen->send('hello world'), PHP_EOL; // 'You sent: hello world'
```

**Giải thích**

* Lần đầu `current()` trả về `'start'`.
* `send()` vừa truyền giá trị vào chỗ `yield`, vừa tiếp tục thực thi đến `yield` kế tiếp.

### 3. Nâng cao: Delegation và Generator vô hạn

```php
<?php
function counter($start, $end) {
    for ($i = $start; $i <= $end; $i++) {
        yield $i;
    }
}

function masterGenerator() {
    yield 'Begin';
    // ủy quyền cho counter
    yield from counter(1, 3);
    yield 'End';
}

foreach (masterGenerator() as $val) {
    echo $val, ' ';
}
// Kết quả: Begin 1 2 3 End
```

**Giải thích**

* `yield from` (PHP 7+) cho phép ủy quyền cho một generator con.
* Dễ dàng kết hợp, kết nối nhiều nguồn dữ liệu.

---

## Node.js (JavaScript)

### 1. Cơ bản: Generator function

```js
function* simpleGenerator() {
  yield 'A';
  yield 'B';
  yield 'C';
}

const gen = simpleGenerator();
console.log(gen.next().value); // 'A'
console.log(gen.next().value); // 'B'
console.log(gen.next().value); // 'C'
```

**Giải thích**

* `function*` định nghĩa generator.
* `gen.next()` trả về `{ value, done }`.

### 2. Trung cấp: Truyền dữ liệu vào Generator

```js
function* interactiveGen() {
  const name = yield 'What is your name?';
  yield `Hello, ${name}!`;
}

const ig = interactiveGen();
console.log(ig.next().value);          // 'What is your name?'
console.log(ig.next('Alice').value);   // 'Hello, Alice!'
```

**Giải thích**

* Gọi `next(arg)` sẽ truyền `arg` vào vị trí `yield`.

### 3. Nâng cao: Async Generator và Delegation

#### a) Async Generator

```js
async function* asyncCounter(max) {
  for (let i = 1; i <= max; i++) {
    // mô phỏng chờ I/O
    await new Promise(res => setTimeout(res, 100));
    yield i;
  }
}

(async () => {
  for await (const num of asyncCounter(3)) {
    console.log(num);
  }
})();
```

* Cho phép `await` bên trong và dùng `for await…of` để lặp bất đồng bộ.

#### b) Delegation với `yield*`

```js
function* numbers() {
  yield 1;
  yield 2;
}

function* letters() {
  yield 'A';
  yield* numbers();  // ủy quyền
  yield 'B';
}

for (const x of letters()) {
  console.log(x);
}
// Kết quả: A, 1, 2, B
```

* `yield*` tương tự `yield from` trong PHP, ủy quyền cho generator con.

---

### Kết luận

* **PHP**: Dùng `yield`/`yield from` để tạo generator, hỗ trợ xử lý luồng dữ liệu lớn, ủy quyền giữa các generator.
* **Node.js**: Dùng `function*`/`yield`, và với ES2018 có thêm **async generator** (`async function*`) để xử lý async streams.

Hy vọng các ví dụ trên giúp bạn nắm rõ cách dùng `yield` từ cơ bản đến nâng cao trong cả PHP và Node.js!
