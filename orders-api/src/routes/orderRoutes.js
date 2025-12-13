const express = require('express');
const router = express.Router();
const OrderController = require('../controllers/orderController');
const validate = require('../middlewares/validate');
const { createOrderSchema, confirmOrderSchema } = require('../schemas/orderSchemas');

router.post('/', validate(createOrderSchema), OrderController.create);
router.post('/:id/confirm', validate(confirmOrderSchema), OrderController.confirm);

module.exports = router;