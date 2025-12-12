const express = require('express');
const cors = require('cors');
require('dotenv').config();

const customerRoutes = require('./src/routes/customerRoutes');

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Rutas base
app.use('/customers', customerRoutes);
// Nota: Para mantener compatibilidad con tu código anterior donde '/internal' estaba en la raíz:
app.use('/internal/customers', require('./src/routes/customerRoutes').stack 
    ? require('./src/routes/customerRoutes') // Si quieres reutilizar el router
    : (req, res, next) => next() // O defínelo explícitamente si prefieres separar routers
);
// Mejor práctica: Definir ruta explicita en app.use para internal si el router no lo maneja relativo
// En el router definimos '/internal/:id', así que app.use('/', routes) o ajustar paths.
// Ajuste recomendado para el router de arriba:
// app.use('/', customerRoutes); 
// Pero para ser limpios, dejemos que customerRoutes maneje "/customers" y "/internal/customers" si modificamos el router o montamos en raíz.

// Health Check
app.get('/health', (req, res) => res.json({ status: 'API Customers Activo!' }));

app.listen(port, () => {
  console.log(`Customers API corriendo en http://localhost:${port}`);
});