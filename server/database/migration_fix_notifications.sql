-- Migration to fix 500 error on notifications
-- Matches existing Spanish column names in production

CREATE TABLE IF NOT EXISTS `contactos` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nombre_completo` varchar(255) NOT NULL,
  `telefono_whatsapp` varchar(20) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `barrio_direccion` varchar(255) DEFAULT NULL,
  `mensaje` text,
  `status` varchar(50) DEFAULT 'pending',
  `assigned_user_id` int DEFAULT NULL,
  `atendido` tinyint(1) DEFAULT 0,
  `fecha_contacto` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `averias` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nombre_completo` varchar(255) NOT NULL,
  `telefono_contacto` varchar(20) DEFAULT NULL,
  `zona_barrio` varchar(255) DEFAULT NULL,
  `detalles_averia` text,
  `estado` varchar(50) DEFAULT 'Pendiente',
  `assigned_user_id` int DEFAULT NULL,
  `fecha_reporte` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add 'cajas' table placeholder if missing (since we added a controller method for it)
-- For now, we just ensure the endpoint doesn't crash, table creation is optional regarding 'cajas' unless we define schema.

-- Fix 'assigned_user_id' if missing in existing tables (using correct 'AFTER' columns)
-- We use stored procedure or simple ALTER Ignore approach
SET @dbname = DATABASE();
SET @tablename = "averias";
SET @columnname = "assigned_user_id";
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (table_name = @tablename)
      AND (table_schema = @dbname)
      AND (column_name = @columnname)
  ) > 0,
  "SELECT 1",
  "ALTER TABLE averias ADD assigned_user_id int DEFAULT NULL AFTER estado"
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

SET @tablename2 = "contactos";
SET @preparedStatement2 = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (table_name = @tablename2)
      AND (table_schema = @dbname)
      AND (column_name = "assigned_user_id")
  ) > 0,
  "SELECT 1",
  "ALTER TABLE contactos ADD assigned_user_id int DEFAULT NULL AFTER status"
));
PREPARE alterIfNotExists2 FROM @preparedStatement2;
EXECUTE alterIfNotExists2;
DEALLOCATE PREPARE alterIfNotExists2;
