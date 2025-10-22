// ============================================
// BACKEND NODE.JS PURO - PAGOS PAYPAL
// VERSION CON LOGS DETALLADOS
// ============================================
import 'dotenv/config';
import http from 'http';
import paypal from '@paypal/checkout-server-sdk';
import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';

console.log('[INIT] Iniciando servidor PayPal Backend');
console.log('[INIT] NODE_ENV:', process.env.NODE_ENV);
console.log('[INIT] PORT:', process.env.PORT || 3000);

// ============================================
// CONFIGURACIÓN DE PAYPAL
// ============================================
console.log('[INIT] Configurando PayPal SDK...');
console.log('[INIT] PayPal Client ID:', process.env.PAYPAL_CLIENT_ID ? 'SET' : 'MISSING');
console.log('[INIT] PayPal Secret:', process.env.PAYPAL_CLIENT_SECRET ? 'SET' : 'MISSING');

const environment = new paypal.core.SandboxEnvironment(
  process.env.PAYPAL_CLIENT_ID,
  process.env.PAYPAL_CLIENT_SECRET
);
const paypalClient = new paypal.core.PayPalHttpClient(environment);
console.log('[INIT] PayPal SDK configurado correctamente');

// ============================================
// CONFIGURACIÓN DE SUPABASE
// ============================================
console.log('[INIT] Configurando Supabase...');
console.log('[INIT] Supabase URL:', process.env.SUPABASE_URL ? 'SET' : 'MISSING');
console.log('[INIT] Supabase Service Key:', process.env.SUPABASE_SERVICE_KEY ? 'SET' : 'MISSING');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);
console.log('[INIT] Supabase configurado correctamente');

// ============================================
// CONFIGURACIÓN DE NODEMAILER (Gmail)
// COMENTADO - Render bloquea conexiones SMTP
// ============================================
// console.log('[INIT] Configurando Nodemailer...');
// console.log('[INIT] Email User:', process.env.EMAIL_USER);
// console.log('[INIT] Email Pass:', process.env.EMAIL_PASS ? 'SET' : 'MISSING');
// console.log('[INIT] Email Admin:', process.env.EMAIL_ADMIN);

// const transporter = nodemailer.createTransport({
//   host: 'smtp.gmail.com',
//   port: 465,
//   secure: true, // usar SSL
//   auth: {
//     user: process.env.EMAIL_USER,
//     pass: process.env.EMAIL_PASS
//   },
//   tls: {
//     rejectUnauthorized: true
//   }
// });
// console.log('[INIT] Nodemailer configurado correctamente');

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
        console.log('[GET_BODY] Error parsing JSON:', error.message);
        resolve({});
      }
    });
  });
}

