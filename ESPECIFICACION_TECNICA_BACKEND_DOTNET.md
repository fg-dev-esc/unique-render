# Especificación Técnica: Backend PayPal para UniqueMotors

## 📋 Resumen Ejecutivo

Necesito que implementes un backend en .NET para procesar pagos de PayPal. El sistema debe crear órdenes, capturar pagos, almacenar transacciones en base de datos y recibir webhooks de PayPal.

---

## 🎯 Objetivos

1. Crear endpoint para generar órdenes de pago en PayPal
2. Crear endpoint para capturar pagos aprobados
3. Implementar webhook listener para eventos de PayPal
4. Almacenar todas las transacciones en base de datos
5. Enviar notificaciones por email cuando se complete un pago

---

## 📊 1. ESQUEMA DE BASE DE DATOS

### Tabla: `paypal_payments`

Crea esta tabla en tu base de datos SQL Server / PostgreSQL:

```sql
CREATE TABLE paypal_payments (
  -- Identificador único
  id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),  -- SQL Server
  -- id UUID PRIMARY KEY DEFAULT gen_random_uuid(), -- PostgreSQL

  created_at DATETIME2 DEFAULT GETDATE(),  -- SQL Server
  -- created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(), -- PostgreSQL

  updated_at DATETIME2 DEFAULT GETDATE(),  -- SQL Server
  -- updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(), -- PostgreSQL

  -- Datos de PayPal
  paypal_order_id NVARCHAR(100) UNIQUE NOT NULL,
  status NVARCHAR(20) NOT NULL CHECK (status IN ('CREATED', 'APPROVED', 'COMPLETED', 'FAILED', 'CANCELLED', 'REFUNDED')),

  -- Datos del pago
  amount DECIMAL(10,2) NOT NULL,
  currency NVARCHAR(3) DEFAULT 'MXN',

  -- Datos del pagador
  payer_email NVARCHAR(255),
  payer_name NVARCHAR(255),
  payer_id NVARCHAR(100),

  -- Contexto del pago
  payment_context NVARCHAR(50),  -- 'guarantee' o 'adjudicacion'
  torre_id NVARCHAR(50),
  articulo_nombre NVARCHAR(255),

  -- Metadata
  paypal_response NVARCHAR(MAX),  -- JSON de respuesta completa de PayPal
  notification_sent BIT DEFAULT 0,
  notification_error NVARCHAR(MAX)
);

-- Índices para performance
CREATE INDEX idx_paypal_order_id ON paypal_payments(paypal_order_id);
CREATE INDEX idx_status ON paypal_payments(status);
CREATE INDEX idx_created_at ON paypal_payments(created_at DESC);
CREATE INDEX idx_payer_email ON paypal_payments(payer_email);
```

**Notas importantes:**
- `paypal_order_id`: Es el ID único que devuelve PayPal al crear una orden
- `status`: Debe permitir los 6 estados especificados
- `paypal_response`: Guarda el JSON completo de la respuesta de PayPal
- Usa índices para optimizar consultas frecuentes

---

## 🔌 2. ENDPOINT: CREAR ORDEN DE PAGO

### POST `/api/paypal/orders`

**Descripción:** Crea una orden de pago en PayPal y la registra en la base de datos.

### Request Body (JSON):

```json
{
  "amount": 15000.00,
  "currency": "MXN",
  "paymentContext": "guarantee",
  "torreID": "ABC123",
  "articuloNombre": "Nissan Versa 2020"
}
```

### Request Schema:

```csharp
public class CreateOrderRequest
{
    [Required]
    public decimal Amount { get; set; }

    public string Currency { get; set; } = "MXN";

    public string PaymentContext { get; set; } = "guarantee"; // "guarantee" o "adjudicacion"

    public string TorreID { get; set; }

    public string ArticuloNombre { get; set; }
}
```

### Lógica del Endpoint:

1. **Validar datos de entrada**
   - `amount` debe ser mayor a 0
   - `currency` debe ser válido (MXN, USD, etc.)

