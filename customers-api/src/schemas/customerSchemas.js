const { z } = require('zod');

const createCustomerSchema = z.object({
  body: z.object({
    name: z.string().min(1, "El nombre es obligatorio"),
    email: z.string().email("Debe ser un email válido"),
  }),
});

module.exports = { createCustomerSchema };