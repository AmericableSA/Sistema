SET FOREIGN_KEY_CHECKS = 0;

-- 1. Ensure Waskar is Admin
UPDATE users SET role = 'admin' WHERE username LIKE '%waskar%';

-- 2. Consolidate Roles (Map old to new)
UPDATE users SET role = 'collector' WHERE role = 'cajero';
UPDATE users SET role = 'office' WHERE role = 'oficinista' OR role = 'oficina';
UPDATE users SET role = 'technician' WHERE role = 'tecnico';
UPDATE users SET role = 'office' WHERE role = 'bodeguero';

-- 3. Reassign History to Waskar (Safe Admin)
-- Get Waskar ID (Assuming we can find him, or use a variable if possible, but simpler to subquery)
-- We'll do it in step 4 implicitly by finding non-waskar users? NO, let's do it explicitly.

SET @admin_id = (SELECT id FROM users WHERE username LIKE '%waskar%' LIMIT 1);

-- Fallback if Waskar not found, use any admin
SET @admin_id = IF(@admin_id IS NULL, (SELECT id FROM users WHERE role = 'admin' LIMIT 1), @admin_id);

-- Reassign Logs
UPDATE client_logs SET user_id = @admin_id WHERE user_id NOT IN (SELECT id FROM users WHERE id = @admin_id);

-- Reassign Clients (Preferred Collector)
UPDATE clients SET preferred_collector_id = @admin_id WHERE preferred_collector_id NOT IN (SELECT id FROM users WHERE id = @admin_id);

-- Reassign Transactions
UPDATE transactions SET collector_id = @admin_id WHERE collector_id NOT IN (SELECT id FROM users WHERE id = @admin_id);

-- 4. DELETE everyone except Waskar (and maybe 'admin' general user if it exists?)
-- User said: "deja solo mi admin de ahi quita todos".
DELETE FROM users WHERE id != @admin_id AND username != 'admin'; 
-- Note: He might have 'admin' user and 'waskar' user. He said "mi admin". I see 'Admin User' (@admin) and 'Admin Waskar' (@waskar) in screenshot.
-- I'll keep both for safety, or just Waskar if he insists. "deja solo mu usuario de waskar u borrar el resto". 
-- Syntax errors in his text "mu usuario de waskarr u borrar el resto" -> "mi usuario de waskar y borrar el resto".
-- Okay, I will delete EVERYONE except 'waskar'.

DELETE FROM users WHERE username NOT LIKE '%waskar%';

-- 5. Fix Schema (ENUM)
ALTER TABLE users MODIFY COLUMN role ENUM('admin', 'office', 'collector', 'technician') NOT NULL DEFAULT 'office';

SET FOREIGN_KEY_CHECKS = 1;

SELECT * FROM users;
