// Express 4 doesn't catch rejected promises from async route handlers --
// left alone, a thrown error (bad ObjectId, corrupt uploaded file, etc.)
// becomes an unhandled rejection and crashes the whole process. Wrap every
// async handler with this so errors reach the generic error middleware in
// server.js instead.
function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

module.exports = asyncHandler;
