const jwt = require('jsonwebtoken');
require('dotenv').config();

const SECRET = process.env.JWT_SECRET || 'museumpass_secret';

// Verify JWT and attach user to req
function authenticate(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ ok: false, msg: 'No token provided' });
  }
  try {
    const decoded = jwt.verify(auth.slice(7), SECRET);
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ ok: false, msg: 'Invalid or expired token' });
  }
}

// Restrict to specific roles
function authorize(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user?.role)) {
      return res.status(403).json({ ok: false, msg: 'Access denied' });
    }
    next();
  };
}

module.exports = { authenticate, authorize };
