// middleware/user.middleware.js
const bcrypt = require("bcrypt");

// Pre-save middleware: Hash password before saving
const preSave = async function (next) {
  try {
    if (!this.isModified("password")) return next();

    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
};

// Post-save middleware: Log user details after saving
const postSave = function (doc, next) {
  console.log("New user was created and saved:", doc);
  next();
};

module.exports = {
  preSave,
  postSave,
};
