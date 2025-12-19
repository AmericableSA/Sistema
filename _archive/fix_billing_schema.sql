-- ==========================================
-- REPARACIÓN DE ESQUEMA DE PRODUCTOS
-- ==========================================

-- 1. Agregar columnas faltantes a la tabla 'products' existente
-- Usamos un bloque anónimo para evitar errores si ya existen
DROP PROCEDURE IF EXISTS upgrade_products_table;

DELIMITER $$
CREATE PROCEDURE upgrade_products_table()
BEGIN
    -- Agregar SKU si no existe
    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'products' AND COLUMN_NAME = 'sku') THEN
        ALTER TABLE products ADD COLUMN sku VARCHAR(50) UNIQUE AFTER name;
    END IF;

    -- Agregar COST si no existe
    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'products' AND COLUMN_NAME = 'cost') THEN
        ALTER TABLE products ADD COLUMN cost DECIMAL(10, 2) NOT NULL DEFAULT 0.00 AFTER price;
    END IF;

    -- Agregar STOCK le damos un default de 0 si existe pero para asegurar
    -- (Asumimos que stock ya existe, si no, el CREATE TABLE IF NOT EXISTS lo hubiera creado bien si la tabla no existiera)
    
    -- Agregar MIN_STOCK si no existe
    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'products' AND COLUMN_NAME = 'min_stock') THEN
        ALTER TABLE products ADD COLUMN min_stock INT DEFAULT 5;
    END IF;
    
    -- Agregar IS_ACTIVE si no existe
    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'products' AND COLUMN_NAME = 'is_active') THEN
        ALTER TABLE products ADD COLUMN is_active BOOLEAN DEFAULT TRUE;
    END IF;
END $$
DELIMITER ;

CALL upgrade_products_table();
DROP PROCEDURE upgrade_products_table;

-- 2. Ahora sí, insertar los productos de prueba
INSERT IGNORE INTO products (name, sku, price, cost, stock) VALUES 
('Cable Coaxial (metro)', 'CAB-001', 15.00, 8.00, 1000),
('Conector RG6', 'CON-RG6', 10.00, 3.00, 500),
('Router WiFi', 'RTR-001', 1200.00, 800.00, 20),
('Control Remoto Universal', 'CTR-UNI', 250.00, 150.00, 50);

-- 3. Crear la tabla de movimientos (si falló antes por otras razones)
CREATE TABLE IF NOT EXISTS inventory_moves (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL,
    transaction_id INT, 
    quantity INT NOT NULL, 
    type ENUM('sale', 'purchase', 'adjustment') NOT NULL,
    date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id),
    FOREIGN KEY (transaction_id) REFERENCES transactions(id)
);