// ============================================
// FUNCIÓN: Enviar email de notificación
// COMENTADO - Render bloquea conexiones SMTP
// Para habilitar emails, usar Railway o servicio SMTP alternativo
// ============================================
async function sendPaymentNotification(paymentData) {
  console.log('[EMAIL] Funcion de email deshabilitada (SMTP bloqueado en Render)');
  console.log('[EMAIL] Datos del pago guardados en Supabase:', paymentData.paypal_order_id);

  // Retornar success para no bloquear el flujo
  return { success: true, disabled: true };

  /* CODIGO ORIGINAL COMENTADO
  console.log('[EMAIL] Iniciando proceso de envio de emails');
  console.log('[EMAIL] Datos del pago:', JSON.stringify(paymentData, null, 2));

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
          <h1>Pago Recibido - UniqueMotors</h1>
        </div>
        <div class="content">
          <h2>Detalles del Pago</h2>

          <div class="detail">
            <strong>Order ID:</strong> ${paypal_order_id}
          </div>

          <div class="detail">
            <strong>Monto:</strong> $${amount.toFixed(2)} ${currency}
          </div>

          <div class="detail">
            <strong>Contexto:</strong> ${payment_context === 'guarantee' ? 'Depósito de Garantía' : 'Adjudicación'}
          </div>

          ${torre_id ? `<div class="detail"><strong>Torre:</strong> ${torre_id}</div>` : ''}
          ${articulo_nombre ? `<div class="detail"><strong>Artículo:</strong> ${articulo_nombre}</div>` : ''}

          <div class="detail">
            <strong>Pagador:</strong> ${payer_name || 'N/A'}
          </div>

          <div class="detail">
            <strong>Email:</strong> ${payer_email || 'N/A'}
          </div>

          <div class="detail">
            <strong>Fecha:</strong> ${new Date().toLocaleString('es-MX')}
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

  console.log('[EMAIL] Email destinatario usuario:', payer_email);
  console.log('[EMAIL] Email destinatario admin:', process.env.EMAIL_ADMIN);

  // Email al usuario
  const userMailOptions = {
    from: `UniqueMotors <${process.env.EMAIL_USER}>`,
    to: payer_email,
    subject: 'Confirmación de Pago - UniqueMotors',
    html: emailHTML
  };

  // Email al admin
  const adminMailOptions = {
    from: `UniqueMotors <${process.env.EMAIL_USER}>`,
    to: process.env.EMAIL_ADMIN,
    subject: `Nuevo Pago Recibido - $${amount.toFixed(2)} ${currency}`,
    html: emailHTML
  };

  try {
    console.log('[EMAIL] Intentando enviar email al usuario...');
    await transporter.sendMail(userMailOptions);
    console.log('[EMAIL] Email enviado al usuario correctamente');

    console.log('[EMAIL] Intentando enviar email al admin...');
    await transporter.sendMail(adminMailOptions);
    console.log('[EMAIL] Email enviado al admin correctamente');

    console.log('[EMAIL] Proceso de envio completado exitosamente');
    return { success: true };
  } catch (error) {
    console.error('[EMAIL] ERROR enviando emails:', error.message);
    console.error('[EMAIL] ERROR stack:', error.stack);
    console.error('[EMAIL] ERROR code:', error.code);
    console.error('[EMAIL] ERROR response:', error.response);
    return { success: false, error: error.message };
  }
  */
}

