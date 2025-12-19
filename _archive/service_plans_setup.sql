-- ==========================================
-- SETUP DE PLANES DE SERVICIO Y MEJORAS DE FACTURACIÓN
-- ==========================================

-- 1. Agregar justificación a transacciones (para cambios de precio)
-- Usamos procedimiento almacenado para ser idempotentes
DROP PROCEDURE IF EXISTS upgrade_transactions_table;
DELIMITER $$
CREATE PROCEDURE upgrade_transactions_table()
BEGIN
    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'transactions' AND COLUMN_NAME = 'justification') THEN
        ALTER TABLE transactions ADD COLUMN justification TEXT;
    END IF;
    
    -- Agregar columna para saber si fue cobrado con un plan específico
    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'transactions' AND COLUMN_NAME = 'service_plan_id') THEN
        ALTER TABLE transactions ADD COLUMN service_plan_id INT;
    END IF;
END $$
DELIMITER ;
CALL upgrade_transactions_table();
DROP PROCEDURE upgrade_transactions_table;

-- 2. Tabla de Planes de Servicio (Combos)
CREATE TABLE IF NOT EXISTS service_plans (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    base_price DECIMAL(10, 2) NOT NULL DEFAULT 0.00, -- Precio sugerido del combo
    is_active BOOLEAN DEFAULT TRUE
);

-- 3. Items del Plan (Qué materiales incluye)
CREATE TABLE IF NOT EXISTS service_plan_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    service_plan_id INT NOT NULL,
    product_id INT NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    
    FOREIGN KEY (service_plan_id) REFERENCES service_plans(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id)
);

-- 4. Seed Data (Ejemplo: Instalación Básica)
INSERT IGNORE INTO service_plans (name, description, base_price) VALUES 
('Instalación Básica Fibra', 'Incluye Router y 100m de cable', 1500.00),
('Mantenimiento Rutina', 'Cambio de conectores', 300.00);

-- Insert items for the plans (assuming product IDs from previous seed)
-- Router (ID 3), Cable (ID 1), Connectors (ID 2). Adjust IDs if necessary in prod.
-- We use subqueries to be safe
INSERT INTO service_plan_items (service_plan_id, product_id, quantity)
SELECT sp.id, p.id, 1
FROM service_plans sp, products p
WHERE sp.name = 'Instalación Básica Fibra' AND p.sku = 'RTR-001'
LIMIT 1;

INSERT INTO service_plan_items (service_plan_id, product_id, quantity)
SELECT sp.id, p.id, 100
FROM service_plans sp, products p
WHERE sp.name = 'Instalación Básica Fibra' AND p.sku = 'CAB-001'
LIMIT 1;
