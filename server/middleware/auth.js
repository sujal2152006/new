const jwt = require('jsonwebtoken');
require('dotenv').config();

const SECRET = process.env.JWT_SECRET || 'museumpass_super_secret_key_2026';
const VALID_API_KEY = process.env.API_KEY || 'mp_api_key_2026_secure'; // Define a static API key

// Verify JWT or API Key and attach user to req
function authenticate(req, res, next) {
  // 1. Check for API key first
  const apiKey = req.headers['x-api-key'];
  if (apiKey && apiKey === VALID_API_KEY) {
    // If API key is valid, attach a mock admin user to bypass role checks
    req.user = { id: 0, role: 'admin', name: 'API Client' }; 
    return next();
  }

  // 2. Fall back to JWT authentication
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ ok: false, msg: 'No token or valid x-api-key provided' });
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
