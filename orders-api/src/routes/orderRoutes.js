const express = require('express');
const router = express.Router();
const OrderController = require('../controllers/orderController');

router.post('/', OrderController.create);
router.post('/:id/confirm', OrderController.confirm);

module.exports = router;