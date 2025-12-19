-- ==========================================
-- BILLING UPGRADE V3: TASA DE CAMBIO Y REFERENCIAS
-- ==========================================

DROP PROCEDURE IF EXISTS upgrade_billing_v3;
DELIMITER $$
CREATE PROCEDURE upgrade_billing_v3()
BEGIN
    -- 1. Agregar Tasa de Cambio a la Sesión (Caja)
    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'cash_sessions' AND COLUMN_NAME = 'exchange_rate') THEN
        ALTER TABLE cash_sessions ADD COLUMN exchange_rate DECIMAL(10, 4) DEFAULT 36.6243;
    END IF;

    -- 2. Agregar Tasa y Referencia a la Transacción
    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'transactions' AND COLUMN_NAME = 'exchange_rate') THEN
        ALTER TABLE transactions ADD COLUMN exchange_rate DECIMAL(10, 4);
    END IF;

    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'transactions' AND COLUMN_NAME = 'reference_id') THEN
        ALTER TABLE transactions ADD COLUMN reference_id VARCHAR(100);
    END IF;
    
    -- 3. Asegurar que el ENUM de payment_method soporte 'card'
    -- Note: MySQL enums are strict. We modify it to be safe.
    ALTER TABLE transactions MODIFY COLUMN payment_method VARCHAR(50); 
    
END $$
DELIMITER ;
CALL upgrade_billing_v3();
DROP PROCEDURE upgrade_billing_v3;
