const db = require('@models/database');
const helper = require('@utils/helper');

module.exports = {
    handleRequest: function() {
        console.log("Handling user request...");
        const user = db.getUser();
        const message = helper.formatMessage(`User: ${user.name}`);
        console.log(message);
    }
};
