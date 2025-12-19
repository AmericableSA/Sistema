-- Database Schema for Ameri-Cable System (Full v2)
-- Modules: Users, Zones, Plans, Clients, Billing, Operations (Service Orders), Inventory

CREATE DATABASE IF NOT EXISTS americable;
USE americable;

-- ==========================================
-- 1. SECURITY & ACCESS CONTROL
-- ==========================================
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('admin', 'cajero', 'oficina', 'technician', 'warehouse', 'collector') DEFAULT 'oficina',
    full_name VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE
);

-- ==========================================
-- 2. ZONES & GEOGRAPHY (Tarifas y Barrios)
-- ==========================================
CREATE TABLE IF NOT EXISTS cities (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE -- Ej: Juigalpa
);

CREATE TABLE IF NOT EXISTS neighborhoods (
    id INT AUTO_INCREMENT PRIMARY KEY,
    city_id INT NOT NULL,
    name VARCHAR(100) NOT NULL, -- Ej: Che Guevara, San Antonio
    zone_code VARCHAR(20), -- Código para agrupar cobros
    FOREIGN KEY (city_id) REFERENCES cities(id) ON DELETE CASCADE
);

-- ==========================================
-- 3. SERVICES & PLANS
-- ==========================================
CREATE TABLE IF NOT EXISTS service_plans (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL, -- Ej: TV Basico, Internet 10MB
    type ENUM('TV', 'INTERNET', 'COMBO') NOT NULL,
    base_price DECIMAL(10, 2) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE
);

-- ==========================================
-- 4. CLIENTS (CRM)
-- ==========================================
CREATE TABLE IF NOT EXISTS clients (
    id INT AUTO_INCREMENT PRIMARY KEY,
    contract_number VARCHAR(20) UNIQUE NOT NULL, -- "ITEM" del Excel
    identity_document VARCHAR(20) UNIQUE, -- Cédula
    full_name VARCHAR(150) NOT NULL, -- "Nombre mostrado"
    
    phone_primary VARCHAR(20),
    phone_secondary VARCHAR(20),
    email VARCHAR(100),
    
    -- Dirección y Ubicación
    city_id INT,
    neighborhood_id INT, -- "Barrio"
    address_street VARCHAR(255), -- "Calle"
    address_reference TEXT,
    
    -- Estado Administrativo
    status ENUM('active', 'suspended', 'disconnected', 'pending_install') DEFAULT 'pending_install',
    balance DECIMAL(10, 2) DEFAULT 0.00, -- Saldo (Mora si es positivo)
    
    -- Fechas de Control (Excel)
    last_paid_month DATE, -- "Mes Pagado" (Primer día del mes pagado, ej: 2025-01-01)
    cutoff_date DATE, -- "Fecha de Corte"
    reconnection_date DATE, -- "Fecha de Reconexión"
    installation_date DATE,
    
    preferred_collector_id INT, -- "Colector"
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (city_id) REFERENCES cities(id) ON DELETE SET NULL,
    FOREIGN KEY (neighborhood_id) REFERENCES neighborhoods(id) ON DELETE SET NULL,
    FOREIGN KEY (preferred_collector_id) REFERENCES users(id) ON DELETE SET NULL
);

-- ==========================================
-- 5. BILLING (Cobros y Caja)
-- ==========================================
CREATE TABLE IF NOT EXISTS client_subscriptions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    client_id INT NOT NULL,
    plan_id INT NOT NULL,
    start_date DATE DEFAULT (CURRENT_DATE),
    status ENUM('active', 'inactive') DEFAULT 'active',
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
    FOREIGN KEY (plan_id) REFERENCES service_plans(id)
);

CREATE TABLE IF NOT EXISTS payments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    client_id INT NOT NULL,
    received_by_user_id INT NOT NULL, -- Cajero/Colector que recibe el dinero
    amount DECIMAL(10, 2) NOT NULL,
    payment_method ENUM('cash', 'transfer', 'card') DEFAULT 'cash',
    paid_for_month DATE, -- Correspondiente a qué mes (Ej: 2025-02-01)
    transaction_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
    FOREIGN KEY (received_by_user_id) REFERENCES users(id)
);

-- ==========================================
-- 6. OPERATIONS (Órdenes de Servicio)
-- ==========================================
CREATE TABLE IF NOT EXISTS service_orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    client_id INT NOT NULL,
    type ENUM('INSTALLATION', 'RECONNECTION', 'CUTOFF', 'TRANSFER', 'REMOVAL', 'REPAIR') NOT NULL,
    status ENUM('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED') DEFAULT 'PENDING',
    
    created_by_user_id INT, -- Quien abrió la orden (Oficina)
    assigned_tech_id INT, -- Técnico responsable
    
    scheduled_date DATETIME, -- Cuándo se debe hacer
    completion_date DATETIME, -- Cuándo se hizo
    
    technician_notes TEXT, -- Reporte del técnico
    material_cost DECIMAL(10, 2) DEFAULT 0.00, 
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
    FOREIGN KEY (assigned_tech_id) REFERENCES users(id) ON DELETE SET NULL
);

-- ==========================================
-- 7. INCIDENTS (Averías)
-- ==========================================
CREATE TABLE IF NOT EXISTS incidents (
    id INT AUTO_INCREMENT PRIMARY KEY,
    client_id INT NOT NULL,
    reported_by VARCHAR(100), -- Puede ser el cliente o un vecino
    description TEXT NOT NULL,
    priority ENUM('LOW', 'MEDIUM', 'HIGH', 'URGENT') DEFAULT 'MEDIUM',
    status ENUM('OPEN', 'ASSIGNED', 'RESOLVED', 'CLOSED') DEFAULT 'OPEN',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
);

-- ==========================================
-- 8. INVENTORY (Materiales)
-- ==========================================
CREATE TABLE IF NOT EXISTS categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT
);

CREATE TABLE IF NOT EXISTS providers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    contact_name VARCHAR(100),
    phone VARCHAR(20)
);

CREATE TABLE IF NOT EXISTS products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sku VARCHAR(50) UNIQUE, 
    name VARCHAR(100) NOT NULL,
    category_id INT,
    provider_id INT, 
    current_stock INT DEFAULT 0,
    min_stock_alert INT DEFAULT 5,
    unit_cost DECIMAL(10, 2) DEFAULT 0.00,
    selling_price DECIMAL(10, 2), 
    image_url VARCHAR(255),
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
    FOREIGN KEY (provider_id) REFERENCES providers(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS inventory_transactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL,
    user_id INT, 
    service_order_id INT, -- Material usado en una orden específica
    transaction_type ENUM('IN', 'OUT', 'EDIT') NOT NULL, 
    quantity INT NOT NULL,
    unit_price DECIMAL(10, 2) NOT NULL,
    reason VARCHAR(255), 
    transaction_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (service_order_id) REFERENCES service_orders(id) ON DELETE SET NULL
);
