// ============================================
// BACKEND NODE.JS PURO - PAGOS PAYPAL
// ============================================
import 'dotenv/config';
import http from 'http';
import paypal from '@paypal/checkout-server-sdk';
import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';

// ============================================
// CONFIGURACIÓN DE PAYPAL
// ============================================
const environment = new paypal.core.SandboxEnvironment(
  process.env.PAYPAL_CLIENT_ID,
  process.env.PAYPAL_CLIENT_SECRET
);
const paypalClient = new paypal.core.PayPalHttpClient(environment);

// ============================================
// CONFIGURACIÓN DE SUPABASE
// ============================================
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// ============================================
// CONFIGURACIÓN DE NODEMAILER (Gmail)
// ============================================
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// ============================================
// FUNCIÓN: Leer cuerpo de petición
// ============================================
async function getBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (error) {
        resolve({});
      }
    });
  });
}

// ============================================
// FUNCIÓN: Enviar email de notificación
// ============================================
async function sendPaymentNotification(paymentData) {
  const { payer_email, payer_name, amount, currency, paypal_order_id, payment_context, torre_id, articulo_nombre } = paymentData;

  const emailHTML = `
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
            <strong>💳 Order ID:</strong> ${paypal_order_id}
          </div>

          <div class="detail">
            <strong>💰 Monto:</strong> $${amount.toFixed(2)} ${currency}
          </div>

          <div class="detail">
            <strong>📋 Contexto:</strong> ${payment_context === 'guarantee' ? 'Depósito de Garantía' : 'Adjudicación'}
          </div>

          ${torre_id ? `<div class="detail"><strong>🏢 Torre:</strong> ${torre_id}</div>` : ''}
          ${articulo_nombre ? `<div class="detail"><strong>🚗 Artículo:</strong> ${articulo_nombre}</div>` : ''}

          <div class="detail">
            <strong>👤 Pagador:</strong> ${payer_name || 'N/A'}
          </div>

          <div class="detail">
            <strong>📧 Email:</strong> ${payer_email || 'N/A'}
          </div>

          <div class="detail">
            <strong>🕐 Fecha:</strong> ${new Date().toLocaleString('es-MX')}
          </div>
        </div>

        <div class="footer">
          <p>Este es un mensaje automático de UniqueMotors</p>
          <p>No responder a este correo</p>
        </div>
      </div>
    </body>
    </html>
  `;

  // Email al usuario
  const userMailOptions = {
    from: `UniqueMotors <${process.env.EMAIL_USER}>`,
    to: payer_email,
    subject: '✅ Confirmación de Pago - UniqueMotors',
    html: emailHTML
  };

  // Email al admin
  const adminMailOptions = {
    from: `UniqueMotors <${process.env.EMAIL_USER}>`,
    to: process.env.EMAIL_ADMIN,
    subject: `🔔 Nuevo Pago Recibido - $${amount.toFixed(2)} ${currency}`,
    html: emailHTML
  };

  try {
    await Promise.all([
      transporter.sendMail(userMailOptions),
      transporter.sendMail(adminMailOptions)
    ]);
    console.log('✅ Emails enviados correctamente');
    return { success: true };
  } catch (error) {
    console.error('❌ Error enviando emails:', error);
    return { success: false, error: error.message };
  }
}

