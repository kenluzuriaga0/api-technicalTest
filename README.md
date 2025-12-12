
-----

# 🖖 API Technical Test

Sistema de microservicios para la gestión de pedidos B2B, compuesto por dos APIs REST (Customers y Orders) y una Lambda Function orquestadora

## 📋 Tabla de Contenidos

1. [Arquitectura](#-arquitectura)
2. [Tecnologías](#-tecnologías)
3. [Estructura del Proyecto](#-estructura-del-proyecto)
4. [Requisitos Previos](#-requisitos-previos)
5. [Instalación y Ejecución](#-instalación-y-ejecución)
6. [Variables de Entorno](#-variables-de-entorno)
7. [Documentación de Endpoints](#-documentación-de-endpoints)
8. [Pruebas (cURL)](#-pruebas-curl)

-----
<a name="-arquitectura"></a>
## 🏛 Arquitectura

El sistema está dividido en tres componentes principales:

1.  **Customers API (Puerto 3001):** Gestiona la información de los clientes. Expone endpoints públicos y endpoints internos protegidos para validación entre servicios.
2.  **Orders API (Puerto 3002):** Gestiona productos, inventario y el ciclo de vida de las órdenes. Implementa:
      * **Idempotencia:** Manejo de duplicados en la confirmación de órdenes mediante `X-Idempotency-Key`.
3.  **Lambda Orchestrator (Puerto 3000):** Actúa como un patrón *Saga* simplificado o *Orchestrator*. Recibe la petición del cliente, valida datos contra Customers API y coordina la creación y confirmación en Orders API.

-----

<a name="-tecnologías"></a>
## 🛠 Tecnologías

  * **Runtime:** Node.js v22 (Alpine en Docker)
  * **Framework Web:** Express.js 5
  * **Serverless:** Serverless Framework (Offline para desarrollo local)
  * **Base de Datos:** MySQL 8.0 / `mysql2` driver
  * **Contenedores:** Docker & Docker Compose
  * **Patrones:** N-Tier (Controller-Service-Repository), Idempotency Key, Internal Token Auth.

-----

<a name="-estructura-del-proyecto"></a>
## 📂 Estructura del Proyecto

El repositorio es un *monorepo* organizado de la siguiente manera:

```text
/
├── customers-api/        # Microservicio de Clientes
│   ├── src/              # Código fuente (Controllers, Routes, Config)
│   ├── Dockerfile
│   └── package.json
├── orders-api/           # Microservicio de Órdenes e Inventario
│   ├── src/              # Código fuente (Services, Repositories, etc.)
│   ├── Dockerfile
│   └── package.json
├── lambda-orchestrator/  # Función AWS Lambda (Orquestador)
│   ├── handler.js        # Lógica de la función
│   ├── serverless.yml    # Configuración de infraestructura
│   └── package.json
├── db/                   # Scripts de inicialización de BD
│   ├── schema.sql        # Estructura de tablas
│   └── seed.sql          # Datos de prueba
└── docker-compose.yml    # Orquestación de contenedores (APIs + DB)
```

-----
<a name="-requisitos-previos"></a>
## ✅ Requisitos Previos

  * [Docker](https://www.docker.com/) y Docker Compose instalados.
  * [Node.js](https://nodejs.org/) (v18 o superior recomendado para ejecutar scripts locales).
  * [NPM](https://www.npmjs.com/).

-----

<a name="-instalación-y-ejecución"></a>
## 🚀 Instalación y Ejecución

### 1\. Levantar Infraestructura (Base de Datos y APIs)

Utilizamos Docker Compose para levantar la base de datos MySQL, `customers-api` y `orders-api`.

```bash
# En la raíz del proyecto
docker-compose up -d --build
```

  * Esto inicializará MySQL y ejecutará automáticamente los scripts `schema.sql` y `seed.sql`
  * **Customers API** estará disponible en: `http://localhost:3001`
  * **Orders API** estará disponible en: `http://localhost:3002`

### 2\. Levantar el Orquestador (Lambda Local)

El Lambda se ejecuta fuera de Docker para simular un entorno Serverless localmente usando `serverless-offline`.

```bash
cd lambda-orchestrator

npm install

npm run dev
```

  * **Lambda Endpoint** estará disponible en: `http://localhost:3000/orchestrator/create-and-confirm-order`

-----

<a name="-variables-de-entorno"></a>
## 🔐 Variables de Entorno

Las variables principales están pre-configuradas en el `docker-compose.yml` para desarrollo local.

| Variable | Descripción | Valor por defecto |
| :--- | :--- | :--- |
| `DB_HOST` | Host de la base de datos | `db` (en docker) / `localhost` (local) |
| `DB_USER` | Usuario de MySQL | `mysql` |
| `DB_PASS` | Contraseña de MySQL | `mysql` |
| `DB_NAME` | Nombre de la DB | `orders_db` |
| `SERVICE_TOKEN` | Token para comunicación entre APIs | `TOKEN_SUPER_SECRETO_593` |
| `CUSTOMERS_API_URL` | URL base de Customers API | `http://customers-api:3001` |

-----

<a name="-documentación-de-endpoints"></a>
## 📡 Documentación de Endpoints

### 👤 Customers API (Puerto 3001)

  * `POST /customers`: Crea un nuevo cliente.
  * `GET /customers/:id`: Obtiene detalles de un cliente.
  * `GET /internal/customers/:id`: **(Protegido)** Obtiene detalles para uso interno. Requiere header `Authorization: Bearer <SERVICE_TOKEN>`.

### 🛒 Orders API (Puerto 3002)

  * `POST /orders`: Crea una orden en estado `CREATED`. Valida stock y cliente.
  * `POST /orders/:id/confirm`: Confirma una orden pasando a `CONFIRMED`.
      * **Requiere Header:** `X-Idempotency-Key` (String único).
  * `GET /products`: Lista productos y stock disponible.

### ⚡ Lambda Orchestrator (Puerto 3000)

  * `POST /orchestrator/create-and-confirm-order`: Flujo completo.
      * **Body:** `{ customer_id, items, idempotency_key, correlation_id }`

-----

<a name="-pruebas-curl"></a>
## 🧪 Pruebas (cURL)

Puedes probar el flujo completo copiando y pegando estos comandos en tu terminal.

#### 1\. Verificar Productos Disponibles

```bash
curl http://localhost:3002/products
```

#### 2\. Crear un Cliente Nuevo

```bash
curl -X POST http://localhost:3001/customers \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Empresa Top ",
    "email": "ventas@test.com",
    "phone": "0991234567"
  }'
```

#### 3\. Ejecutar Flujo Completo (Lambda Orchestrator)

Este request crea la orden, valida el cliente internamente y confirma la orden usando idempotencia.

```bash
curl -X POST http://localhost:3000/orchestrator/create-and-confirm-order \
  -H "Content-Type: application/json" \
  -d '{
    "customer_id": 1,
    "items": [
      { "product_id": 1, "qty": 1 }
    ],
    "idempotency_key": "unique-key-2025-001",
    "correlation_id": "trace-abc-123"
  }'
```

#### 4\. Probar Idempotencia

Ejecuta el comando del **Paso 3** nuevamente con la misma `idempotency_key`. Deberías recibir la misma respuesta exitosa sin que se duplique la orden ni se descuente stock adicional.
