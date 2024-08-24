// app.js
require('./globalConfig');

console.log(global.config.appName); // Output: MyApp
console.log(global.config.version); // Output: 1.0.0
console.log(global.sayHello('Hieu')); // Output: 1.0.0
