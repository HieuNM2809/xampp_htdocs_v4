require('module-alias/register'); // Kích hoạt module-alias

const userController = require('@controllers/userController');
const db = require('@models/database');
const helper = require('@utils/helper');

userController.handleRequest();
