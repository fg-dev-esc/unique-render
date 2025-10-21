// ============================================
// SCRIPT PARA VER PAGOS EN SUPABASE
// ============================================
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function checkPayments() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 Consultando pagos en Supabase...');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const { data, error } = await supabase
    .from('paypal_payments')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('❌ Error:', error);
    return;
  }

  if (!data || data.length === 0) {
    console.log('⚠️ No hay pagos registrados aún');
    return;
  }

  console.log(`✅ Total de pagos: ${data.length}\n`);

  data.forEach((payment, index) => {
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`📦 Pago #${index + 1}`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`🆔 ID Base de Datos: ${payment.id}`);
    console.log(`💳 PayPal Order ID: ${payment.paypal_order_id}`);
    console.log(`📊 Estado: ${payment.status}`);
    console.log(`💰 Monto: $${payment.amount} ${payment.currency}`);
    console.log(`👤 Pagador: ${payment.payer_name || 'N/A'}`);
    console.log(`📧 Email: ${payment.payer_email || 'N/A'}`);
    console.log(`🏷️ Contexto: ${payment.payment_context || 'N/A'}`);
    console.log(`🏢 Torre: ${payment.torre_id || 'N/A'}`);
    console.log(`🚗 Artículo: ${payment.articulo_nombre || 'N/A'}`);
    console.log(`📬 Email enviado: ${payment.notification_sent ? '✅ Sí' : '❌ No'}`);
    console.log(`📅 Creado: ${new Date(payment.created_at).toLocaleString('es-MX')}`);
    console.log(`📅 Actualizado: ${new Date(payment.updated_at).toLocaleString('es-MX')}`);

    if (payment.paypal_response) {
      console.log(`\n📦 Respuesta completa de PayPal:`);
      console.log(JSON.stringify(payment.paypal_response, null, 2));
    }

    console.log('\n');
  });
}

checkPayments();
