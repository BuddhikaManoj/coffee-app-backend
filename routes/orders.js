const express = require('express');
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const orderController = require('../controllers/orderController');
const router = express.Router();

router.use(authenticate);
router.get('/my-orders', orderController.getMyOrders);
router.get('/:id', orderController.getById);
router.post('/', [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('address').trim().notEmpty().withMessage('Address is required'),
  body('phone').trim().notEmpty().withMessage('Phone is required'),
  body('items').isArray({ min: 1 }).withMessage('At least one item required'),
  body('total').isFloat({ min: 0 }).withMessage('Valid total required'),
], validate, orderController.create);

module.exports = router;
