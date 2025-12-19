ALTER TABLE users ADD COLUMN role ENUM('admin', 'cajero', 'tecnico') DEFAULT 'cajero';
UPDATE users SET role = 'admin' WHERE username IN ('admin', 'waskar');
