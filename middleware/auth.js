const jwt = require('jsonwebtoken');
const pool = require('../config/db');

const authenticate = async (req, res, next) => {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    const token = header.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const [rows] = await pool.query('SELECT id, name, email, role FROM users WHERE id = ?', [decoded.id]);
    if (rows.length === 0) return res.status(401).json({ message: 'User not found' });
    req.user = rows[0];
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};

const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
};

module.exports = { authenticate, requireAdmin };
