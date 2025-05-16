const express = require('express');
const request = require('request');
const path = require('path');
const app = express();

const AUTH_SERVER = process.env.AUTH_SERVER_URL || 'http://auth-server:4000';
const PORT = process.env.PORT || 3000;

// Serve static front‐end
app.use(express.static(path.join(__dirname, 'public')));

/**
 * proxy /me → gọi auth-server /me
 */
app.get('/me', (req, res) => {
    const token = req.query.access_token;
    if (!token) return res.status(400).json({error: 'access_token required'});

    request.get({
        url: `${AUTH_SERVER}/me`,
        qs: {access_token: token},
        json: true
    }, (err, _, body) => {
        if (err) return res.status(500).json(err);
        if (body.error) return res.status(400).json(body);
        res.json(body);
    });
});

/**
 * proxy /ajax_data → gọi lại auth-server /me
 */
app.get('/ajax_data', (req, res) => {
    const token = req.query.access_token;
    if (!token) return res.status(400).json({error: 'access_token required'});

    request.get({
        url: `${AUTH_SERVER}/me`,
        qs: {access_token: token},
        json: true
    }, (err, _, body) => {
        if (err) return res.status(500).json(err);
        if (body.error) return res.status(400).json(body);
        res.json({from: 'ajax_data', user: body});
    });
});

app.listen(PORT, () => {
    console.log(`App-Server chạy trên http://0.0.0.0:${PORT}`);
});
