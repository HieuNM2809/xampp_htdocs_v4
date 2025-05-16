Dưới đây là một ví dụ hoàn chỉnh, mô phỏng “Facebook” (Auth-Server + Resource-Server) do bạn tự quản lý, và một “App-Server” làm client theo **Implicit Grant**. Toàn bộ chạy trong Docker Compose.

---

## 1. Cấu trúc thư mục

```
oauth-simulated-facebook/
├── auth-server/           # “Facebook” do bạn quản lý
│   ├── Dockerfile
│   ├── package.json
│   └── server.js
├── app-server/            # Ứng dụng của bạn (App)
│   ├── Dockerfile
│   ├── package.json
│   ├── server.js
│   └── public/
│       └── index.html
└── docker-compose.yml
```

---

## 2. “Facebook” Server (Auth-Server + Resource-Server)

### 2.1 `auth-server/package.json`

```json
{
  "name": "auth-server",
  "version": "1.0.0",
  "main": "server.js",
  "dependencies": {
    "express": "^4.18.2",
    "body-parser": "^1.20.1",
    "dotenv": "^16.0.3",
    "jsonwebtoken": "^9.0.0"
  }
}
```

### 2.2 `auth-server/server.js`

```js
require('dotenv').config();
const express    = require('express');
const bodyParser = require('body-parser');
const jwt        = require('jsonwebtoken');
const app        = express();

const PORT   = process.env.PORT || 4000;
const SECRET = process.env.JWT_SECRET || 'supersecret';

// Đăng ký client
const clients = {
  client1: {
    redirectUris: ['http://localhost:3000/callback']
  }
};

// Đăng ký user (đơn giản in‐memory)
const users = {
  user1: { password: 'pass1', id: 'user1', name: 'Nguyễn Văn A', email: 'a@example.com' }
};

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

/**
 * 1) Authorization endpoint (Implicit Grant)
 *    GET /authorize?response_type=token&client_id=...&redirect_uri=...
 *    → Hiện form login
 */
app.get('/authorize', (req, res) => {
  const { response_type, client_id, redirect_uri, state } = req.query;
  // Validate cơ bản
  if (response_type !== 'token'
    || !clients[client_id]
    || !clients[client_id].redirectUris.includes(redirect_uri)) {
    return res.status(400).send('Invalid authorize request');
  }

  // Hiện form login
  return res.send(`
    <h1>Login vào “Facebook”</h1>
    <form method="post" action="/authorize">
      <input type="hidden" name="response_type" value="${response_type}" />
      <input type="hidden" name="client_id"       value="${client_id}" />
      <input type="hidden" name="redirect_uri"    value="${redirect_uri}" />
      <input type="hidden" name="state"           value="${state||''}" />
      <div>
        <label>Username: <input name="username"/></label>
      </div>
      <div>
        <label>Password: <input type="password" name="password"/></label>
      </div>
      <button type="submit">Login</button>
    </form>
  `);
});

/**
 * 2) Xử lý login, cấp access token
 *    POST /authorize
 *    → Redirect về client với fragment #access_token=...
 */
app.post('/authorize', (req, res) => {
  const { username, password,
          response_type, client_id, redirect_uri, state } = req.body;
  // Validate lại
  if (response_type !== 'token'
    || !clients[client_id]
    || !clients[client_id].redirectUris.includes(redirect_uri)) {
    return res.status(400).send('Invalid authorize request');
  }
  const user = users[username];
  if (!user || user.password !== password) {
    return res.status(401).send('Sai username hoặc password');
  }
  // Tạo JWT access token
  const payload = {
    sub:   user.id,
    name:  user.name,
    email: user.email,
    aud:   client_id
  };
  const token = jwt.sign(payload, SECRET, { expiresIn: '1h' });
  // Chuyển về client
  const frag = [
    `access_token=${token}`,
    `token_type=Bearer`,
    `expires_in=3600`,
    state && `state=${encodeURIComponent(state)}`
  ].filter(Boolean).join('&');
  return res.redirect(`${redirect_uri}#${frag}`);
});

/**
 * 3) Resource endpoint: GET /me?access_token=...
 *    → Trả về thông tin user
 */
app.get('/me', (req, res) => {
  const token = req.query.access_token;
  if (!token) return res.status(401).json({ error: 'Access token missing' });

  jwt.verify(token, SECRET, (err, decoded) => {
    if (err) return res.status(401).json({ error: 'Invalid token' });
    // Trả user info
    return res.json({
      id:    decoded.sub,
      name:  decoded.name,
      email: decoded.email
    });
  });
});

app.listen(PORT, () => {
  console.log(`Auth-Server (Facebook) chạy trên http://0.0.0.0:${PORT}`);
});
```

### 2.3 `auth-server/Dockerfile`

```dockerfile
FROM node:18-alpine
WORKDIR /usr/src/app
COPY package.json ./
RUN npm install --production
COPY . .
EXPOSE 4000
CMD ["node", "server.js"]
```

---

## 3. App Server (Client)

### 3.1 `app-server/package.json`

```json
{
  "name": "app-server",
  "version": "1.0.0",
  "main": "server.js",
  "dependencies": {
    "express": "^4.18.2",
    "request": "^2.88.2"
  }
}
```

### 3.2 `app-server/server.js`

```js
const express = require('express');
const request = require('request');
const path    = require('path');
const app     = express();

