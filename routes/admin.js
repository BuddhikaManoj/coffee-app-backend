const express = require('express');
const { authenticate, requireAdmin } = require('../middleware/auth');
const adminController = require('../controllers/adminController');
const router = express.Router();

router.use(authenticate, requireAdmin);

router.get('/stats', adminController.getStats);
router.get('/orders', adminController.getAllOrders);
router.put('/orders/:id/status', adminController.updateOrderStatus);
router.get('/products', adminController.getAllProducts);
router.post('/products', adminController.createProduct);
router.put('/products/:id', adminController.updateProduct);
router.delete('/products/:id', adminController.deleteProduct);
router.patch('/products/:id/visibility', adminController.toggleVisibility);
router.patch('/products/:id/stock', adminController.updateStock);
router.get('/users', adminController.getAllUsers);
router.patch('/users/:id/role', adminController.updateUserRole);
router.delete('/users/:id', adminController.deleteUser);

module.exports = router;
