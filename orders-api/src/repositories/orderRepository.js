class OrderRepository {
  static async create({ customer_id, status, total_cents }, conn) {
    const [result] = await conn.execute(
      'INSERT INTO orders (customer_id, status, total_cents) VALUES (?, ?, ?)',
      [customer_id, status, total_cents]
    );
    return result.insertId;
  }

  static async createItem({ order_id, product_id, qty, unit_price_cents, subtotal_cents }, conn) {
    await conn.execute(
      'INSERT INTO order_items (order_id, product_id, qty, unit_price_cents, subtotal_cents) VALUES (?, ?, ?, ?, ?)',
      [order_id, product_id, qty, unit_price_cents, subtotal_cents]
    );
  }

  static async findByIdLock(id, conn) {
    const [rows] = await conn.execute(
      'SELECT * FROM orders WHERE id = ? FOR UPDATE',
      [id]
    );
    return rows[0];
  }

  static async updateStatus(id, status, conn) {
    await conn.execute(
      'UPDATE orders SET status = ? WHERE id = ?',
      [status, id]
    );
  }
}

module.exports = OrderRepository;