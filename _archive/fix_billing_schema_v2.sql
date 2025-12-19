-- ==========================================
-- REPARACIÓN DE ESQUEMA DE PRODUCTOS (V2 - ROBUSTO)
-- ==========================================

DROP PROCEDURE IF EXISTS upgrade_products_table_v2;

DELIMITER $$
CREATE PROCEDURE upgrade_products_table_v2()
BEGIN
    -- 1. Asegurar columna NAME
    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'products' AND COLUMN_NAME = 'name') THEN
        ALTER TABLE products ADD COLUMN name VARCHAR(100) NOT NULL;
    END IF;

    -- 2. Asegurar columna SKU
    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'products' AND COLUMN_NAME = 'sku') THEN
        ALTER TABLE products ADD COLUMN sku VARCHAR(50) UNIQUE;
    END IF;

    -- 3. Asegurar columna PRICE (Causante del error anterior)
    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'products' AND COLUMN_NAME = 'price') THEN
        ALTER TABLE products ADD COLUMN price DECIMAL(10, 2) NOT NULL DEFAULT 0.00;
    END IF;

    -- 4. Asegurar columna COST
    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'products' AND COLUMN_NAME = 'cost') THEN
        ALTER TABLE products ADD COLUMN cost DECIMAL(10, 2) NOT NULL DEFAULT 0.00;
    END IF;

    -- 5. Asegurar columna STOCK
    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'products' AND COLUMN_NAME = 'stock') THEN
        ALTER TABLE products ADD COLUMN stock INT NOT NULL DEFAULT 0;
    END IF;

    -- 6. Asegurar columna MIN_STOCK
    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'products' AND COLUMN_NAME = 'min_stock') THEN
        ALTER TABLE products ADD COLUMN min_stock INT DEFAULT 5;
    END IF;
    
    -- 7. Asegurar columna IS_ACTIVE
    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'products' AND COLUMN_NAME = 'is_active') THEN
        ALTER TABLE products ADD COLUMN is_active BOOLEAN DEFAULT TRUE;
    END IF;
END $$
DELIMITER ;

CALL upgrade_products_table_v2();
DROP PROCEDURE upgrade_products_table_v2;

-- 2. Insertar datos de prueba (Ignorando si ya existen por SKU o ID)
INSERT IGNORE INTO products (name, sku, price, cost, stock) VALUES 
('Cable Coaxial (metro)', 'CAB-001', 15.00, 8.00, 1000),
('Conector RG6', 'CON-RG6', 10.00, 3.00, 500),
('Router WiFi', 'RTR-001', 1200.00, 800.00, 20),
('Control Remoto Universal', 'CTR-UNI', 250.00, 150.00, 50);

-- 3. Asegurar tabla de movimientos
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
