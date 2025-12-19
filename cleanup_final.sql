SET FOREIGN_KEY_CHECKS = 0;

-- 1. Relax Constraint (Allow any string)
ALTER TABLE users MODIFY COLUMN role VARCHAR(50) NOT NULL DEFAULT 'office';

-- 2. Clean Data (Map old roles)
UPDATE users SET role = 'collector' WHERE role = 'cajero' OR role = 'cobrador';
UPDATE users SET role = 'office' WHERE role = 'oficinista' OR role = 'oficina' OR role = 'bodeguero' OR role = 'secretaria';
UPDATE users SET role = 'technician' WHERE role = 'tecnico';
UPDATE users SET role = 'admin' WHERE role = 'administrador';

-- 3. Reassign Orphans to Waskar (Safe Admin)
SET @admin_id = (SELECT id FROM users WHERE username LIKE '%waskar%' LIMIT 1);
SET @admin_id = IF(@admin_id IS NULL, (SELECT id FROM users WHERE role = 'admin' LIMIT 1), @admin_id);

UPDATE client_logs SET user_id = @admin_id WHERE user_id NOT IN (SELECT id FROM users);
UPDATE clients SET preferred_collector_id = @admin_id WHERE preferred_collector_id NOT IN (SELECT id FROM users);
UPDATE transactions SET collector_id = @admin_id WHERE collector_id NOT IN (SELECT id FROM users);

-- 4. Delete others (Only Waskar remains)
DELETE FROM users WHERE username NOT LIKE '%waskar%' AND id != @admin_id;

-- 5. Strict Schema (Apply ENUM)
ALTER TABLE users MODIFY COLUMN role ENUM('admin', 'office', 'collector', 'technician') NOT NULL DEFAULT 'office';

SET FOREIGN_KEY_CHECKS = 1;

SELECT * FROM users;
