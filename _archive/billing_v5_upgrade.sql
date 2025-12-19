-- ==========================================
-- BILLING UPGRADE V5: MORA AUTOMÁTICA & CONFIGURACIÓN
-- ==========================================

DROP PROCEDURE IF EXISTS upgrade_billing_v5;
DELIMITER $$
CREATE PROCEDURE upgrade_billing_v5()
BEGIN
    -- 1. Tabla de Configuración Global (Mora, Tasa, etc.)
    CREATE TABLE IF NOT EXISTS system_settings (
        setting_key VARCHAR(50) PRIMARY KEY,
        setting_value VARCHAR(255) NOT NULL,
        description VARCHAR(255)
    );

    -- Insertar valores por defecto si no existen
    INSERT IGNORE INTO system_settings (setting_key, setting_value, description) VALUES 
    ('mora_fee', '50.00', 'Cargo por Mora (C$)'),
    ('exchange_rate', '36.6243', 'Tasa de Cambio Oficial'),
    ('cutoff_day', '15', 'Día del mes para corte automático');

    -- 2. Columnas de Deuda en Clientes
    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'clients' AND COLUMN_NAME = 'due_months') THEN
        ALTER TABLE clients ADD COLUMN due_months INT DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'clients' AND COLUMN_NAME = 'has_mora') THEN
        ALTER TABLE clients ADD COLUMN has_mora BOOLEAN DEFAULT FALSE;
    END IF;

    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'clients' AND COLUMN_NAME = 'mora_balance') THEN
        ALTER TABLE clients ADD COLUMN mora_balance DECIMAL(10, 2) DEFAULT 0.00;
    END IF;

    -- 3. Asegurar columnas de auditoría en transactions (si faltan)
    -- Ya se agregaron en v3, pero verificamos
    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'transactions' AND COLUMN_NAME = 'details_json') THEN
        ALTER TABLE transactions ADD COLUMN details_json JSON; -- Para guardar qué meses pagó
    END IF;

END $$
DELIMITER ;
CALL upgrade_billing_v5();
DROP PROCEDURE upgrade_billing_v5;
