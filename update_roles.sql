-- 1. standardize existing roles to avoid data loss
UPDATE users SET role = 'office' WHERE role NOT IN ('admin', 'oficina', 'cobrador', 'admin'); 
-- Map old spanish roles if they exist
UPDATE users SET role = 'office' WHERE role = 'oficina';
UPDATE users SET role = 'collector' WHERE role = 'cobrador';

-- 2. Modify Column
ALTER TABLE users MODIFY COLUMN role ENUM('admin', 'office', 'collector', 'technician') NOT NULL DEFAULT 'office';

-- 3. Verify
SELECT * FROM users;
