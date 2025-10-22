import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient(
  'https://bntgkaikfktyyicmpert.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJudGdrYWlrZmt0eXlpY21wZXJ0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTA3NTgyNCwiZXhwIjoyMDc2NjUxODI0fQ.qGkxC1RurVjpgWofWmDLciIHWQX0fxa0niMGELuDOLw'
);

const { data, error } = await supabase
  .from('paypal_payments')
  .select('*')
  .eq('paypal_order_id', '9AT66255M6895930D')
  .single();

if (error) {
  console.error('ERROR:', error);
} else {
  console.log('\n=== REGISTRO EN SUPABASE ===\n');
  console.log('ID:', data.id);
  console.log('Created:', data.created_at);
  console.log('Updated:', data.updated_at);
  console.log('PayPal Order ID:', data.paypal_order_id);
  console.log('Status:', data.status);
  console.log('Amount:', data.amount, data.currency);
  console.log('Payer Name:', data.payer_name);
  console.log('Payer Email:', data.payer_email);
  console.log('Payer ID:', data.payer_id);
  console.log('Payment Context:', data.payment_context);
  console.log('Torre ID:', data.torre_id);
  console.log('Articulo Nombre:', data.articulo_nombre);
  console.log('Notification Sent:', data.notification_sent);
  console.log('Notification Error:', data.notification_error);
  console.log('\n=== VERIFICACION ===\n');
  console.log('✓ Status COMPLETED:', data.status === 'COMPLETED');
  console.log('✓ Datos del pagador guardados:', !!data.payer_email);
  console.log('✓ Monto correcto (10000):', data.amount === 10000);
  console.log('✓ Moneda MXN:', data.currency === 'MXN');
}
