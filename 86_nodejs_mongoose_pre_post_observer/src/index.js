// index.js
const mongoose = require("mongoose");
const connectDB = require("./config/database");
const User = require("./models/user.model");
const { v4: uuidv4 } = require("uuid");

connectDB();

const createUser = async () => {
  try {
    const randomEmail = `user-${uuidv4()}@example.com`;
    const user = new User({
      name: "John Doe",
      email: randomEmail,
      password: "123456",
    });

    await user.save();
    console.log("User created successfully");
  } catch (error) {
    console.error("Error creating user:", error);
  } finally {
    mongoose.connection.close();
  }
};

createUser();
