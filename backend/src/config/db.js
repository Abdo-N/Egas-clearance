const mongoose = require("mongoose");

async function connectDB() {
  const uri = process.env.MONGO_URI || "mongodb://localhost:27017/egas_clearance";
  await mongoose.connect(uri);
  // Keep the useful target information without leaking credentials or URI
  // options into terminal logs and CI output.
  const safeTarget = uri
    .replace(/\/\/[^@/]+@/, "//***@")
    .replace(/\?.*$/, "");
  console.log(`[db] connected -> ${safeTarget}`);
}

module.exports = connectDB;