2. **Crear orden en PayPal**
   - Usar PayPal SDK para .NET: `PayPal.Core` y `PayPal.Api`
   - Configuración:
     ```csharp
     var environment = new SandboxEnvironment(clientId, clientSecret);
     var client = new PayPalHttpClient(environment);
     ```

3. **Estructura de la orden a enviar a PayPal:**

```csharp
var orderRequest = new OrderRequest
{
    CheckoutPaymentIntent = "CAPTURE",
    PurchaseUnits = new List<PurchaseUnitRequest>
    {
        new PurchaseUnitRequest
        {
            AmountWithBreakdown = new AmountWithBreakdown
            {
                CurrencyCode = request.Currency,
                Value = request.Amount.ToString("F2")
            },
            Description = request.PaymentContext == "adjudicacion"
                ? $"Pago Adjudicación Torre {request.TorreID} - {request.ArticuloNombre}"
                : "Depósito de garantía - UniqueMotors",
            CustomId = request.PaymentContext == "adjudicacion"
                ? $"ADJ-{request.TorreID}"
                : null
        }
    },
    ApplicationContext = new ApplicationContext
    {
        BrandName = "UniqueMotors",
        Locale = "es-MX",
        UserAction = "PAY_NOW"
    }
};
```

4. **Guardar en base de datos:**

```csharp
var payment = new PaypalPayment
{
    PaypalOrderId = orderResponse.Id,
    Status = "CREATED",
    Amount = request.Amount,
    Currency = request.Currency,
    PaymentContext = request.PaymentContext,
    TorreId = request.TorreID,
    ArticuloNombre = request.ArticuloNombre,
    PaypalResponse = JsonConvert.SerializeObject(orderResponse),
    CreatedAt = DateTime.UtcNow,
    UpdatedAt = DateTime.UtcNow
};

await _dbContext.PaypalPayments.AddAsync(payment);
await _dbContext.SaveChangesAsync();
```

5. **Devolver respuesta al frontend:**

### Response (200 OK):

```json
{
  "id": "5O190127TN364715T"
}
```

### Response Schema:

```csharp
public class CreateOrderResponse
{
    public string Id { get; set; } // PayPal Order ID
}
```

### Response en caso de error (400/500):

```json
{
  "error": "Monto inválido"
}
```

---

## ✅ 3. ENDPOINT: CAPTURAR PAGO

### POST `/api/paypal/orders/{orderID}/capture`

**Descripción:** Captura un pago aprobado por el usuario en PayPal.

### URL Parameters:

- `orderID` (string, required): El ID de la orden de PayPal

**Ejemplo:** `/api/paypal/orders/5O190127TN364715T/capture`

### Request Body:

No requiere body (vacío).

### Lógica del Endpoint:

1. **Obtener orderID del path parameter**

2. **Capturar orden en PayPal:**

```csharp
var request = new OrdersCaptureRequest(orderID);
request.RequestBody(new OrderActionRequest());

var response = await client.Execute(request);
var captureResult = response.Result<Order>();
```

3. **Extraer datos del pagador:**

```csharp
var payer = captureResult.Payer;
var payerEmail = payer.EmailAddress;
var payerName = $"{payer.Name.GivenName} {payer.Name.Surname}";
var payerId = payer.PayerId;
```

4. **Buscar pago existente en BD:**

```csharp
var existingPayment = await _dbContext.PaypalPayments
    .FirstOrDefaultAsync(p => p.PaypalOrderId == orderID);

if (existingPayment == null)
{
    return NotFound(new { error = "Orden no encontrada" });
}
```

5. **Actualizar registro en BD:**

```csharp
existingPayment.Status = "COMPLETED";
existingPayment.PayerEmail = payerEmail;
existingPayment.PayerName = payerName;
existingPayment.PayerId = payerId;
existingPayment.PaypalResponse = JsonConvert.SerializeObject(captureResult);
existingPayment.UpdatedAt = DateTime.UtcNow;

await _dbContext.SaveChangesAsync();
```

6. **Enviar email de notificación:**
   - Al usuario (payer_email)
   - Al administrador (email configurado)
   - Marcar `notification_sent = true` si se envía correctamente

