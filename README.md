# Sistema de Gestión de Pedidos B2B - Prueba Técnica Backend

Este repositorio contiene la solución a la prueba técnica para el rol de Senior Backend. El sistema implementa un flujo de pedidos B2B compuesto por microservicios, base de datos relacional y una función orquestadora (Lambda).

## 🚀 Arquitectura del Sistema

El proyecto está estructurado como un **Monorepo** que contiene:

* **Customers API (Port 3001):** Microservicio en Node.js/Express para gestión de clientes.
* **Orders API (Port 3002):** Microservicio en Node.js/Express para gestión de inventario, pedidos y transacciones. Implementa **Idempotencia**.
* **Lambda Orchestrator (Port 3000):** Función Serverless que orquesta la validación de cliente y creación/confirmación de pedidos.
* **MySQL Database:** Persistencia de datos con tablas relacionales (`customers`, `products`, `orders`, `order_items`, `idempotency_keys`).

---

## 📋 Requisitos Previos

* **Docker** y **Docker Compose** (v3.8+).
* **Node.js** (v20 o v22 recomendado).
* **NPM**.

---

## 🛠️ Guía de Instalación y Ejecución

Sigue estos pasos para levantar el entorno completo en tu máquina local.

### 1. Configuración de Variables de Entorno
Copia los archivos de ejemplo para crear las variables de entorno necesarias en cada servicio:

```bash
# Customers API
cp customers-api/.env.example customers-api/.env

# Orders API
cp orders-api/.env.example orders-api/.env

# Lambda Orchestrator
cp lambda-orchestrator/.env.example lambda-orchestrator/.env