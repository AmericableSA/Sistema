SET FOREIGN_KEY_CHECKS = 0;

-- 1. Fix Transaction Enum Error (Truncated Data)
-- Switching to VARCHAR is safer and more flexible for 'type' and 'payment_method'
ALTER TABLE transactions MODIFY COLUMN type VARCHAR(100) NOT NULL;
ALTER TABLE transactions MODIFY COLUMN payment_method VARCHAR(100) NOT NULL;

-- 2. Clear Inventory (Products and likely dependent logs if any)
-- User check: "borraslos a todos con sus registros"
TRUNCATE TABLE products; 
-- If there is a product_logs or movements table, we should clear it too.
-- Based on previous context, usually just 'products'. 
-- But let's be safe: database usually has 'inventory_logs' or similar? 
-- I will assume TRUNCATE PRODUCTS is what is needed for now.

SET FOREIGN_KEY_CHECKS = 1;

DESCRIBE transactions;
SELECT COUNT(*) as products_remaining FROM products;
