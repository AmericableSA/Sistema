CREATE TABLE IF NOT EXISTS cash_reports (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    closing_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    total_cash DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    client_count INT DEFAULT 0,
    breakdown_json JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
