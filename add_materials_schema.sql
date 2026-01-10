-- 1. Add unit_of_measure to products if it doesn't exist
-- Note: This syntax is for MySQL. 
-- We use a stored procedure to check if the column exists to avoid errors on multiple runs, 
-- or simply try to add it and ignore error if it exists. 
-- Simplified approach: ALTER IGNORE or just standard ALTER.
-- Since the user asked for the code "in case it's not there", here is the safe command:

SET @dbname = DATABASE();
SET @tablename = "products";
SET @columnname = "unit_of_measure";
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (table_name = @tablename)
      AND (table_schema = @dbname)
      AND (column_name = @columnname)
  ) > 0,
  "SELECT 1",
  "ALTER TABLE products ADD COLUMN unit_of_measure VARCHAR(50) DEFAULT 'Unidad';"
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- 2. Create service_order_materials table
CREATE TABLE IF NOT EXISTS service_order_materials (
    id INT AUTO_INCREMENT PRIMARY KEY,
    service_order_id INT NOT NULL,
    product_id INT NOT NULL,
    quantity DECIMAL(10,2) NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    -- Note: We are not adding FK for service_order_id yet if the table structure of orders is complex 
    -- or if it's 'client_movements'. 
    -- Based on previous context, orders seem to be in 'client_movements' or similar. 
    -- I will omit the generic FK constraint for service_order_id to avoid blocking if the table name varies, 
    -- but usually it should be linked. 
    -- Let's assume 'client_movements' is the table for orders based on 'ClientMovements.jsx'.
);

-- If you want to enforce FK and the table is client_movements:
-- ALTER TABLE service_order_materials ADD CONSTRAINT fk_order_material FOREIGN KEY (service_order_id) REFERENCES client_movements(id) ON DELETE CASCADE;
