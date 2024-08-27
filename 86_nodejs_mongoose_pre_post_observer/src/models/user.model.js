// models/user.model.js
const mongoose = require('mongoose');
const { preSave, postSave } = require('../middleware/user.middleware');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Pre-save middleware
userSchema.pre('save', preSave);

// Post-save middleware
userSchema.post('save', postSave);

const User = mongoose.model('User', userSchema);

module.exports = User;
