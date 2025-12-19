-- ==========================================
-- BILLING UPGRADE V4: MOVIMIENTOS Y CIERRE ESTRICTO
-- ==========================================

DROP PROCEDURE IF EXISTS upgrade_billing_v4;
DELIMITER $$
CREATE PROCEDURE upgrade_billing_v4()
BEGIN
    -- 1. Tabla de Movimientos de Caja (Entradas/Salidas Manuales)
    CREATE TABLE IF NOT EXISTS cash_movements (
        id INT AUTO_INCREMENT PRIMARY KEY,
        session_id INT NOT NULL,
        type ENUM('IN', 'OUT') NOT NULL, -- IN = Ingreso, OUT = Egreso
        amount DECIMAL(10, 2) NOT NULL,
        description VARCHAR(255),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (session_id) REFERENCES cash_sessions(id)
    );

    -- 2. Agregar Nota de Cierre a la Sesión (Para justificar faltantes/sobrantes)
    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'cash_sessions' AND COLUMN_NAME = 'closing_note') THEN
        ALTER TABLE cash_sessions ADD COLUMN closing_note TEXT;
    END IF;

    -- 3. Asegurar columnas de auditoría en session (si no existen)
    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'cash_sessions' AND COLUMN_NAME = 'difference') THEN
        ALTER TABLE cash_sessions ADD COLUMN difference DECIMAL(10, 2) DEFAULT 0;
    END IF;
    
END $$
DELIMITER ;
CALL upgrade_billing_v4();
DROP PROCEDURE upgrade_billing_v4;
