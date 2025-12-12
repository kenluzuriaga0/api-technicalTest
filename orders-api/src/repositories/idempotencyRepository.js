const pool = require('../config/db');

class IdempotencyRepository {
  static async findByKey(key) {
    const [rows] = await pool.execute(
      'SELECT response_body, status FROM idempotency_keys WHERE `key` = ?',
      [key]
    );
    return rows[0];
  }

  static async save({ key, target_type, target_id, status, response_body }, conn) {
    await conn.execute(
      'INSERT INTO idempotency_keys (`key`, target_type, target_id, status, response_body, expires_at) VALUES (?, ?, ?, ?, ?, ?)',
      [
        key,
        target_type,
        target_id,
        status,
        JSON.stringify(response_body),
        new Date(Date.now() + 24 * 60 * 60 * 1000) // 24h
      ]
    );
  }
}

module.exports = IdempotencyRepository;