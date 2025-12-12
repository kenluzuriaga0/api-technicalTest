const CustomerRepository = require('../repositories/customerRepository');

class CustomerController {
  static async create(req, res) {
    try {
      const { name, email, phone } = req.body;
      if (!name || !email) {
        return res.status(400).json({ error: 'Name and Email are required' });
      }
      const id = await CustomerRepository.create({ name, email, phone });
      res.status(201).json({ id, name, email, phone });
    } catch (error) {
      if (error.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({ error: 'Email already exists' });
      }
      console.error(error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  static async getById(req, res) {
    try {
      const customer = await CustomerRepository.findById(req.params.id);
      if (!customer) return res.status(404).json({ error: 'Customer not found' });
      res.json(customer);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  static async getAll(req, res) {
    try {
      const limit = parseInt(req.query.limit) || 10;
      const customers = await CustomerRepository.findAll(limit);
      res.json(customers);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }
}

module.exports = CustomerController;