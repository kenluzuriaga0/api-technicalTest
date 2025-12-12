const pool = require('../config/db');
const OrderRepository = require('../repositories/orderRepository');
const ProductRepository = require('../repositories/productRepository');
const IdempotencyRepository = require('../repositories/idempotencyRepository');

const CUSTOMERS_API_URL = process.env.CUSTOMERS_API_URL;
const SERVICE_TOKEN = process.env.SERVICE_TOKEN || 'TOKEN_SUPER_SECRETO_593';

class OrderService {
  
  // Validar cliente externamente
  static async validateCustomer(customerId) {
    try {
      const response = await fetch(`${CUSTOMERS_API_URL}/internal/customers/${customerId}`, {
        headers: { 'Authorization': `Bearer ${SERVICE_TOKEN}` }
      });
      return response.ok;
    } catch (err) {
      console.error("Error validating customer:", err);
      throw new Error('Service Unavailable');
    }
  }

  static async createOrder(customerId, items) {
    // 1. Validar Cliente
    const isValidCustomer = await this.validateCustomer(customerId);
    if (!isValidCustomer) throw new Error('Invalid Customer ID');

    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      let totalOrderCents = 0;
      const orderItemsData = [];

      // 2. Procesar Items y Stock
      for (const item of items) {
        const product = await ProductRepository.findByIdLock(item.product_id, connection);

        if (!product) throw new Error(`Product ID ${item.product_id} not found`);
        if (product.stock < item.qty) throw new Error(`Insufficient stock for Product ID ${item.product_id}`);

        const subtotal = product.price_cents * item.qty;
        totalOrderCents += subtotal;

        await ProductRepository.updateStock(item.product_id, item.qty, connection);

        orderItemsData.push({
          product_id: item.product_id,
          qty: item.qty,
          unit_price_cents: product.price_cents,
          subtotal_cents: subtotal
        });
      }

      // 3. Crear Orden
      const orderId = await OrderRepository.create({
        customer_id: customerId,
        status: 'CREATED',
        total_cents: totalOrderCents
      }, connection);

      // 4. Crear Items
      for (const item of orderItemsData) {
        await OrderRepository.createItem({ ...item, order_id: orderId }, connection);
      }

      await connection.commit();
      
      return {
        id: orderId,
        status: 'CREATED',
        total_cents: totalOrderCents,
        items: orderItemsData
      };

    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  static async confirmOrder(orderId, idempotencyKey) {
    // 1. Chequeo de Idempotencia
    const existingKey = await IdempotencyRepository.findByKey(idempotencyKey);
    if (existingKey) {
      return JSON.parse(existingKey.response_body);
    }

    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      const order = await OrderRepository.findByIdLock(orderId, connection);
      if (!order) throw new Error('Order not found');
      
      if (order.status !== 'CREATED') {
         if (order.status !== 'CONFIRMED') throw new Error(`Cannot confirm order in status ${order.status}`);
      } else {
         await OrderRepository.updateStatus(orderId, 'CONFIRMED', connection);
      }

      const responseBody = {
        success: true,
        message: 'Order confirmed',
        order_id: orderId,
        status: 'CONFIRMED'
      };

      // Guardar llave de idempotencia
      await IdempotencyRepository.save({
        key: idempotencyKey,
        target_type: 'ORDER_CONFIRM',
        target_id: orderId,
        status: 'SUCCESS',
        response_body: responseBody
      }, connection);

      await connection.commit();
      return responseBody;

    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }
}

module.exports = OrderService;