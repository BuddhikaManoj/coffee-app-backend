const express = require('express');
const { authenticate, requireAdmin } = require('../middleware/auth');
const adminController = require('../controllers/adminController');
const router = express.Router();

router.use(authenticate, requireAdmin);
router.get('/', adminController.getAllUsers);
router.get('/:id', async (req, res) => {
  const pool = require('../config/db');
  const [rows] = await pool.query('SELECT id, name, email, role FROM users WHERE id = ?', [req.params.id]);
  if (rows.length === 0) return res.status(404).json({ message: 'User not found' });
  res.json(rows[0]);
});
router.patch('/:id/role', adminController.updateUserRole);
router.delete('/:id', adminController.deleteUser);

module.exports = router;
