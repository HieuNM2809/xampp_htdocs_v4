require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const app = express();

const PORT = process.env.PORT || 4000;
const SECRET = process.env.JWT_SECRET || 'supersecret';

// Đăng ký client
const clients = {
    client1: {
        redirectUris: ['http://localhost:3000/callback']
    }
};

// Đăng ký user (đơn giản in‐memory)
const users = {
    user1: {password: 'pass1', id: 'user1', name: 'Nguyễn Văn A', email: 'a@example.com'}
};

app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());

/**
 * 1) Authorization endpoint (Implicit Grant)
 *    GET /authorize?response_type=token&client_id=...&redirect_uri=...
 *    → Hiện form login
 */
app.get('/authorize', (req, res) => {
    const {response_type, client_id, redirect_uri, state} = req.query;


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
      <input type="hidden" name="state"           value="${state || ''}" />
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
    const {
        username, password,
        response_type, client_id, redirect_uri, state
    } = req.body;
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
        sub: user.id,
        name: user.name,
        email: user.email,
        aud: client_id
    };
    const token = jwt.sign(payload, SECRET, {expiresIn: '1h'});
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
    if (!token) return res.status(401).json({error: 'Access token missing'});

    jwt.verify(token, SECRET, (err, decoded) => {
        if (err) return res.status(401).json({error: 'Invalid token'});
        // Trả user info
        return res.json({
            id: decoded.sub,
            name: decoded.name,
            email: decoded.email
        });
    });
});

app.listen(PORT, () => {
    console.log(`Auth-Server (Facebook) chạy trên http://0.0.0.0:${PORT}`);
});
