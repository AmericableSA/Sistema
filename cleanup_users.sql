-- 1. Ensure Waskar exists and is admin (if he exists)
UPDATE users SET role = 'admin' WHERE username LIKE '%Waskar%';

-- 2. Re-assign history/logs to Waskar (assuming Waskar has ID we can find, or we pick the first admin)
-- We need to handle this dynamically in SQL or just try delete and see. 
-- Safer: Delete everyone else. if FK fails, we might need to be more aggressive.
-- Let's try to set FKs to NULL if possible, or reassign to Waskar.

-- Reassign client_logs
UPDATE client_logs SET user_id = (SELECT id FROM users WHERE username LIKE '%Waskar%' LIMIT 1) 
WHERE user_id NOT IN (SELECT id FROM users WHERE username LIKE '%Waskar%');

-- Reassign transactions
-- UPDATE transactions SET collector_id = (SELECT id FROM users WHERE username LIKE '%Waskar%' LIMIT 1) 
-- WHERE collector_id NOT IN (SELECT id FROM users WHERE username LIKE '%Waskar%');

-- 3. DELETE others
DELETE FROM users WHERE username NOT LIKE '%Waskar%';

-- 4. Now modify column
ALTER TABLE users MODIFY COLUMN role ENUM('admin', 'office', 'collector', 'technician') NOT NULL DEFAULT 'office';

-- 5. Final Assurance
UPDATE users SET role = 'admin' WHERE username LIKE '%Waskar%';
SELECT * FROM users;
