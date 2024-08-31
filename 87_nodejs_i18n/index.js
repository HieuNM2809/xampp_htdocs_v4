const express = require('express');
const i18next = require('i18next');
const middleware = require('i18next-http-middleware');
const Backend = require('i18next-fs-backend');

i18next.use(Backend).use(middleware.LanguageDetector).init({
    fallbackLng: 'en',
    preload: ['en', 'vi'],
    backend: {
        loadPath: './locales/{{lng}}/translation.json',
    },
});

const app = express();

app.use(middleware.handle(i18next, {
    // lookupCookie: 'lang',
    // order: ['cookie', 'querystring', 'header']
}));

app.get('/', (req, res) => {
    res.send(req.t('welcome'));
});

app.get('/greet', (req, res) => {
    const name = req.query.name || 'Guest';
    res.send(req.t('greeting', {name}));
});
app.get('/date', (req, res) => {
    res.send(req.t('date', {date: new Date()}));
});
app.get('/items', (req, res) => {
  const count = req.query.count || 0;
  res.send(req.t('item', { count }));
});



app.listen(3000, () => {
    console.log('Server is running on port 3000');
});