// ============================================
// SERVIDOR HTTP
// ============================================
const server = http.createServer(async (req, res) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.url}`);
  console.log(`[REQUEST] Origin: ${req.headers.origin || 'No origin header'}`);

  // CORS headers
  const allowedOrigins = [
    'https://web2.uniquemotors.mx',
    'https://www.paypal.com',
    'https://sandbox.paypal.com',
    'http://localhost:5173',
    'http://localhost:3000'
  ];

  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    console.log(`[CORS] Allowed origin: ${origin}`);
  } else if (process.env.NODE_ENV !== 'production') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    console.log('[CORS] Development mode - allowing all origins');
  } else {
    console.log(`[CORS] Origin not allowed: ${origin}`);
  }

  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Preflight CORS
  if (req.method === 'OPTIONS') {
    console.log('[CORS] Preflight request');
    res.writeHead(204);
    res.end();
    return;
  }

  // ============================================
  // ENDPOINT 1: Crear Orden de Pago
  // ============================================
  if (req.method === 'POST' && req.url === '/api/orders') {
    console.log('[CREATE_ORDER] Iniciando proceso');
    try {
      const body = await getBody(req);
      console.log('[CREATE_ORDER] Body recibido:', JSON.stringify(body));

      const { amount, currency = 'MXN', paymentContext = 'guarantee', torreID, articuloNombre } = body;
      console.log(`[CREATE_ORDER] Amount: ${amount}, Currency: ${currency}, Context: ${paymentContext}`);

      if (!amount || amount <= 0) {
        console.log('[CREATE_ORDER] ERROR - Monto invalido:', amount);
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Monto inválido' }));
        return;
      }

      console.log('[CREATE_ORDER] Preparando request a PayPal...');
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

      console.log('[CREATE_ORDER] Llamando a PayPal API...');
      const order = await paypalClient.execute(request);
      const orderID = order.result.id;
      console.log('[CREATE_ORDER] PayPal response - Order ID:', orderID);

      console.log('[CREATE_ORDER] Guardando en Supabase...');
      const insertData = {
        paypal_order_id: orderID,
        status: 'CREATED',
        amount: parseFloat(amount),
        currency: currency,
        payment_context: paymentContext,
        torre_id: torreID || null,
        articulo_nombre: articuloNombre || null,
        paypal_response: order.result
      };
      console.log('[CREATE_ORDER] Data to insert:', JSON.stringify(insertData, null, 2));

      const { data, error } = await supabase
        .from('paypal_payments')
        .insert([insertData])
        .select();

      if (error) {
        console.error('[CREATE_ORDER] ERROR Supabase:', error);
        console.error('[CREATE_ORDER] ERROR details:', JSON.stringify(error, null, 2));
      } else {
        console.log('[CREATE_ORDER] Supabase insert success - Record ID:', data?.[0]?.id);
      }

      console.log('[CREATE_ORDER] Enviando respuesta al cliente');
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ id: orderID }));
      console.log('[CREATE_ORDER] Proceso completado exitosamente');

    } catch (error) {
      console.error('[CREATE_ORDER] ERROR CRITICO:', error.message);
      console.error('[CREATE_ORDER] ERROR stack:', error.stack);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: error.message || 'Error al crear orden' }));
    }
    return;
  }

  // ============================================
  // ENDPOINT 2: Capturar Orden de Pago
  // ============================================
  if (req.method === 'POST' && req.url.match(/^\/api\/orders\/[A-Z0-9]+\/capture$/)) {
    const orderID = req.url.split('/')[3];
    console.log('[CAPTURE] Iniciando proceso de captura - Order ID:', orderID);

    try {
      console.log('[CAPTURE] Llamando a PayPal para capturar...');
      const request = new paypal.orders.OrdersCaptureRequest(orderID);
      request.requestBody({});

      const capture = await paypalClient.execute(request);
      const captureResult = capture.result;
      console.log('[CAPTURE] PayPal response - Status:', captureResult.status);

      const payer = captureResult.payer;
      const payerEmail = payer.email_address;
      const payerName = payer.name ? `${payer.name.given_name} ${payer.name.surname}` : null;
      const payerID = payer.payer_id;
      console.log('[CAPTURE] Payer - Email:', payerEmail, 'Name:', payerName);

      console.log('[CAPTURE] Buscando pago en Supabase...');
      const { data: existingPayment } = await supabase
        .from('paypal_payments')
        .select('*')
        .eq('paypal_order_id', orderID)
        .single();

      if (!existingPayment) {
        console.log('[CAPTURE] WARNING - Pago no encontrado en Supabase');
      } else {
        console.log('[CAPTURE] Pago encontrado - ID:', existingPayment.id);
      }

      console.log('[CAPTURE] Actualizando Supabase...');
      const updateData = {
        status: 'COMPLETED',
        payer_email: payerEmail,
        payer_name: payerName,
        payer_id: payerID,
        paypal_response: captureResult
      };
      console.log('[CAPTURE] Update data:', JSON.stringify(updateData, null, 2));

      const { data, error } = await supabase
        .from('paypal_payments')
        .update(updateData)
        .eq('paypal_order_id', orderID)
        .select();

      if (error) {
        console.error('[CAPTURE] ERROR updating Supabase:', error);
        console.error('[CAPTURE] ERROR details:', JSON.stringify(error, null, 2));
      } else {
        console.log('[CAPTURE] Supabase updated successfully');
      }

      // EMAILS DESHABILITADOS - Render bloquea SMTP
      // Para habilitar, migrar a Railway o usar servicio SMTP alternativo
      /*
      console.log('[CAPTURE] Iniciando envio de emails...');
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

      console.log('[CAPTURE] Email result:', emailResult);

      if (emailResult.success) {
        console.log('[CAPTURE] Actualizando flag de notificacion...');
        await supabase
          .from('paypal_payments')
          .update({ notification_sent: true })
          .eq('paypal_order_id', orderID);
        console.log('[CAPTURE] Notificacion marcada como enviada');
      } else {
        console.log('[CAPTURE] Guardando error de notificacion...');
        await supabase
          .from('paypal_payments')
          .update({ notification_error: emailResult.error })
          .eq('paypal_order_id', orderID);
        console.log('[CAPTURE] Error de notificacion guardado');
      }
      */

      console.log('[CAPTURE] Enviando respuesta al cliente');
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: true,
        order: captureResult,
        paymentRecord: data ? data[0] : null,
        emailSent: false // Emails deshabilitados
      }));
      console.log('[CAPTURE] Proceso completado exitosamente');

    } catch (error) {
      console.error('[CAPTURE] ERROR CRITICO:', error.message);
      console.error('[CAPTURE] ERROR stack:', error.stack);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: error.message || 'Error al capturar pago' }));
    }
    return;
  }

  // ============================================
  // ENDPOINT 3: Webhook de PayPal
  // ============================================
  if (req.method === 'POST' && req.url === '/api/webhook') {
    console.log('[WEBHOOK] Webhook recibido');
    try {
      const body = await getBody(req);
      console.log('[WEBHOOK] Event type:', body.event_type);
      console.log('[WEBHOOK] Full body:', JSON.stringify(body, null, 2));

      const eventType = body.event_type;
      const resource = body.resource;

      let orderID = null;

      if (resource) {
        if (resource.id && eventType.includes('CAPTURE')) {
          orderID = resource.supplementary_data?.related_ids?.order_id || null;
        } else if (resource.id && eventType.includes('ORDER')) {
          orderID = resource.id;
        }
      }

      console.log('[WEBHOOK] Order ID extracted:', orderID);

      if (orderID) {
        const { data: existingPayment } = await supabase
          .from('paypal_payments')
          .select('*')
          .eq('paypal_order_id', orderID)
          .single();

        if (existingPayment) {
          console.log('[WEBHOOK] Payment found in DB');

          let updateData = {
            paypal_response: body
          };

          switch (eventType) {
            case 'PAYMENT.CAPTURE.COMPLETED':
              updateData.status = 'COMPLETED';
              console.log('[WEBHOOK] Status -> COMPLETED');
              break;
            case 'PAYMENT.CAPTURE.DENIED':
              updateData.status = 'FAILED';
              console.log('[WEBHOOK] Status -> FAILED');
              break;
            case 'PAYMENT.CAPTURE.REFUNDED':
              updateData.status = 'REFUNDED';
              console.log('[WEBHOOK] Status -> REFUNDED');
              break;
            case 'CHECKOUT.ORDER.APPROVED':
              updateData.status = 'APPROVED';
              console.log('[WEBHOOK] Status -> APPROVED');
              break;
            case 'CHECKOUT.ORDER.COMPLETED':
              updateData.status = 'COMPLETED';
              console.log('[WEBHOOK] Status -> COMPLETED');
              break;
            default:
              console.log('[WEBHOOK] No specific action for event:', eventType);
          }

          const { error } = await supabase
            .from('paypal_payments')
            .update(updateData)
            .eq('paypal_order_id', orderID);

          if (error) {
            console.error('[WEBHOOK] ERROR updating Supabase:', error);
          } else {
            console.log('[WEBHOOK] Supabase updated successfully');
          }
        } else {
          console.log('[WEBHOOK] WARNING - Payment not found in DB');
        }
      } else {
        console.log('[WEBHOOK] WARNING - Could not extract Order ID');
      }

      res.writeHead(200);
      res.end();
    } catch (error) {
      console.error('[WEBHOOK] ERROR:', error.message);
      console.error('[WEBHOOK] ERROR stack:', error.stack);
      res.writeHead(200);
      res.end();
    }
    return;
  }

  // ============================================
  // Health Check
  // ============================================
  if (req.method === 'GET' && req.url === '/') {
    console.log('[HEALTH] Health check request');
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

  // Not found
  console.log('[404] Route not found:', req.url);
  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not Found');
});

// ============================================
// INICIAR SERVIDOR
// ============================================
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log('========================================');
  console.log('Backend PayPal - UniqueMotors');
  console.log(`Servidor corriendo en puerto ${PORT}`);
  console.log('========================================');
  console.log('Endpoints disponibles:');
  console.log(`  POST http://localhost:${PORT}/api/orders`);
  console.log(`  POST http://localhost:${PORT}/api/orders/:orderID/capture`);
  console.log(`  POST http://localhost:${PORT}/api/webhook`);
  console.log('========================================');
});