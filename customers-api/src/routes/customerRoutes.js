const express = require('express');
const router = express.Router();
const CustomerController = require('../controllers/customerController');
const { internalAuth } = require('../middlewares/auth');
// Importar validador y esquema
const validate = require('../middlewares/validate');
const { createCustomerSchema } = require('../schemas/customerSchemas');

// Rutas Públicas
router.post('/', validate(createCustomerSchema), CustomerController.create);
router.get('/', CustomerController.getAll);
router.get('/:id', CustomerController.getById);

// Rutas Protegidas
// Mapeamos /internal/customers/:id a la misma lógica del controller, pero con middleware
router.get('/internal/:id', internalAuth, CustomerController.getById);

module.exports = router;