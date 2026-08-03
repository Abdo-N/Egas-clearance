const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

// The local network's DNS resolver was dropping the TXT/SRV lookups that
// mongodb+srv:// needs (queryTxt ETIMEOUT), even though ordinary A record
// lookups worked fine. Pointing Node's resolver at public DNS avoids that.
require("dns").setServers(["8.8.8.8", "1.1.1.1"]);

const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");
const authRoutes = require("./routes/auth.routes");
const departmentRoutes = require("./routes/department.routes");
const employeeRoutes = require("./routes/employee.routes");
const requestRoutes = require("./routes/request.routes");

const app = express();
app.use(cors());
app.use(express.json());

app.get("/api/health", (req, res) => res.json({ ok: true }));
app.use("/api/auth", authRoutes);
app.use("/api/departments", departmentRoutes);
app.use("/api/employees", employeeRoutes);
app.use("/api/requests", requestRoutes);

// Basic error handler so unexpected throws return JSON instead of crashing silently.
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

const PORT = process.env.PORT || 4000;

connectDB()
  .then(() => {
    app.listen(PORT, () => console.log(`[server] listening on :${PORT}`));
  })
  .catch((err) => {
    console.error("[db] connection failed", err);
    process.exit(1);
  });
