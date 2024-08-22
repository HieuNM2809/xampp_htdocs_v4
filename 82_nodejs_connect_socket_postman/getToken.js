const jwt = require('jsonwebtoken');

const token = jwt.sign({ username: 'user2' }, 'your_secret_key');
console.log(token);
//eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6InVzZXIxIiwiaWF0IjoxNzI0MzM1NjcwfQ.PbOtGt4iTykGfh5_FKXF7HzWVfaMvcXazfVCD3nlTck