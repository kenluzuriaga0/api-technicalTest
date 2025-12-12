const pool = require('../config/db');

class CustomerRepository {
  static async create({ name, email, phone }) {
    const [result] = await pool.execute(
      'INSERT INTO customers (name, email, phone) VALUES (?, ?, ?)',
      [name, email, phone]
    );
    return result.insertId;
  }

  static async findById(id) {
    const [rows] = await pool.execute('SELECT * FROM customers WHERE id = ?', [id]);
    return rows[0];
  }

  static async findAll(limit) {
    const [rows] = await pool.execute('SELECT * FROM customers LIMIT ?', [limit.toString()]);
    return rows;
  }
}

module.exports = CustomerRepository;