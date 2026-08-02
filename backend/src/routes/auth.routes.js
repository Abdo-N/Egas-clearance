const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const router = express.Router();

/**
 * MOCK AD LOGIN.
 * This is the ONLY file that should know the login check is against our
 * mock User collection instead of real Active Directory. When real LDAP
 * access is available, replace the body of this handler with an LDAP bind
 * call and leave everything downstream (JWT issuing, requireAuth, roles)
 * untouched.
 */
router.post("/login", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: "username and password are required" });
  }

  const user = await User.findOne({ username: username.trim() });
  if (!user) return res.status(401).json({ error: "Invalid username or password" });

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: "Invalid username or password" });

  const payload = {
    username: user.username,
    fullName: user.fullName,
    role: user.role,
    departmentKey: user.departmentKey,
    employeeMeta: user.employeeMeta,
  };

  const token = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "8h",
  });

  res.json({ token, user: payload });
});

module.exports = router;
