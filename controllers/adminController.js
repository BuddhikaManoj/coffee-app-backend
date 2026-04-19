const pool = require('../config/db');

// Dashboard stats
exports.getStats = async (req, res) => {
  try {
    const [[{ totalOrders }]] = await pool.query('SELECT COUNT(*) as totalOrders FROM orders');
    const [[{ pendingDeliveries }]] = await pool.query("SELECT COUNT(*) as pendingDeliveries FROM orders WHERE status IN ('pending','accepted','preparing','out_for_delivery')");
    const [[{ totalProducts }]] = await pool.query('SELECT COUNT(*) as totalProducts FROM products');
    const [[{ outOfStockItems }]] = await pool.query('SELECT COUNT(*) as outOfStockItems FROM products WHERE stock = 0');
    const [[{ totalRevenue }]] = await pool.query("SELECT COALESCE(SUM(total), 0) as totalRevenue FROM orders WHERE status != 'cancelled'");
    const [[{ totalUsers }]] = await pool.query('SELECT COUNT(*) as totalUsers FROM users');
    res.json({ totalOrders, pendingDeliveries, totalProducts, outOfStockItems, totalRevenue: Number(totalRevenue), totalUsers });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Orders
exports.getAllOrders = async (req, res) => {
  try {
    let query = 'SELECT o.*, u.name as user_name, u.email as user_email FROM orders o JOIN users u ON o.user_id = u.id';
    const params = [];
    if (req.query.status) { query += ' WHERE o.status = ?'; params.push(req.query.status); }
    query += ' ORDER BY o.created_at DESC';
    const [orders] = await pool.query(query, params);
    for (const order of orders) {
      const [items] = await pool.query('SELECT oi.*, p.name, p.image FROM order_items oi JOIN products p ON oi.product_id = p.id WHERE oi.order_id = ?', [order.id]);
      order.items = items;
      order.user = { id: order.user_id, name: order.user_name, email: order.user_email };
    }
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const valid = ['pending', 'accepted', 'preparing', 'out_for_delivery', 'delivered', 'cancelled'];
    if (!valid.includes(status)) return res.status(400).json({ message: 'Invalid status' });
    const [result] = await pool.query('UPDATE orders SET status = ? WHERE id = ?', [status, req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Order not found' });
    const [order] = await pool.query('SELECT * FROM orders WHERE id = ?', [req.params.id]);
    res.json(order[0]);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Products
exports.getAllProducts = async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM products ORDER BY created_at DESC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.createProduct = async (req, res) => {
  try {
    const { name, description, price, image, category, stock, is_visible } = req.body;
    const [result] = await pool.query('INSERT INTO products (name, description, price, image, category, stock, is_visible) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [name, description, price, image || '', category, stock || 0, is_visible !== false]);
    const [product] = await pool.query('SELECT * FROM products WHERE id = ?', [result.insertId]);
    res.status(201).json(product[0]);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.updateProduct = async (req, res) => {
  try {
    const fields = req.body;
    const keys = Object.keys(fields).filter(k => ['name','description','price','image','category','stock','is_visible'].includes(k));
    if (keys.length === 0) return res.status(400).json({ message: 'No valid fields to update' });
    const sets = keys.map(k => `${k} = ?`).join(', ');
    const values = keys.map(k => fields[k]);
    values.push(req.params.id);
    const [result] = await pool.query(`UPDATE products SET ${sets} WHERE id = ?`, values);
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Product not found' });
    const [product] = await pool.query('SELECT * FROM products WHERE id = ?', [req.params.id]);
    res.json(product[0]);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.deleteProduct = async (req, res) => {
  try {
    const [active] = await pool.query("SELECT COUNT(*) as count FROM order_items oi JOIN orders o ON oi.order_id = o.id WHERE oi.product_id = ? AND o.status NOT IN ('delivered','cancelled')", [req.params.id]);
    if (active[0].count > 0) return res.status(400).json({ message: 'Cannot delete product with active orders' });
    const [result] = await pool.query('DELETE FROM products WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Product not found' });
    res.json({ message: 'Product deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.toggleVisibility = async (req, res) => {
  try {
    const { is_visible } = req.body;
    await pool.query('UPDATE products SET is_visible = ? WHERE id = ?', [is_visible, req.params.id]);
    const [product] = await pool.query('SELECT * FROM products WHERE id = ?', [req.params.id]);
    if (product.length === 0) return res.status(404).json({ message: 'Product not found' });
    res.json(product[0]);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.updateStock = async (req, res) => {
  try {
    const { stock } = req.body;
    await pool.query('UPDATE products SET stock = ? WHERE id = ?', [stock, req.params.id]);
    const [product] = await pool.query('SELECT * FROM products WHERE id = ?', [req.params.id]);
    if (product.length === 0) return res.status(404).json({ message: 'Product not found' });
    res.json(product[0]);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Users
exports.getAllUsers = async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT id, name, email, role, created_at FROM users ORDER BY created_at DESC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.updateUserRole = async (req, res) => {
  try {
    const { role } = req.body;
    if (!['admin', 'customer'].includes(role)) return res.status(400).json({ message: 'Invalid role' });
    await pool.query('UPDATE users SET role = ? WHERE id = ?', [role, req.params.id]);
    const [user] = await pool.query('SELECT id, name, email, role FROM users WHERE id = ?', [req.params.id]);
    if (user.length === 0) return res.status(404).json({ message: 'User not found' });
    res.json(user[0]);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    if (req.user.id === parseInt(req.params.id)) return res.status(400).json({ message: 'Cannot delete yourself' });
    const [result] = await pool.query('DELETE FROM users WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ message: 'User not found' });
    res.json({ message: 'User deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};
