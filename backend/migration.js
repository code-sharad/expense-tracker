const mongoose = require("mongoose");
const crypto = require("crypto");

const User = require("./model/user.schema");
require('dotenv').config()

const DB_URL = process.env.MONGO_URL;



async function connectDB() {
  try {
    await mongoose.connect(DB_URL);
    console.log("MongoDB connected");
  } catch (err) {
    console.error("MongoDB connection error:", err);
    process.exit(1);
  }
}

async function createAdminUser() {
  try {
    // Check if admin user already exists
    const existingAdmin = await User.findOne({ email: "admin@gmail.com" });

    if (existingAdmin) {
      console.log("Admin user already exists");
      return;
    }

    const admin = new User({
      email: "admin@gmail.com",
      password: "admin123", // Hash the password
      role: "ADMIN",
    });

    await admin.save();
    console.log("Admin user created successfully");
  } catch (err) {
    console.error("Error creating admin user:", err);
  }
}

async function runMigration() {
  await connectDB();
  await createAdminUser();

  // Close the database connection
  await mongoose.connection.close();
  console.log("Migration completed");
  process.exit(0);
}

runMigration();