### Response (200 OK):

```json
{
  "success": true,
  "order": {
    "id": "5O190127TN364715T",
    "status": "COMPLETED",
    "payer": {
      "email_address": "usuario@example.com",
      "name": {
        "given_name": "John",
        "surname": "Doe"
      }
    },
    "purchase_units": [
      {
        "amount": {
          "currency_code": "MXN",
          "value": "15000.00"
        }
      }
    ]
  },
  "paymentRecord": {
    "id": "guid-del-registro",
    "paypal_order_id": "5O190127TN364715T",
    "status": "COMPLETED",
    "amount": 15000.00,
    "currency": "MXN",
    "payer_email": "usuario@example.com",
    "payer_name": "John Doe"
  },
  "emailSent": true
}
```

### Response Schema:

```csharp
public class CaptureOrderResponse
{
    public bool Success { get; set; }
    public object Order { get; set; } // Objeto completo de PayPal
    public PaypalPayment PaymentRecord { get; set; }
    public bool EmailSent { get; set; }
}
```

---

## 🎣 4. ENDPOINT: WEBHOOK DE PAYPAL

### POST `/api/paypal/webhook`

**Descripción:** Recibe eventos automáticos de PayPal (pagos completados, reembolsos, etc.)

### Request Headers (enviados por PayPal):

```
Content-Type: application/json
PAYPAL-TRANSMISSION-ID: xxxxx
PAYPAL-TRANSMISSION-TIME: xxxxx
PAYPAL-TRANSMISSION-SIG: xxxxx
PAYPAL-CERT-URL: xxxxx
```

### Request Body (ejemplo - evento PAYMENT.CAPTURE.COMPLETED):

```json
{
  "id": "WH-2WR32451HC0233532-67976317FL4543714",
  "event_version": "1.0",
  "create_time": "2025-10-21T10:30:00Z",
  "resource_type": "capture",
  "event_type": "PAYMENT.CAPTURE.COMPLETED",
  "summary": "Payment completed for $15000.00 MXN",
  "resource": {
    "id": "3ME46664SU696054K",
    "status": "COMPLETED",
    "amount": {
      "currency_code": "MXN",
      "value": "15000.00"
    },
    "supplementary_data": {
      "related_ids": {
        "order_id": "5O190127TN364715T"
      }
    },
    "create_time": "2025-10-21T10:30:00Z",
    "update_time": "2025-10-21T10:30:00Z"
  }
}
```

### Tipos de eventos a procesar:

| Evento | Acción |
|--------|--------|
| `PAYMENT.CAPTURE.COMPLETED` | Actualizar status a `COMPLETED` |
| `PAYMENT.CAPTURE.DENIED` | Actualizar status a `FAILED` |
| `PAYMENT.CAPTURE.REFUNDED` | Actualizar status a `REFUNDED` |
| `CHECKOUT.ORDER.APPROVED` | Actualizar status a `APPROVED` |
| `CHECKOUT.ORDER.COMPLETED` | Actualizar status a `COMPLETED` |

### Lógica del Endpoint:

1. **Recibir el webhook body:**

```csharp
[HttpPost("webhook")]
public async Task<IActionResult> WebhookHandler([FromBody] PayPalWebhookEvent webhookEvent)
{
    // Log del evento
    _logger.LogInformation($"Webhook recibido: {webhookEvent.EventType}");
```

2. **Extraer Order ID del evento:**

```csharp
string orderID = null;

if (webhookEvent.EventType.Contains("CAPTURE"))
{
    orderID = webhookEvent.Resource.SupplementaryData?.RelatedIds?.OrderId;
}
else if (webhookEvent.EventType.Contains("ORDER"))
{
    orderID = webhookEvent.Resource.Id;
}
```

3. **Buscar pago en BD:**

```csharp
var payment = await _dbContext.PaypalPayments
    .FirstOrDefaultAsync(p => p.PaypalOrderId == orderID);

if (payment == null)
{
    _logger.LogWarning($"Pago no encontrado: {orderID}");
    return Ok(); // Responder 200 para que PayPal no reintente
}
```

