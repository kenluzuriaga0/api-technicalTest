const { z } = require('zod');

// Esquema para Crear Orden
const createOrderSchema = z.object({
  body: z.object({
    customer_id: z.number({ required_error: "customer_id es requerido" }).int().positive(),
    items: z.array(
      z.object({
        product_id: z.number().int().positive(),
        qty: z.number().int().positive("La cantidad debe ser mayor a 0")
      })
    ).nonempty("La orden debe tener al menos un item"),
  }),
});

// Esquema para Confirmar Orden (Headers y Params)
const confirmOrderSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/, "El ID de la orden debe ser numérico"), // Express params son strings
  }),
  headers: z.object({
    'x-idempotency-key': z.string({ required_error: "Header X-Idempotency-Key es requerido" }).min(1),
  }),
});

module.exports = { createOrderSchema, confirmOrderSchema };