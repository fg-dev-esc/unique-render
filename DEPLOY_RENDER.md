# 🚀 Guía de Deploy en Render - Backend PayPal

## ✅ CHECKLIST PRE-DEPLOY

Antes de hacer deploy, verifica:

- [x] Tabla `paypal_payments` creada en Supabase
- [x] `.env` NO está en el repositorio (protegido por `.gitignore`)
- [x] `.env.example` SÍ está en el repositorio
- [x] `server.js` tiene CORS configurado para producción
- [x] `package.json` tiene script `"start": "node server.js"`
- [x] Credenciales de Gmail App Password funcionando

---

## 📋 PASO 1: Crear tabla en Supabase

1. Ve a https://supabase.com/dashboard
2. Abre tu proyecto: **bntgkaikfktyyicmpert**
3. Ve a **SQL Editor** (panel izquierdo)
4. Clic en **New Query**
5. Copia y pega el contenido de `create_table.sql`
6. Clic en **Run** (▶️)
7. Verifica que la tabla se creó: **Table Editor > paypal_payments**

---

## 🌐 PASO 2: Subir código a GitHub

```bash
# Asegúrate de estar en la raíz del proyecto
git status

# Verifica que .env NO aparece (debe estar en .gitignore)
# Si aparece .env, NO hagas commit

# Agregar cambios
git add .

# Commit
git commit -m "Add PayPal backend with Supabase and Nodemailer"

# Push
git push origin dev
```

---

## 🎯 PASO 3: Crear Web Service en Render

### 3.1 Ir a Render

1. Ve a https://render.com/
2. Inicia sesión con tu cuenta
3. Clic en **New +** > **Web Service**

### 3.2 Conectar repositorio

1. Conecta tu cuenta de GitHub
2. Busca el repo: **dev-web3-uniquemotors**
3. Clic en **Connect**

### 3.3 Configurar el servicio

**Settings:**
```
Name: uniquemotors-paypal-backend
Region: Oregon (US West) o el más cercano a ti
Branch: dev (o main si ya mergeaste)
Root Directory: server
Runtime: Node
Build Command: npm install
Start Command: npm start
```

**Plan:**
```
Instance Type: Free
```

---

## 🔐 PASO 4: Configurar Variables de Entorno

En Render Dashboard > **Environment**

Agrega EXACTAMENTE estas variables (copia de tu `.env`):

```
PAYPAL_CLIENT_ID=AYlNnDcYMdvji2xddFIh0LdaUG-85PCM8l945sTSFVDMB5octtzsnClnsIV4B9A5l4MgbZz_qL18ZqGY

PAYPAL_CLIENT_SECRET=EB8EJVErD-6iAzR-VPvh_kwuGv4aoRtpQNBiBgmQIcvFCYGLa_MbP8xO0v_knkpvTT_syxRZGhxJ6NKg

SUPABASE_URL=https://bntgkaikfktyyicmpert.supabase.co

SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJudGdrYWlrZmt0eXlpY21wZXJ0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTA3NTgyNCwiZXhwIjoyMDc2NjUxODI0fQ.qGkxC1RurVjpgWofWmDLciIHWQX0fxa0niMGELuDOLw

EMAIL_USER=fg.dev.desk@gmail.com

EMAIL_PASS=xfpr xcoc krvr ieog

EMAIL_ADMIN=fg.dev.desk@gmail.com

PORT=3000

NODE_ENV=production
```

**IMPORTANTE:** Asegúrate de que `NODE_ENV=production` para que CORS funcione correctamente.

---

## 🚀 PASO 5: Deploy

1. Clic en **Create Web Service**
2. Render empezará a hacer build automáticamente
3. Espera 2-3 minutos...
4. Verás los logs en tiempo real

**Si todo sale bien verás:**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚀 Backend PayPal - UniqueMotors
📍 Servidor corriendo en http://localhost:3000
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

5. Render te dará una URL como:
   ```
   https://uniquemotors-paypal-backend.onrender.com
   ```

---

## ✅ PASO 6: Probar el backend

Abre en tu navegador:
```
https://uniquemotors-paypal-backend.onrender.com/
```

Deberías ver:
```json
{
  "status": "ok",
  "service": "PayPal Backend - UniqueMotors",
  "endpoints": {
    "createOrder": "POST /api/orders",
    "captureOrder": "POST /api/orders/:orderID/capture",
    "webhook": "POST /api/webhook"
  }
}
```

---

## 🔗 PASO 7: Actualizar Frontend

Una vez que tengas la URL de Render, actualiza el frontend:

### 7.1 Agregar variable de entorno en el frontend

Edita `.env` en la raíz del proyecto (frontend):

```env
# Agregar esta línea
VITE_PAYPAL_BACKEND_URL=https://uniquemotors-paypal-backend.onrender.com
```

### 7.2 Actualizar PayPalPayment.jsx

En `src/components/payment/PayPalPayment.jsx`, cambia:

**ANTES (líneas 135 y 164):**
```javascript
const response = await fetch('http://localhost:3000/api/orders', {
```

**DESPUÉS:**
```javascript
const backendUrl = import.meta.env.VITE_PAYPAL_BACKEND_URL || 'http://localhost:3000';
const response = await fetch(`${backendUrl}/api/orders`, {
```

Y también en la línea 164:
```javascript
const response = await fetch(`${backendUrl}/api/orders/${data.orderID}/capture`, {
```

### 7.3 Deploy del Frontend

```bash
git add .
git commit -m "Update PayPal backend URL for production"
git push origin dev
```

Si tienes auto-deploy en Vercel, se actualizará automáticamente.

---

## 🎯 PASO 8: Probar flujo completo

1. Ve a https://web2.uniquemotors.mx/
2. Navega a la página de pago
3. Completa un pago de prueba
4. Verifica:
   - ✅ Pago se completa
   - ✅ Emails se reciben
   - ✅ Datos en Supabase

---

## 🔍 Monitoreo en Render

Para ver logs en tiempo real:

1. Render Dashboard > Tu servicio
2. **Logs** (panel izquierdo)
3. Verás todos los console.log en tiempo real

---

## 🐛 Troubleshooting

### Error: "Application failed to respond"
- Verifica que PORT esté en las variables de entorno
- Revisa que NODE_ENV=production

### Error: CORS
- Verifica que la URL del frontend esté en allowedOrigins (server.js línea 157)
- Confirma que NODE_ENV=production

### Emails no se envían
- Verifica EMAIL_PASS (App Password de Gmail)
- Revisa logs en Render

### Supabase no guarda datos
- Verifica SUPABASE_SERVICE_KEY (NO la anon key)
- Confirma que la tabla existe

---

## 📊 URLs Finales

| Servicio | URL |
|----------|-----|
| **Backend Render** | `https://uniquemotors-paypal-backend.onrender.com` |
| **Frontend** | `https://web2.uniquemotors.mx` |
| **Supabase** | `https://supabase.com/dashboard/project/bntgkaikfktyyicmpert` |
| **PayPal Dashboard** | `https://developer.paypal.com/dashboard` |

---

## 🎉 ¡Listo para producción!

Tu backend está:
- ✅ Desplegado en Render
- ✅ Conectado a Supabase
- ✅ Enviando emails
- ✅ Procesando pagos de PayPal
- ✅ Con CORS configurado para producción

---

**Desarrollado para UniqueMotors** 🚗