4. **Actualizar status según evento:**

```csharp
switch (webhookEvent.EventType)
{
    case "PAYMENT.CAPTURE.COMPLETED":
        payment.Status = "COMPLETED";
        break;

    case "PAYMENT.CAPTURE.DENIED":
        payment.Status = "FAILED";
        break;

    case "PAYMENT.CAPTURE.REFUNDED":
        payment.Status = "REFUNDED";
        break;

    case "CHECKOUT.ORDER.APPROVED":
        payment.Status = "APPROVED";
        break;

    case "CHECKOUT.ORDER.COMPLETED":
        payment.Status = "COMPLETED";
        break;
}

payment.PaypalResponse = JsonConvert.SerializeObject(webhookEvent);
payment.UpdatedAt = DateTime.UtcNow;

await _dbContext.SaveChangesAsync();
```

5. **Responder siempre 200 OK:**

```csharp
return Ok();
```

**IMPORTANTE:** Siempre debes responder 200 OK, incluso si hay errores. Si no, PayPal reintentará el webhook múltiples veces.

### Webhook Event Schema:

```csharp
public class PayPalWebhookEvent
{
    [JsonProperty("id")]
    public string Id { get; set; }

    [JsonProperty("event_version")]
    public string EventVersion { get; set; }

    [JsonProperty("create_time")]
    public DateTime CreateTime { get; set; }

    [JsonProperty("resource_type")]
    public string ResourceType { get; set; }

    [JsonProperty("event_type")]
    public string EventType { get; set; }

    [JsonProperty("summary")]
    public string Summary { get; set; }

    [JsonProperty("resource")]
    public WebhookResource Resource { get; set; }
}

public class WebhookResource
{
    [JsonProperty("id")]
    public string Id { get; set; }

    [JsonProperty("status")]
    public string Status { get; set; }

    [JsonProperty("amount")]
    public PayPalAmount Amount { get; set; }

    [JsonProperty("supplementary_data")]
    public SupplementaryData SupplementaryData { get; set; }
}

public class SupplementaryData
{
    [JsonProperty("related_ids")]
    public RelatedIds RelatedIds { get; set; }
}

public class RelatedIds
{
    [JsonProperty("order_id")]
    public string OrderId { get; set; }
}

public class PayPalAmount
{
    [JsonProperty("currency_code")]
    public string CurrencyCode { get; set; }

    [JsonProperty("value")]
    public string Value { get; set; }
}
```

---

## 📧 5. NOTIFICACIONES POR EMAIL

### Requisitos:

Cuando se captura un pago exitosamente (endpoint `/capture`), debes enviar 2 emails:

1. **Al usuario** (usando `payer_email`)
2. **Al administrador** (email configurado en appsettings)

### Contenido del Email (HTML):

```html
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #0070ba; color: white; padding: 20px; text-align: center; }
    .content { background: #f9f9f9; padding: 20px; border: 1px solid #ddd; }
    .detail { margin: 10px 0; padding: 10px; background: white; border-left: 4px solid #0070ba; }
    .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>✅ Pago Recibido - UniqueMotors</h1>
    </div>
    <div class="content">
      <h2>Detalles del Pago</h2>

      <div class="detail">
        <strong>💳 Order ID:</strong> {paypal_order_id}
      </div>

      <div class="detail">
        <strong>💰 Monto:</strong> ${amount} {currency}
      </div>

      <div class="detail">
        <strong>📋 Contexto:</strong> {payment_context}
      </div>

      <div class="detail">
        <strong>👤 Pagador:</strong> {payer_name}
      </div>

      <div class="detail">
        <strong>📧 Email:</strong> {payer_email}
      </div>

      <div class="detail">
        <strong>🕐 Fecha:</strong> {fecha_actual}
      </div>
    </div>

    <div class="footer">
      <p>Este es un mensaje automático de UniqueMotors</p>
      <p>No responder a este correo</p>
    </div>
  </div>
</body>
</html>
```

