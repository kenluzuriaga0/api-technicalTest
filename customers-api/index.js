const express = require('express');
const app = express();
const pool = require('./db'); // Importamos la conexión
require('dotenv').config();

const port = process.env.PORT || 3001;
const SERVICE_TOKEN = process.env.SERVICE_TOKEN || 'TOKEN_SUPER_SECRETO_593';

app.use(express.json());

// 1. POST /customers (Crear cliente)
app.post('/customers', async (req, res) => {
  try {
    const { name, email, phone } = req.body;
    
    if (!name || !email) {
      return res.status(400).json({ error: 'Name and Email are required' });
    }

    const [result] = await pool.execute(
      'INSERT INTO customers (name, email, phone) VALUES (?, ?, ?)',
      [name, email, phone]
    );

    res.status(201).json({ 
      id: result.insertId, 
      name, 
      email, 
      phone 
    });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Email already exists' });
    }
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 2. GET /customers/:id (Obtener detalle)
app.get('/customers/:id', async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM customers WHERE id = ?', [req.params.id]);
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    res.json(rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 3. GET /customers (Búsqueda básica)
app.get('/customers', async (req, res) => {
  try {
    // Ejemplo simple: select * con límite
    const limit = parseInt(req.query.limit) || 10;
    const [rows] = await pool.execute('SELECT * FROM customers LIMIT ?', [limit.toString()]); // toString para evitar problemas de tipo en mysql2
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// --- ENDPOINTS INTERNOS (Protected) ---

// 4. GET /internal/customers/:id
// Este endpoint valida que quien lo llama tenga el token correcto (Orders API o Lambda)
app.get('/internal/customers/:id', async (req, res) => {
  const authHeader = req.headers.authorization;
  console.log('Auth Header:', authHeader);
  
  // Validación de seguridad simple "Bearer TOKEN"
  if (!authHeader || authHeader !== `Bearer ${SERVICE_TOKEN}`) {
    return res.status(401).json({ error: 'Unauthorized: Invalid Service Token' });
  }

  try {
    const [rows] = await pool.execute('SELECT * FROM customers WHERE id = ?', [req.params.id]);
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    res.json(rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.get('/health', (req, res) => res.json({ status: 'API Customers Activo!' }));

app.listen(port, () => {
  console.log(`Customers API corriendo en http://localhost:${port}`);
});