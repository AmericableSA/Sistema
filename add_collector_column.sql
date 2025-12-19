USE americable_db;

ALTER TABLE transactions
ADD COLUMN collector_id INT DEFAULT NULL;

-- Log the change
INSERT INTO system_logs (log_level, message) VALUES ('INFO', 'Added collector_id column to transactions table');
