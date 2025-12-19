
-- Create settings table if not exists (likely exists)
CREATE TABLE IF NOT EXISTS system_settings (
    setting_key VARCHAR(50) PRIMARY KEY,
    setting_value TEXT,
    description VARCHAR(255)
);

-- Insert default values if they don't exist
INSERT IGNORE INTO system_settings (setting_key, setting_value, description) VALUES 
('company_name', 'Americable', 'Nombre de la empresa'),
('company_ruc', 'J000000000', 'Número RUC'),
('company_phone', '8888-8888', 'Teléfono principal'),
('receipt_header', '*** GRACIAS POR SU PREFERENCIA ***', 'Frase inicial del recibo'),
('receipt_footer', 'NO SE ACEPTAN DEVOLUCIONES', 'Frase final del recibo');