### Configuración SMTP:

```json
// appsettings.json
{
  "EmailSettings": {
    "SmtpServer": "smtp.gmail.com",
    "SmtpPort": 587,
    "SenderEmail": "noreply@uniquemotors.mx",
    "SenderPassword": "app-password-aqui",
    "AdminEmail": "admin@uniquemotors.mx",
    "UseSsl": true
  }
}
```

---

## ⚙️ 6. CONFIGURACIÓN

### appsettings.json

```json
{
  "PayPal": {
    "Mode": "sandbox",
    "ClientId": "AYlNnDcYMdvji2xddFIh0LdaUG-85PCM8l945sTSFVDMB5octtzsnClnsIV4B9A5l4MgbZz_qL18ZqGY",
    "ClientSecret": "EB8EJVErD-6iAzR-VPvh_kwuGv4aoRtpQNBiBgmQIcvFCYGLa_MbP8xO0v_knkpvTT_syxRZGhxJ6NKg"
  },
  "ConnectionStrings": {
    "DefaultConnection": "tu-connection-string-aqui"
  },
  "EmailSettings": {
    "SmtpServer": "smtp.gmail.com",
    "SmtpPort": 587,
    "SenderEmail": "noreply@uniquemotors.mx",
    "SenderPassword": "app-password",
    "AdminEmail": "admin@uniquemotors.mx",
    "UseSsl": true
  }
}
```

---

## 📦 7. PAQUETES NUGET REQUERIDOS

Instala estos paquetes:

```bash
dotnet add package PayPal
dotnet add package Newtonsoft.Json
dotnet add package Microsoft.EntityFrameworkCore
dotnet add package Microsoft.EntityFrameworkCore.SqlServer
# O para PostgreSQL:
# dotnet add package Npgsql.EntityFrameworkCore.PostgreSQL
```

---

## 🔐 8. CORS

Configura CORS para permitir peticiones desde el frontend:

```csharp
// Program.cs o Startup.cs
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.WithOrigins(
            "https://web2.uniquemotors.mx",
            "http://localhost:5173"
        )
        .AllowAnyMethod()
        .AllowAnyHeader();
    });
});

// ...

app.UseCors("AllowFrontend");
```

---

## 🧪 9. TESTING

### Cuentas de Sandbox de PayPal:

- **Buyer (comprador):** sb-vcrd846927107@personal.example.com
- **Seller (vendedor):** Usa tu cuenta business sandbox

### URLs de prueba:

- **Crear orden:** `POST https://tu-api.com/api/paypal/orders`
- **Capturar:** `POST https://tu-api.com/api/paypal/orders/{orderID}/capture`
- **Webhook:** `POST https://tu-api.com/api/paypal/webhook`

### Probar webhook:

1. Ve a https://developer.paypal.com/dashboard
2. Apps & Credentials > Tu App > Webhooks
3. Configura webhook: `https://tu-api.com/api/paypal/webhook`
4. Usa "Simulate event" para probar

---

