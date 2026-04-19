const pool = require('../config/db');

exports.create = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const { name, address, phone, items, total } = req.body;

    // Check stock
    for (const item of items) {
      const [product] = await conn.query('SELECT stock, name FROM products WHERE id = ?', [item.product_id]);
      if (product.length === 0) { await conn.rollback(); return res.status(400).json({ message: `Product not found` }); }
      if (product[0].stock < item.quantity) { await conn.rollback(); return res.status(400).json({ message: `Insufficient stock for ${product[0].name}` }); }
    }

    const [orderResult] = await conn.query('INSERT INTO orders (user_id, name, address, phone, total) VALUES (?, ?, ?, ?, ?)', [req.user.id, name, address, phone, total]);
    const orderId = orderResult.insertId;

    for (const item of items) {
      await conn.query('INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)', [orderId, item.product_id, item.quantity, item.price]);
      await conn.query('UPDATE products SET stock = stock - ? WHERE id = ?', [item.quantity, item.product_id]);
    }

    await conn.commit();
    const [order] = await pool.query('SELECT * FROM orders WHERE id = ?', [orderId]);
    res.status(201).json(order[0]);
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ message: 'Server error', error: err.message });
  } finally {
    conn.release();
  }
};

exports.getMyOrders = async (req, res) => {
  try {
    const [orders] = await pool.query('SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC', [req.user.id]);
    for (const order of orders) {
      const [items] = await pool.query('SELECT oi.*, p.name, p.image FROM order_items oi JOIN products p ON oi.product_id = p.id WHERE oi.order_id = ?', [order.id]);
      order.items = items;
    }
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.getById = async (req, res) => {
  try {
    const [orders] = await pool.query('SELECT * FROM orders WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    if (orders.length === 0) return res.status(404).json({ message: 'Order not found' });
    const [items] = await pool.query('SELECT oi.*, p.name, p.image FROM order_items oi JOIN products p ON oi.product_id = p.id WHERE oi.order_id = ?', [orders[0].id]);
    orders[0].items = items;
    res.json(orders[0]);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};
