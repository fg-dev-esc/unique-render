# Backend PayPal - UniqueMotors

Backend Node.js puro para procesar pagos de PayPal con integración a Supabase y notificaciones por email.

## 🚀 Características

- ✅ Creación de órdenes de pago en PayPal
- ✅ Captura de pagos validada en servidor
- ✅ Almacenamiento de transacciones en Supabase
- ✅ Notificaciones automáticas por email (Usuario + Admin)
- ✅ Webhook para eventos de PayPal
- ✅ CORS configurado para desarrollo local

## 📦 Dependencias

```json
{
  "@paypal/checkout-server-sdk": "SDK oficial de PayPal",
  "@supabase/supabase-js": "Cliente de Supabase",
  "nodemailer": "Envío de emails",
  "dotenv": "Variables de entorno"
}
```

## ⚙️ Configuración

### 1. Crear tabla en Supabase

Ejecuta el archivo `create_table.sql` en el SQL Editor de Supabase:

```bash
Dashboard de Supabase > SQL Editor > New Query
# Pega el contenido de create_table.sql y ejecuta
```

### 2. Configurar variables de entorno

El archivo `.env` ya está configurado con:
- Credenciales de PayPal Sandbox
- URL y Service Key de Supabase
- Configuración de Gmail para Nodemailer

**IMPORTANTE:** Nunca subas el archivo `.env` a GitHub (ya está en .gitignore)

### 3. Instalar dependencias

```bash
cd server
npm install
```

## 🖥️ Ejecución en Local

### Iniciar el backend

```bash
cd server
npm start
```

El servidor correrá en `http://localhost:3000`

### Iniciar el frontend (en otra terminal)

```bash
# Desde la raíz del proyecto
npm run dev
```

El frontend correrá en `http://localhost:5173`

## 🌐 Endpoints

### 1. Crear Orden

```http
POST http://localhost:3000/api/orders
Content-Type: application/json

{
  "amount": 10000,
  "currency": "MXN",
  "paymentContext": "guarantee",
  "torreID": "ABC123",
  "articuloNombre": "Auto X"
}
```

**Respuesta:**
```json
{
  "id": "5O190127TN364715T"
}
```

### 2. Capturar Orden

```http
POST http://localhost:3000/api/orders/5O190127TN364715T/capture
```

**Respuesta:**
```json
{
  "success": true,
  "order": { /* datos de PayPal */ },
  "paymentRecord": { /* registro en Supabase */ },
  "emailSent": true
}
```

### 3. Webhook

```http
POST http://localhost:3000/api/webhook
Content-Type: application/json

{ /* evento de PayPal */ }
```

### 4. Health Check

```http
GET http://localhost:3000/
```

## 📧 Notificaciones por Email

Cuando se captura un pago, se envían automáticamente 2 emails:

1. **Al usuario** (email del pagador en PayPal)
2. **Al admin** (fg.dev.desk@gmail.com)

Ambos incluyen:
- Order ID
- Monto y moneda
- Datos del pagador
- Contexto del pago (garantía o adjudicación)
- Información de torre y artículo (si aplica)

## 🗄️ Base de Datos (Supabase)

### Tabla: `paypal_payments`

Almacena todos los pagos con:
- Datos de PayPal (order ID, status)
- Información del pago (amount, currency)
- Datos del pagador (email, nombre, ID)
- Contexto (guarantee/adjudicacion, torre, artículo)
- Metadata completa de PayPal
- Estado de notificaciones

## 🚀 Deployment en Render

### 1. Crear nuevo Web Service en Render

- **Repository:** tu-repo-github
- **Root Directory:** `server`
- **Build Command:** `npm install`
- **Start Command:** `npm start`

### 2. Variables de entorno

Configurar en Render Dashboard > Environment:

```
PAYPAL_CLIENT_ID=AYlNnDcYMdvji2xddFIh0LdaUG-85PCM8l945sTSFVDMB5octtzsnClnsIV4B9A5l4MgbZz_qL18ZqGY
PAYPAL_CLIENT_SECRET=EB8EJVErD-6iAzR-VPvh_kwuGv4aoRtpQNBiBgmQIcvFCYGLa_MbP8xO0v_knkpvTT_syxRZGhxJ6NKg
SUPABASE_URL=https://bntgkaikfktyyicmpert.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGc...
EMAIL_USER=fg.dev.desk@gmail.com
EMAIL_PASS=xfpr xcoc krvr ieog
EMAIL_ADMIN=fg.dev.desk@gmail.com
PORT=3000
NODE_ENV=production
```

### 3. Actualizar frontend

Cambiar en `PayPalPayment.jsx`:

```javascript
// De:
const response = await fetch('http://localhost:3000/api/orders', ...

// A:
const response = await fetch('https://tu-backend.onrender.com/api/orders', ...
```

## 📝 Notas Importantes

- **Sandbox vs Producción:** Actualmente usa credenciales de PayPal Sandbox para testing
- **Seguridad:** El Service Role Key de Supabase tiene acceso completo, nunca lo expongas en frontend
- **CORS:** En producción, restringe los orígenes permitidos en lugar de usar `*`
- **Emails:** Usa App Password de Gmail, no la contraseña normal

## 🔧 Troubleshooting

### Error: "Cannot find module"
```bash
cd server
rm -rf node_modules
npm install
```

### Error: "ECONNREFUSED localhost:3000"
- Verifica que el backend esté corriendo
- Revisa que el puerto 3000 no esté ocupado

### Emails no se envían
- Verifica que el App Password de Gmail sea correcto
- Asegúrate de tener verificación en 2 pasos activada en Gmail

### PayPal rechaza la transacción
- Verifica que uses cuentas de PayPal Sandbox
- Confirma que las credenciales en `.env` sean correctas

## 📚 Recursos

- [PayPal Developer](https://developer.paypal.com/)
- [Supabase Docs](https://supabase.com/docs)
- [Nodemailer](https://nodemailer.com/)
- [Render Docs](https://render.com/docs)

---

Desarrollado para **UniqueMotors** 🚗