const AUTH_SERVER = process.env.AUTH_SERVER_URL || 'http://auth-server:4000';
const PORT        = process.env.PORT || 3000;

// Serve static front‐end
app.use(express.static(path.join(__dirname, 'public')));

/**
 * proxy /me → gọi auth-server /me
 */
app.get('/me', (req, res) => {
  const token = req.query.access_token;
  if (!token) return res.status(400).json({ error: 'access_token required' });

  request.get({
    url:  `${AUTH_SERVER}/me`,
    qs:   { access_token: token },
    json: true
  }, (err, _, body) => {
    if (err)   return res.status(500).json(err);
    if (body.error) return res.status(400).json(body);
    res.json(body);
  });
});

/**
 * proxy /ajax_data → gọi lại auth-server /me
 */
app.get('/ajax_data', (req, res) => {
  const token = req.query.access_token;
  if (!token) return res.status(400).json({ error: 'access_token required' });

  request.get({
    url:  `${AUTH_SERVER}/me`,
    qs:   { access_token: token },
    json: true
  }, (err, _, body) => {
    if (err)   return res.status(500).json(err);
    if (body.error) return res.status(400).json(body);
    res.json({ from: 'ajax_data', user: body });
  });
});

app.listen(PORT, () => {
  console.log(`App-Server chạy trên http://0.0.0.0:${PORT}`);
});
```

### 3.3 `app-server/public/index.html`

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>OAuth2 Implicit Demo — App</title>
</head>
<body>
  <h1>Demo OAuth2 Implicit Grant</h1>
  <button id="loginBtn">Login (Implicit)</button>
  <pre id="profile"></pre>
  <button id="ajaxBtn" style="display:none">Load Ajax Data</button>
  <pre id="ajaxData"></pre>

  <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
  <script>
    const clientId    = 'client1';
    const redirectUri = window.location.origin + '/callback';
    const authServer  = 'http://localhost:4000';

    // 1) Click → redirect tới Auth-Server /authorize
    $('#loginBtn').click(() => {
      const url = `${authServer}/authorize` +
                  `?response_type=token` +
                  `&client_id=${clientId}` +
                  `&redirect_uri=${encodeURIComponent(redirectUri)}`;
      window.location = url;
    });

    // 2) Khi Facebook (Auth-Server) redirect về /callback#access_token=…
    if (window.location.pathname === '/callback' && window.location.hash) {
      const params = new URLSearchParams(window.location.hash.slice(1));
      const token  = params.get('access_token');
      if (!token) return;

      // 3) Gọi App-Server → /me?access_token=…
      $.get('/me', { access_token: token })
       .done(data => {
         $('#profile').text(JSON.stringify(data, null, 2));
         $('#ajaxBtn').show().data('token', token);
       })
       .fail(err => {
         $('#profile').text('Error: ' + JSON.stringify(err));
       });
    }

    // 4) Khi click nút Ajax → gọi /ajax_data
    $('#ajaxBtn').click(function(){
      const token = $(this).data('token');
      $.get('/ajax_data', { access_token: token })
       .done(data => $('#ajaxData').text(JSON.stringify(data, null, 2)));
    });
  </script>
</body>
</html>
```

### 3.4 `app-server/Dockerfile`

```dockerfile
FROM node:18-alpine
WORKDIR /usr/src/app
COPY package.json ./
RUN npm install --production
COPY . .
EXPOSE 3000
CMD ["node", "server.js"]
```

---

## 4. Docker Compose

Tạo `docker-compose.yml` ở gốc project:

```yaml
version: '3.8'

services:
  auth-server:
    build: ./auth-server
    ports:
      - "4000:4000"
    environment:
      - JWT_SECRET=supersecret

  app-server:
    build: ./app-server
    ports:
      - "3000:3000"
    depends_on:
      - auth-server
```

---

## 5. Chạy thử

```bash
# Ở thư mục gốc:
docker-compose up --build
```

* Mở trình duyệt vào `http://localhost:3000`
* Click **Login (Implicit)** → bạn sẽ được chuyển đến “Facebook” (Auth-Server).
* Nhập user/pass (ví dụ user1 / pass1).
* Sau khi login xong, Auth-Server sẽ 302-redirect về `http://localhost:3000/callback#access_token=…`
* Front-end JS tự parse `access_token`, gọi `/me` và hiển thị thông tin user.
* Bạn có thể click **Load Ajax Data** để gọi thêm một lần `/ajax_data` như flow mẫu.

---

### Flow tương ứng hình vẽ

1. **Browser → GET /** (App frontpage)
2. **Browser → GET Auth-Server `/authorize`** (OAuth dialog)
3. **Auth-Server → 302 Redirect về** `/callback#access_token=…`
4. **Browser (JS) → GET App-Server `/me?access_token=…`**
5. **App-Server → GET Auth-Server `/me?access_token=…`** → JSON user
6. **App-Server → JSON user → Browser** (display)
7. **Browser → GET `/ajax_data?access_token=…`** (ví dụ gọi lại)
8. **App-Server → GET Auth-Server `/me?access_token=…`** → JSON user
9. **App-Server → JSON user → Browser** (display tiếp)

Vậy là bạn đã có nguyên một OAuth2 Implicit flow mà “Facebook” do bạn tự quản, chạy gọn trên Docker Compose!
