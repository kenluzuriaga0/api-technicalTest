const express = require('express');
const app = express();
const pool = require('./db');
require('dotenv').config();

const port = process.env.PORT || 3002;
// URL interna para hablar con el otro contenedor
const CUSTOMERS_API_URL = process.env.CUSTOMERS_API_URL;
const SERVICE_TOKEN = process.env.SERVICE_TOKEN || 'TOKEN_SUPER_SECRETO_593';

app.use(express.json());

// --- ENDPOINT PRINCIPAL: CREAR ORDEN ---
app.post('/orders', async (req, res) => {
    console.log(`Contactandooooooooooo ${CUSTOMERS_API_URL}`);
  const { customer_id, items } = req.body;
  
  if (!customer_id || !items || items.length === 0) {
    return res.status(400).json({ error: 'Customer ID and items are required' });
  }

  // 1. Validar Cliente (Comunicación entre microservicios)
  try {
    console.log(`Contactando Customers API en ${CUSTOMERS_API_URL}/internal/customers/${customer_id}`);
    const customerResponse = await fetch(`${CUSTOMERS_API_URL}/internal/customers/${customer_id}`, {
      headers: { 'Authorization': `Bearer ${SERVICE_TOKEN}` }
    });
    
    if (!customerResponse.ok) {
      return res.status(400).json({ error: 'Invalid Customer ID' });
    }
  } catch (err) {
    console.error("Error contactando Customers API:", err);
    return res.status(503).json({ error: `Customers Service Unavailable ${err}` });
  }

  // 2. Iniciar Transacción (Todo o nada)
  const connection = await pool.getConnection();
  await connection.beginTransaction();

  try {
    let totalOrderCents = 0;
    const orderItemsData = [];

    // 3. Procesar Items (Verificar Stock y Calcular Precios)
    for (const item of items) {
      const { product_id, qty } = item;

      // Buscar producto y bloquear fila (FOR UPDATE) para evitar condiciones de carrera
      const [products] = await connection.execute(
        'SELECT price_cents, stock FROM products WHERE id = ? FOR UPDATE', 
        [product_id]
      );

      if (products.length === 0) {
        throw new Error(`Product ID ${product_id} not found`);
      }

      const product = products[0];

      if (product.stock < qty) {
        throw new Error(`Insufficient stock for Product ID ${product_id}`);
      }

      // Calcular subtotales
      const subtotal = product.price_cents * qty;
      totalOrderCents += subtotal;

      // Descontar stock
      await connection.execute(
        'UPDATE products SET stock = stock - ? WHERE id = ?',
        [qty, product_id]
      );

      // Guardar datos para insertar luego en order_items
      orderItemsData.push({
        product_id,
        qty,
        unit_price_cents: product.price_cents,
        subtotal_cents: subtotal
      });
    }

    // 4. Insertar la Orden
    const [orderResult] = await connection.execute(
      'INSERT INTO orders (customer_id, status, total_cents) VALUES (?, ?, ?)',
      [customer_id, 'CREATED', totalOrderCents]
    );
    
    const newOrderId = orderResult.insertId;

    // 5. Insertar los Items de la Orden
    for (const item of orderItemsData) {
      await connection.execute(
        'INSERT INTO order_items (order_id, product_id, qty, unit_price_cents, subtotal_cents) VALUES (?, ?, ?, ?, ?)',
        [newOrderId, item.product_id, item.qty, item.unit_price_cents, item.subtotal_cents]
      );
    }

    // Si todo salió bien, confirmamos cambios
    await connection.commit();

    res.status(201).json({
      id: newOrderId,
      status: 'CREATED',
      total_cents: totalOrderCents,
      items: orderItemsData
    });

  } catch (error) {
    // Si algo falló, deshacemos todos los cambios
    await connection.rollback();
    console.error(error);
    res.status(400).json({ error: error.message || 'Error creating order' });
  } finally {
    connection.release();
  }
});


// --- ENDPOINT: CONFIRMAR ORDEN (IDEMPOTENTE) ---
app.post('/orders/:id/confirm', async (req, res) => {
  const orderId = req.params.id;
  const idempotencyKey = req.headers['x-idempotency-key'];

  // 1. Validar que venga el header obligatorio
  if (!idempotencyKey) {
    return res.status(400).json({ error: 'Header X-Idempotency-Key is required' });
  }

  try {
    // 2. CHEQUEO DE IDEMPOTENCIA: ¿Ya procesamos esta key?
    // Nota: 'key' es palabra reservada en SQL a veces, usamos backticks `key`
    const [existingKeys] = await pool.execute(
      'SELECT response_body, status FROM idempotency_keys WHERE `key` = ?',
      [idempotencyKey]
    );

    if (existingKeys.length > 0) {
      // ¡YA EXISTE! Devolvemos lo mismo que la vez anterior sin tocar la orden
      console.log(`🔁 Idempotency hit: ${idempotencyKey}`);
      const savedResponse = JSON.parse(existingKeys[0].response_body);
      // Retornamos el mismo código de estado (usualmente 200)
      return res.status(200).json(savedResponse);
    }

    // 3. PROCESO REAL (Si es la primera vez)
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      // Verificar que la orden exista
      const [orders] = await connection.execute(
        'SELECT * FROM orders WHERE id = ? FOR UPDATE', 
        [orderId]
      );

      if (orders.length === 0) {
        throw new Error('Order not found');
      }

      const order = orders[0];

      if (order.status !== 'CREATED') {
         // Si ya estaba confirmada por OTRO proceso (no esta key), decidimos qué hacer.
         // Por simplicidad, si ya no es CREATED, lanzamos error o devolvemos éxito.
         // Aquí asumimos error de negocio si intentas confirmar algo cancelado/confirmado.
         if (order.status === 'CONFIRMED') {
            // Podríamos devolver éxito directo, pero sigamos flujo normal
         } else {
            throw new Error(`Cannot confirm order in status ${order.status}`);
         }
      }

      // Actualizar estado a CONFIRMED
      await connection.execute(
        'UPDATE orders SET status = "CONFIRMED" WHERE id = ?',
        [orderId]
      );

      // Preparar respuesta
      const responseBody = {
        success: true,
        message: 'Order confirmed',
        order_id: orderId,
        status: 'CONFIRMED'
      };

      // 4. GUARDAR LA KEY (Para el futuro)
      await connection.execute(
        'INSERT INTO idempotency_keys (`key`, target_type, target_id, status, response_body, expires_at) VALUES (?, ?, ?, ?, ?, ?)',
        [
            idempotencyKey, 
            'ORDER_CONFIRM', 
            orderId, 
            'SUCCESS', 
            JSON.stringify(responseBody), 
            new Date(Date.now() + 24 * 60 * 60 * 1000) // Expira en 24h
        ]
      );

      await connection.commit();
      res.json(responseBody);

    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }

  } catch (error) {
    console.error(error);
    // Si la orden no existe, 404, sino 400 o 500
    if (error.message === 'Order not found') {
        res.status(404).json({ error: error.message });
    } else {
        res.status(400).json({ error: error.message || 'Internal Error' });
    }
  }
});



// GET /products (Para verificar qué tenemos)
app.get('/products', async (req, res) => {
    const [rows] = await pool.execute('SELECT * FROM products');
    res.json(rows);
});

// Health Check
app.get('/health', (req, res) => res.json({ status: 'API Orders Online' }));

app.listen(port, () => {
  console.log(`Orders API corriendo en http://localhost:${port}`);
});