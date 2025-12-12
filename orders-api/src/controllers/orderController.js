const OrderService = require('../services/orderService');

class OrderController {
  static async create(req, res) {
    const { customer_id, items } = req.body;
    if (!customer_id || !items || items.length === 0) {
      return res.status(400).json({ error: 'Customer ID and items are required' });
    }

    try {
      const result = await OrderService.createOrder(customer_id, items);
      res.status(201).json(result);
    } catch (error) {
      console.error(error);
      if (error.message === 'Invalid Customer ID' || error.message.includes('stock')) {
        return res.status(400).json({ error: error.message });
      }
      res.status(500).json({ error: error.message });
    }
  }

  static async confirm(req, res) {
    const orderId = req.params.id;
    const idempotencyKey = req.headers['x-idempotency-key'];

    if (!idempotencyKey) {
      return res.status(400).json({ error: 'Header X-Idempotency-Key is required' });
    }

    try {
      const result = await OrderService.confirmOrder(orderId, idempotencyKey);
      res.status(200).json(result);
    } catch (error) {
      console.error(error);
      if (error.message === 'Order not found') {
        return res.status(404).json({ error: error.message });
      }
      res.status(400).json({ error: error.message });
    }
  }
}

module.exports = OrderController;