const pool = require('../config/db');

class ProductRepository {
  static async findByIdLock(id, conn) {
    const [rows] = await conn.execute(
      'SELECT price_cents, stock FROM products WHERE id = ? FOR UPDATE',
      [id]
    );
    return rows[0];
  }

  static async updateStock(id, quantity, conn) {
    await conn.execute(
      'UPDATE products SET stock = stock - ? WHERE id = ?',
      [quantity, id]
    );
  }
  
  static async findAll() {
      const [rows] = await pool.execute('SELECT * FROM products');
      return rows;
  }
}

module.exports = ProductRepository;