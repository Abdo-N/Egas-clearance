const mongoose = require("mongoose");

async function connectDB() {
  const uri = process.env.MONGO_URI || "mongodb://localhost:27017/egas_clearance";
  await mongoose.connect(uri);
  console.log(`[db] connected -> ${uri}`);
}

module.exports = connectDB;
