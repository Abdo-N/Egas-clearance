const jwt = require("jsonwebtoken");

function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Missing token" });

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload; // { userID, fullName, role, departmentKey, assignedItemKey, hasOversightDashboard }
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: "Forbidden for this role" });
    }
    next();
  };
}

// Reviewer must be signing on behalf of their OWN department -- used by
// every sign/archive route in request.routes.js so this check lives in one
// place instead of being repeated inline.
function requireOwnDepartment(req, res, next) {
  if (req.user.role !== "reviewer" || req.user.departmentKey !== req.params.deptKey) {
    return res.status(403).json({ error: "You can only act on behalf of your own department" });
  }
  next();
}

module.exports = { requireAuth, requireRole, requireOwnDepartment };
