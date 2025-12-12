const express = require('express');
const router = express.Router();
const CustomerController = require('../controllers/customerController');
const { internalAuth } = require('../middlewares/authMiddleware');

// Rutas Públicas
router.post('/', CustomerController.create);
router.get('/', CustomerController.getAll);
router.get('/:id', CustomerController.getById);

// Rutas Protegidas
// Mapeamos /internal/customers/:id a la misma lógica del controller, pero con middleware
router.get('/internal/:id', internalAuth, CustomerController.getById);

module.exports = router;