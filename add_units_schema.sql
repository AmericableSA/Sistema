-- Create table for custom units of measure
CREATE TABLE IF NOT EXISTS product_units (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE
);

-- Insert default units
INSERT IGNORE INTO product_units (name) VALUES 
('Unidad'), 
('Metros'), 
('Pies'), 
('Cajas'), 
('Libras'), 
('Rollos'),
('Paquetes'),
('Litros'),
('Galones');
