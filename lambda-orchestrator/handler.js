const formatResponse = (statusCode, body) => ({
  statusCode,
  body: JSON.stringify(body, null, 2),
});

module.exports.createAndConfirmOrder = async (event) => {
  try {
    // Parsear el body
    const body = JSON.parse(event.body || '{}');
    const { customer_id, items, idempotency_key, correlation_id } = body;

    if (!customer_id || !items || !idempotency_key) {
      return formatResponse(400, { error: 'Missing required fields: customer_id, items, idempotency_key' });
    }

    const { CUSTOMERS_API_URL, ORDERS_API_URL, SERVICE_TOKEN } = process.env;
    const headers = { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SERVICE_TOKEN}`
    };

    // ---  Validar Cliente ---
    console.log(`🔍 Validando cliente ID: ${customer_id}...`);
    const customerRes = await fetch(`${CUSTOMERS_API_URL}/internal/customers/${customer_id}`, { headers });
    
    if (!customerRes.ok) {
      const err = await customerRes.json();
      return formatResponse(customerRes.status, { error: 'Customer validation failed', details: err });
    }
    const customerData = await customerRes.json();

    // --- Crear Orden ---
    console.log(`🛒 Creando orden para cliente ID: ${customer_id}...`);
    const createOrderRes = await fetch(`${ORDERS_API_URL}/orders`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ customer_id, items })
    });

    if (!createOrderRes.ok) {
      const err = await createOrderRes.json();
      return formatResponse(createOrderRes.status, { error: 'Failed to create order', details: err });
    }
    const orderData = await createOrderRes.json();
    const orderId = orderData.id;

    // --- Confirmar Orden (Orders API + Idempotency) ---
    console.log(`Confirmando orden ID: ${orderId} con Key: ${idempotency_key}...`);
    const confirmRes = await fetch(`${ORDERS_API_URL}/orders/${orderId}/confirm`, {
      method: 'POST',
      headers: {
        ...headers,
        'X-Idempotency-Key': idempotency_key 
      }
    });

    if (!confirmRes.ok) {
      const err = await confirmRes.json();
      // Nota: Si falla la confirmación, la orden queda en CREATED (según reglas de negocio)
      return formatResponse(confirmRes.status, { error: 'Failed to confirm order', details: err });
    }
    const confirmData = await confirmRes.json();

    // --- PASO 4: Respuesta Consolidada  ---
    const responsePayload = {
      success: true,
      correlationId: correlation_id || 'N/A',
      data: {
        customer: customerData,
        order: {
          id: orderData.id,
          status: confirmData.status, // Debería ser CONFIRMED
          total_cents: orderData.total_cents,
          items: orderData.items
        }
      }
    };

    return formatResponse(201, responsePayload);

  } catch (error) {
    console.error('Orchestrator Error:', error);
    return formatResponse(500, { error: 'Internal Server Error', message: error.message });
  }
};