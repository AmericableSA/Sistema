-- ===================================================
-- SISTEMA INTEGRADO DE CAJA Y FACTURACIÓN CON INVENTARIO
-- ===================================================

-- 1. CONTROL DE CAJA (CASH SESSIONS)
CREATE TABLE IF NOT EXISTS cash_sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL, -- El cajero que abre
    start_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    end_time DATETIME,
    
    start_amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00, -- Caja Base
    
    end_amount_system DECIMAL(10, 2), -- Lo que el sistema dice que debería haber
    end_amount_physical DECIMAL(10, 2), -- Lo que el cajero contó
    difference DECIMAL(10, 2), -- Sobrante o Faltante
    
    status ENUM('open', 'closed') DEFAULT 'open',
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 2. TRANSACCIONES MONETARIAS (INGRESOS)
CREATE TABLE IF NOT EXISTS transactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    session_id INT NOT NULL, -- Pertenece a una caja abierta
    client_id INT, -- Cliente que paga (puede ser NULL si es venta varia)
    
    amount DECIMAL(10, 2) NOT NULL,
    type ENUM('monthly_fee', 'installation', 'service', 'material_sale') NOT NULL,
    payment_method ENUM('cash', 'card', 'transfer') DEFAULT 'cash',
    
    description TEXT, -- Ej: "Mensualidad Enero + 20m Cable"
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (session_id) REFERENCES cash_sessions(id),
    FOREIGN KEY (client_id) REFERENCES clients(id)
);

-- 3. INVENTARIO (PRODUCTOS)
CREATE TABLE IF NOT EXISTS products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    sku VARCHAR(50) UNIQUE,
    price DECIMAL(10, 2) NOT NULL, -- Precio de Venta
    cost DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    stock INT NOT NULL DEFAULT 0,
    min_stock INT DEFAULT 5,
    is_active BOOLEAN DEFAULT TRUE
);

-- Seed Initial Products (Ejemplos)
INSERT IGNORE INTO products (name, sku, price, stock) VALUES 
('Cable Coaxial (metro)', 'CAB-001', 15.00, 1000),
('Conector RG6', 'CON-RG6', 10.00, 500),
('Router WiFi', 'RTR-001', 1200.00, 20),
('Control Remoto Universal', 'CTR-UNI', 250.00, 50);

-- 4. MOVIMIENTOS DE INVENTARIO (SALIDAS AUTOMÁTICAS)
CREATE TABLE IF NOT EXISTS inventory_moves (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL,
    transaction_id INT, -- Vínculo con la Factura (Para saber qué venta lo descontó)
    
    quantity INT NOT NULL, -- Negativo para salidas (-5), Positivo para entradas (+10)
    type ENUM('sale', 'purchase', 'adjustment') NOT NULL,
    
    date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id),
    FOREIGN KEY (transaction_id) REFERENCES transactions(id)
);