// ============================================
// SERVIDOR HTTP
// ============================================
const server = http.createServer(async (req, res) => {
  // CORS headers - Configuración para producción
  const allowedOrigins = process.env.NODE_ENV === 'production'
    ? [
        'https://web2.uniquemotors.mx',
        'https://www.paypal.com',
        'https://sandbox.paypal.com'
      ]
    : ['http://localhost:5173', 'http://localhost:3000'];

  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else if (process.env.NODE_ENV !== 'production') {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }

  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Preflight CORS
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // ============================================
  // ENDPOINT 1: Crear Orden de Pago
  // POST /api/orders
  // ============================================
  if (req.method === 'POST' && req.url === '/api/orders') {
    try {
      const body = await getBody(req);
      const { amount, currency = 'MXN', paymentContext = 'guarantee', torreID, articuloNombre } = body;

      // Validar datos
      if (!amount || amount <= 0) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Monto inválido' }));
        return;
      }

      // Crear orden en PayPal
      const request = new paypal.orders.OrdersCreateRequest();
      request.prefer('return=representation');
      request.requestBody({
        intent: 'CAPTURE',
        purchase_units: [{
          amount: {
            currency_code: currency,
            value: amount.toFixed(2)
          },
          description: paymentContext === 'adjudicacion' && torreID
            ? `Pago Adjudicación Torre ${torreID} - ${articuloNombre || 'UniqueMotors'}`
            : 'Depósito de garantía - UniqueMotors',
          custom_id: paymentContext === 'adjudicacion' && torreID
            ? `ADJ-${torreID}`
            : undefined
        }],
        application_context: {
          brand_name: 'UniqueMotors',
          locale: 'es-MX',
          user_action: 'PAY_NOW'
        }
      });

      const order = await paypalClient.execute(request);
      const orderID = order.result.id;

      // Guardar en Supabase
      const { data, error } = await supabase
        .from('paypal_payments')
        .insert([{
          paypal_order_id: orderID,
          status: 'CREATED',
          amount: parseFloat(amount),
          currency: currency,
          payment_context: paymentContext,
          torre_id: torreID || null,
          articulo_nombre: articuloNombre || null,
          paypal_response: order.result
        }])
        .select();

      if (error) {
        console.error('❌ Error guardando en Supabase:', error);
      } else {
        console.log('✅ Orden creada y guardada:', orderID);
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ id: orderID }));

    } catch (error) {
      console.error('❌ Error creando orden:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: error.message || 'Error al crear orden' }));
    }
    return;
  }

  // ============================================
  // ENDPOINT 2: Capturar Orden de Pago
  // POST /api/orders/:orderID/capture
  // ============================================
  if (req.method === 'POST' && req.url.match(/^\/api\/orders\/[A-Z0-9]+\/capture$/)) {
    try {
      const orderID = req.url.split('/')[3];

      // Capturar orden en PayPal
      const request = new paypal.orders.OrdersCaptureRequest(orderID);
      request.requestBody({});

      const capture = await paypalClient.execute(request);
      const captureResult = capture.result;

      // Extraer datos del pagador
      const payer = captureResult.payer;
      const payerEmail = payer.email_address;
      const payerName = payer.name ? `${payer.name.given_name} ${payer.name.surname}` : null;
      const payerID = payer.payer_id;

      // Obtener datos del pago desde Supabase
      const { data: existingPayment } = await supabase
        .from('paypal_payments')
        .select('*')
        .eq('paypal_order_id', orderID)
        .single();

      // Actualizar en Supabase
      const { data, error } = await supabase
        .from('paypal_payments')
        .update({
          status: 'COMPLETED',
          payer_email: payerEmail,
          payer_name: payerName,
          payer_id: payerID,
          paypal_response: captureResult
        })
        .eq('paypal_order_id', orderID)
        .select();

      if (error) {
        console.error('❌ Error actualizando Supabase:', error);
      } else {
        console.log('✅ Pago capturado y actualizado:', orderID);
      }

      // Enviar emails de notificación
      const emailResult = await sendPaymentNotification({
        payer_email: payerEmail,
        payer_name: payerName,
        amount: existingPayment?.amount || 0,
        currency: existingPayment?.currency || 'MXN',
        paypal_order_id: orderID,
        payment_context: existingPayment?.payment_context,
        torre_id: existingPayment?.torre_id,
        articulo_nombre: existingPayment?.articulo_nombre
      });

      // Actualizar estado de notificación
      if (emailResult.success) {
        await supabase
          .from('paypal_payments')
          .update({ notification_sent: true })
          .eq('paypal_order_id', orderID);
      } else {
        await supabase
          .from('paypal_payments')
          .update({ notification_error: emailResult.error })
          .eq('paypal_order_id', orderID);
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: true,
        order: captureResult,
        paymentRecord: data ? data[0] : null,
        emailSent: emailResult.success
      }));

    } catch (error) {
      console.error('❌ Error capturando orden:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: error.message || 'Error al capturar pago' }));
    }
    return;
  }

  // ============================================
  // ENDPOINT 3: Webhook de PayPal
  // POST /api/webhook
  // ============================================
  if (req.method === 'POST' && req.url === '/api/webhook') {
    try {
      const body = await getBody(req);

      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('📩 Webhook recibido de PayPal');
      console.log('Tipo de evento:', body.event_type);
      console.log('Datos:', JSON.stringify(body, null, 2));
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

      // Guardar evento en Supabase (opcional)
      if (body.resource && body.resource.id) {
        await supabase
          .from('paypal_payments')
          .update({
            paypal_response: body
          })
          .eq('paypal_order_id', body.resource.id);
      }

      res.writeHead(200);
      res.end();
    } catch (error) {
      console.error('❌ Error procesando webhook:', error);
      res.writeHead(200);
      res.end();
    }
    return;
  }

  // ============================================
  // ENDPOINT 4: Health Check
  // GET /
  // ============================================
  if (req.method === 'GET' && req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'ok',
      service: 'PayPal Backend - UniqueMotors',
      endpoints: {
        createOrder: 'POST /api/orders',
        captureOrder: 'POST /api/orders/:orderID/capture',
        webhook: 'POST /api/webhook'
      }
    }));
    return;
  }

  // ============================================
  // Ruta no encontrada
  // ============================================
  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not Found');
});

// ============================================
// INICIAR SERVIDOR
// ============================================
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🚀 Backend PayPal - UniqueMotors');
  console.log(`📍 Servidor corriendo en http://localhost:${PORT}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Endpoints disponibles:');
  console.log(`  POST http://localhost:${PORT}/api/orders`);
  console.log(`  POST http://localhost:${PORT}/api/orders/:orderID/capture`);
  console.log(`  POST http://localhost:${PORT}/api/webhook`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
});