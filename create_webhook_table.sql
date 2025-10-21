-- ====================================
-- TABLA PARA WEBHOOKS DE PAYPAL
-- ====================================
-- Ejecuta este SQL en Supabase para guardar todos los eventos

CREATE TABLE IF NOT EXISTS paypal_webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Datos del webhook
  event_id TEXT UNIQUE,
  event_type TEXT NOT NULL,
  resource_type TEXT,

  -- Datos del recurso
  paypal_order_id TEXT,

  -- Payload completo
  payload JSONB NOT NULL,

  -- Metadata
  processed BOOLEAN DEFAULT FALSE,
  processed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_webhook_event_id ON paypal_webhooks(event_id);
CREATE INDEX IF NOT EXISTS idx_webhook_event_type ON paypal_webhooks(event_type);
CREATE INDEX IF NOT EXISTS idx_webhook_paypal_order ON paypal_webhooks(paypal_order_id);
CREATE INDEX IF NOT EXISTS idx_webhook_created ON paypal_webhooks(created_at DESC);

-- Comentarios
COMMENT ON TABLE paypal_webhooks IS 'Registro de todos los webhooks recibidos de PayPal';
COMMENT ON COLUMN paypal_webhooks.event_type IS 'Tipo de evento: PAYMENT.CAPTURE.COMPLETED, PAYMENT.CAPTURE.REFUNDED, etc.';
COMMENT ON COLUMN paypal_webhooks.payload IS 'Payload completo del webhook en JSON';
COMMENT ON COLUMN paypal_webhooks.processed IS 'Si el webhook fue procesado correctamente';