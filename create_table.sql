-- ====================================
-- TABLA PARA PAGOS DE PAYPAL
-- ====================================
-- Ejecuta este SQL en Supabase SQL Editor
-- (Dashboard > SQL Editor > New Query)

CREATE TABLE IF NOT EXISTS paypal_payments (
  -- Identificador único
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Datos de PayPal
  paypal_order_id TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('CREATED', 'APPROVED', 'COMPLETED', 'FAILED', 'CANCELLED')),

  -- Datos del pago
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'MXN',

  -- Datos del pagador
  payer_email TEXT,
  payer_name TEXT,
  payer_id TEXT,

  -- Contexto del pago
  payment_context TEXT,  -- 'guarantee' o 'adjudicacion'
  torre_id TEXT,
  articulo_nombre TEXT,

  -- Metadata
  paypal_response JSONB,  -- Respuesta completa de PayPal
  notification_sent BOOLEAN DEFAULT FALSE,
  notification_error TEXT
);

-- Índices para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_paypal_order_id ON paypal_payments(paypal_order_id);
CREATE INDEX IF NOT EXISTS idx_status ON paypal_payments(status);
CREATE INDEX IF NOT EXISTS idx_created_at ON paypal_payments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payer_email ON paypal_payments(payer_email);

-- Trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_paypal_payments_updated_at BEFORE UPDATE ON paypal_payments
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Comentarios para documentación
COMMENT ON TABLE paypal_payments IS 'Registro de todos los pagos realizados con PayPal';
COMMENT ON COLUMN paypal_payments.paypal_order_id IS 'ID de la orden en PayPal';
COMMENT ON COLUMN paypal_payments.status IS 'Estado de la transacción: CREATED, APPROVED, COMPLETED, FAILED, CANCELLED';
COMMENT ON COLUMN paypal_payments.payment_context IS 'Contexto del pago: guarantee (depósito garantía) o adjudicacion';
COMMENT ON COLUMN paypal_payments.paypal_response IS 'Respuesta JSON completa de PayPal para debugging';

-- Deshabilitar RLS (Row Level Security) para acceso desde backend
ALTER TABLE paypal_payments DISABLE ROW LEVEL SECURITY;
