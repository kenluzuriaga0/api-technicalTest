const express = require('express');
const cors = require('cors');
require('dotenv').config();

const orderRoutes = require('./src/routes/orderRoutes');
const productRepository = require('./src/repositories/productRepository');

const app = express();
const port = process.env.PORT || 3002;

app.use(cors());
app.use(express.json());

// Rutas
app.use('/orders', orderRoutes);

// Endpoint simple de productos
app.get('/products', async (req, res) => {
    try {
        const products = await productRepository.findAll();
        res.json(products);
    } catch (err) {
        res.status(500).json({error: err.message});
    }
});

app.get('/health', (req, res) => res.json({ status: 'API Orders Online' }));

app.listen(port, () => {
  console.log(`Orders API corriendo en http://localhost:${port}`);
});