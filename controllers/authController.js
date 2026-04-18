const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');

const generateToken = (user) => {
  return jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
};

exports.register = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) return res.status(400).json({ message: 'Email already registered' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const [result] = await pool.query('INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)', [name, email, hashedPassword, 'customer']);
    const user = { id: result.insertId, name, email, role: 'customer' };
    const token = generateToken(user);
    res.status(201).json({ token, user });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    // Support login by username 'admin' as well
    let query = 'SELECT * FROM users WHERE email = ?';
    let param = email;
    if (email === 'admin') {
      query = 'SELECT * FROM users WHERE role = ? LIMIT 1';
      param = 'admin';
    }
    const [rows] = await pool.query(query, [param]);
    if (rows.length === 0) return res.status(401).json({ message: 'Invalid email or password' });

    const user = rows[0];
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ message: 'Invalid email or password' });

    const token = generateToken(user);
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.getProfile = async (req, res) => {
  res.json(req.user);
};