## 📊 10. ENDPOINTS SUMMARY

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/api/paypal/orders` | Crear orden de pago |
| POST | `/api/paypal/orders/{orderID}/capture` | Capturar pago aprobado |
| POST | `/api/paypal/webhook` | Recibir eventos de PayPal |

---

## 🚨 11. MANEJO DE ERRORES

Todos los endpoints deben manejar estos errores:

```csharp
try
{
    // lógica
}
catch (PayPalException ex)
{
    _logger.LogError($"Error de PayPal: {ex.Message}");
    return StatusCode(500, new { error = "Error comunicándose con PayPal" });
}
catch (DbUpdateException ex)
{
    _logger.LogError($"Error de BD: {ex.Message}");
    return StatusCode(500, new { error = "Error guardando en base de datos" });
}
catch (Exception ex)
{
    _logger.LogError($"Error inesperado: {ex.Message}");
    return StatusCode(500, new { error = "Error interno del servidor" });
}
```

---

## 📝 12. NOTAS IMPORTANTES

1. **Seguridad:** Nunca expongas el `ClientSecret` en logs o respuestas
2. **Logs:** Registra todos los eventos importantes para debugging
3. **Idempotencia:** Verifica que no se procese la misma orden dos veces
4. **Timeouts:** Configura timeouts apropiados para llamadas a PayPal
5. **Retry Logic:** PayPal puede fallar temporalmente, implementa reintentos
6. **Webhook Signature:** Considera verificar la firma del webhook para seguridad adicional

---

## 🎯 13. ENTREGABLES ESPERADOS

1. ✅ Tabla `paypal_payments` creada
2. ✅ Endpoint `POST /api/paypal/orders` funcionando
3. ✅ Endpoint `POST /api/paypal/orders/{orderID}/capture` funcionando
4. ✅ Endpoint `POST /api/paypal/webhook` funcionando
5. ✅ Sistema de envío de emails configurado
6. ✅ CORS configurado para frontend
7. ✅ Logs implementados

---

## 📚 14. REFERENCIAS

- PayPal .NET SDK: https://github.com/paypal/PayPal-NET-SDK
- PayPal REST API: https://developer.paypal.com/docs/api/overview/
- PayPal Webhooks: https://developer.paypal.com/docs/api-basics/notifications/webhooks/

---

**Desarrollado para UniqueMotors**
**Fecha:** Octubre 2025
**Versión:** 1.0

---

## ❓ PREGUNTAS FRECUENTES

**P: ¿Qué pasa si el webhook falla?**
R: PayPal reintentará el webhook varias veces. Siempre responde 200 OK.

**P: ¿Cómo pruebo sin pagar dinero real?**
R: Usa el modo Sandbox de PayPal con cuentas de prueba.

**P: ¿El frontend necesita cambios?**
R: No, el frontend ya está listo. Solo cambia la URL base de la API.

**P: ¿Qué base de datos usar?**
R: SQL Server o PostgreSQL, ambos funcionan con el esquema provisto.

---

Si necesitas aclaraciones sobre cualquier punto de esta especificación, pregúntame antes de implementar.

● 📩 Webhook de PayPal - Explicación Simple

  ¿Qué es?

  PayPal te envía un HTTP POST cuando pasa algo importante con un pago.

  ---
  🎯 Endpoint tuyo que escucha:

  POST https://tu-backend.com/api/paypal/webhook

  ---
  📦 Lo que PayPal te manda (JSON):

  {
    "event_type": "PAYMENT.CAPTURE.COMPLETED",
    "resource": {
      "id": "3ME46664SU696054K",
      "status": "COMPLETED",
      "amount": {
        "currency_code": "MXN",
        "value": "15000.00"
      },
      "supplementary_data": {
        "related_ids": {
          "order_id": "5O190127TN364715T"  ← ESTE ES EL ID QUE NECESITAS
        }
      }
    }
  }

  ---
  🔑 Campos importantes:

  1. event_type - Qué pasó:
    - PAYMENT.CAPTURE.COMPLETED → Pago exitoso
    - PAYMENT.CAPTURE.DENIED → Pago rechazado
    - PAYMENT.CAPTURE.REFUNDED → Te devolvieron el dinero
  2. resource.supplementary_data.related_ids.order_id - El Order ID que guardaste en tu BD

  ---
  ✅ Lo que tienes que hacer:

  1. Recibir el JSON
  2. Sacar el event_type
  3. Sacar el order_id
  4. Buscar ese order_id en tu tabla paypal_payments
  5. Actualizar el status según el event_type
  6. Responder 200 OK (SIEMPRE)

  ---
  💡 Ejemplo super simple:

  // PayPal te manda esto:
  {
    "event_type": "PAYMENT.CAPTURE.COMPLETED",
    "resource": {
      "supplementary_data": {
        "related_ids": {
          "order_id": "ABC123"
        }
      }
    }
  }

  // Tú haces:
  UPDATE paypal_payments
  SET status = 'COMPLETED'
  WHERE paypal_order_id = 'ABC123'

  ---
  Eso es todo. Simple ¿no? 🎯