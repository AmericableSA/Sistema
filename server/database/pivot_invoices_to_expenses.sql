-- Pivot: Invoices as Expenses (Supplier Bills) - Force Drop

SET FOREIGN_KEY_CHECKS = 0;

-- Optional: Clear transactions linked to old invoices to prevent orphan mess?
-- DELETE FROM transactions WHERE invoice_id IS NOT NULL; 
-- User said "haz todo funcion bien", cleaner to wipe old test data.
DELETE FROM transactions WHERE invoice_id IS NOT NULL;

DROP TABLE IF EXISTS invoices;

CREATE TABLE invoices (
    id INT AUTO_INCREMENT PRIMARY KEY,
    provider_id INT NOT NULL,
    reference_number VARCHAR(100) COMMENT 'Numero de Factura del Proveedor',
    description VARCHAR(255) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    balance DECIMAL(10,2) NOT NULL,
    status ENUM('PENDING', 'PARTIAL', 'PAID', 'CANCELLED') DEFAULT 'PENDING',
    issue_date DATE DEFAULT (CURRENT_DATE),
    due_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (provider_id) REFERENCES providers(id) ON DELETE CASCADE
);

SET FOREIGN_KEY_CHECKS = 1;
