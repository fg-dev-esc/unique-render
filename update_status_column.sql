-- ====================================
-- ACTUALIZAR COLUMNA STATUS
-- ====================================
-- Agregar nuevos estados posibles al CHECK constraint

-- Primero, eliminar el constraint anterior
ALTER TABLE paypal_payments
DROP CONSTRAINT IF EXISTS paypal_payments_status_check;

-- Agregar el nuevo constraint con más estados
ALTER TABLE paypal_payments
ADD CONSTRAINT paypal_payments_status_check
CHECK (status IN ('CREATED', 'APPROVED', 'COMPLETED', 'FAILED', 'CANCELLED', 'REFUNDED'));

-- Comentario actualizado
COMMENT ON COLUMN paypal_payments.status IS 'Estado de la transacción: CREATED, APPROVED, COMPLETED, FAILED, CANCELLED, REFUNDED';
