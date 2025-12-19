-- AMERICABLE DATABASE SCHEMA 

DROP TABLE IF EXISTS `bundle_items`;
CREATE TABLE `bundle_items` (
  `id` int NOT NULL AUTO_INCREMENT,
  `bundle_id` int NOT NULL,
  `product_id` int NOT NULL,
  `quantity` int DEFAULT '1',
  PRIMARY KEY (`id`),
  KEY `bundle_id` (`bundle_id`),
  KEY `product_id` (`product_id`),
  CONSTRAINT `bundle_items_ibfk_1` FOREIGN KEY (`bundle_id`) REFERENCES `products` (`id`) ON DELETE CASCADE,
  CONSTRAINT `bundle_items_ibfk_2` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `cash_movements`;
CREATE TABLE `cash_movements` (
  `id` int NOT NULL AUTO_INCREMENT,
  `session_id` int NOT NULL,
  `type` enum('IN','OUT') NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `session_id` (`session_id`),
  CONSTRAINT `cash_movements_ibfk_1` FOREIGN KEY (`session_id`) REFERENCES `cash_sessions` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `cash_sessions`;
CREATE TABLE `cash_sessions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `start_time` datetime DEFAULT CURRENT_TIMESTAMP,
  `end_time` datetime DEFAULT NULL,
  `start_amount` decimal(10,2) NOT NULL DEFAULT '0.00',
  `end_amount_system` decimal(10,2) DEFAULT NULL,
  `end_amount_physical` decimal(10,2) DEFAULT NULL,
  `difference` decimal(10,2) DEFAULT NULL,
  `status` enum('open','closed') DEFAULT 'open',
  `exchange_rate` decimal(10,4) DEFAULT '36.6243',
  `closing_note` text,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `cash_sessions_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `categories`;
CREATE TABLE `categories` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(50) NOT NULL,
  `description` text,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `cities`;
CREATE TABLE `cities` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `client_logs`;
CREATE TABLE `client_logs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `client_id` int NOT NULL,
  `user_id` int DEFAULT NULL,
  `action` varchar(50) NOT NULL,
  `details` text,
  `timestamp` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `client_id` (`client_id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `client_logs_ibfk_1` FOREIGN KEY (`client_id`) REFERENCES `clients` (`id`) ON DELETE CASCADE,
  CONSTRAINT `client_logs_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=15 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `client_subscriptions`;
CREATE TABLE `client_subscriptions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `client_id` int NOT NULL,
  `plan_id` int NOT NULL,
  `start_date` date DEFAULT (curdate()),
  `status` enum('active','inactive') DEFAULT 'active',
  PRIMARY KEY (`id`),
  KEY `client_id` (`client_id`),
  KEY `plan_id` (`plan_id`),
  CONSTRAINT `client_subscriptions_ibfk_1` FOREIGN KEY (`client_id`) REFERENCES `clients` (`id`) ON DELETE CASCADE,
  CONSTRAINT `client_subscriptions_ibfk_2` FOREIGN KEY (`plan_id`) REFERENCES `service_plans` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `clients`;
CREATE TABLE `clients` (
  `id` int NOT NULL AUTO_INCREMENT,
  `contract_number` varchar(20) NOT NULL,
  `identity_document` varchar(20) DEFAULT NULL,
  `full_name` varchar(150) NOT NULL,
  `phone_primary` varchar(100) DEFAULT NULL,
  `phone_secondary` varchar(20) DEFAULT NULL,
  `email` varchar(100) DEFAULT NULL,
  `city_id` int DEFAULT NULL,
  `neighborhood_id` int DEFAULT NULL,
  `address_street` varchar(255) DEFAULT NULL,
  `address_reference` text,
  `status` enum('active','suspended','disconnected','pending_install') DEFAULT 'pending_install',
  `balance` decimal(10,2) DEFAULT '0.00',
  `last_paid_month` date DEFAULT NULL,
  `cutoff_date` date DEFAULT NULL,
  `reconnection_date` date DEFAULT NULL,
  `installation_date` date DEFAULT NULL,
  `preferred_collector_id` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `last_payment_date` date DEFAULT NULL,
  `cutoff_reason` varchar(255) DEFAULT NULL,
  `zone_id` int DEFAULT NULL,
  `due_months` int DEFAULT '0',
  `has_mora` tinyint(1) DEFAULT '0',
  `mora_balance` decimal(10,2) DEFAULT '0.00',
  `city` varchar(100) DEFAULT 'Managua',
  `disconnection_reason` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `contract_number` (`contract_number`),
  UNIQUE KEY `identity_document` (`identity_document`),
  KEY `city_id` (`city_id`),
  KEY `neighborhood_id` (`neighborhood_id`),
  KEY `preferred_collector_id` (`preferred_collector_id`),
  KEY `fk_client_zone` (`zone_id`),
  CONSTRAINT `clients_ibfk_1` FOREIGN KEY (`city_id`) REFERENCES `cities` (`id`) ON DELETE SET NULL,
  CONSTRAINT `clients_ibfk_2` FOREIGN KEY (`neighborhood_id`) REFERENCES `neighborhoods` (`id`) ON DELETE SET NULL,
  CONSTRAINT `clients_ibfk_3` FOREIGN KEY (`preferred_collector_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_client_zone` FOREIGN KEY (`zone_id`) REFERENCES `zones` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `incidents`;
CREATE TABLE `incidents` (
  `id` int NOT NULL AUTO_INCREMENT,
  `client_id` int NOT NULL,
  `reported_by` varchar(100) DEFAULT NULL,
  `description` text NOT NULL,
  `priority` enum('LOW','MEDIUM','HIGH','URGENT') DEFAULT 'MEDIUM',
  `status` enum('OPEN','ASSIGNED','RESOLVED','CLOSED') DEFAULT 'OPEN',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `resolved_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `client_id` (`client_id`),
  CONSTRAINT `incidents_ibfk_1` FOREIGN KEY (`client_id`) REFERENCES `clients` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `inventory_moves`;
CREATE TABLE `inventory_moves` (
  `id` int NOT NULL AUTO_INCREMENT,
  `product_id` int NOT NULL,
  `transaction_id` int DEFAULT NULL,
  `quantity` int NOT NULL,
  `type` enum('sale','purchase','adjustment') NOT NULL,
  `date` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `product_id` (`product_id`),
  KEY `transaction_id` (`transaction_id`),
  CONSTRAINT `inventory_moves_ibfk_1` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`),
  CONSTRAINT `inventory_moves_ibfk_2` FOREIGN KEY (`transaction_id`) REFERENCES `transactions` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `inventory_transactions`;
CREATE TABLE `inventory_transactions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `product_id` int NOT NULL,
  `user_id` int DEFAULT NULL,
  `service_order_id` int DEFAULT NULL,
  `transaction_type` enum('IN','OUT','EDIT') NOT NULL,
  `quantity` int NOT NULL,
  `unit_price` decimal(10,2) NOT NULL,
  `reason` varchar(255) DEFAULT NULL,
  `transaction_date` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `product_id` (`product_id`),
  KEY `service_order_id` (`service_order_id`),
  CONSTRAINT `inventory_transactions_ibfk_1` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE,
  CONSTRAINT `inventory_transactions_ibfk_2` FOREIGN KEY (`service_order_id`) REFERENCES `service_orders` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `invoices`;
CREATE TABLE `invoices` (
  `id` int NOT NULL AUTO_INCREMENT,
  `provider_id` int NOT NULL,
  `reference_number` varchar(100) DEFAULT NULL COMMENT 'Numero de Factura del Proveedor',
  `description` varchar(255) NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `balance` decimal(10,2) NOT NULL,
  `status` enum('PENDING','PARTIAL','PAID','CANCELLED') DEFAULT 'PENDING',
  `issue_date` date DEFAULT (curdate()),
  `due_date` date DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `provider_id` (`provider_id`),
  CONSTRAINT `invoices_ibfk_1` FOREIGN KEY (`provider_id`) REFERENCES `providers` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `neighborhoods`;
CREATE TABLE `neighborhoods` (
  `id` int NOT NULL AUTO_INCREMENT,
  `city_id` int NOT NULL,
  `name` varchar(100) NOT NULL,
  `zone_code` varchar(20) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `city_id` (`city_id`),
  CONSTRAINT `neighborhoods_ibfk_1` FOREIGN KEY (`city_id`) REFERENCES `cities` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `payments`;
CREATE TABLE `payments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `client_id` int NOT NULL,
  `received_by_user_id` int NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `payment_method` enum('cash','transfer','card') DEFAULT 'cash',
  `paid_for_month` date DEFAULT NULL,
  `transaction_date` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `notes` text,
  PRIMARY KEY (`id`),
  KEY `client_id` (`client_id`),
  KEY `received_by_user_id` (`received_by_user_id`),
  CONSTRAINT `payments_ibfk_1` FOREIGN KEY (`client_id`) REFERENCES `clients` (`id`) ON DELETE CASCADE,
  CONSTRAINT `payments_ibfk_2` FOREIGN KEY (`received_by_user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `products`;
CREATE TABLE `products` (
  `id` int NOT NULL AUTO_INCREMENT,
  `sku` varchar(50) DEFAULT NULL,
  `name` varchar(100) NOT NULL,
  `category_id` int DEFAULT NULL,
  `provider_id` int DEFAULT NULL,
  `current_stock` int DEFAULT '0',
  `min_stock_alert` int DEFAULT '5',
  `unit_cost` decimal(10,2) DEFAULT '0.00',
  `selling_price` decimal(10,2) DEFAULT NULL,
  `image_url` varchar(255) DEFAULT NULL,
  `description` text,
  `price` decimal(10,2) NOT NULL DEFAULT '0.00',
  `cost` decimal(10,2) NOT NULL DEFAULT '0.00',
  `stock` int NOT NULL DEFAULT '0',
  `min_stock` int DEFAULT '5',
  `is_active` tinyint(1) DEFAULT '1',
  `type` varchar(20) DEFAULT 'product',
  PRIMARY KEY (`id`),
  UNIQUE KEY `sku` (`sku`),
  KEY `category_id` (`category_id`),
  KEY `provider_id` (`provider_id`),
  CONSTRAINT `products_ibfk_1` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE SET NULL,
  CONSTRAINT `products_ibfk_2` FOREIGN KEY (`provider_id`) REFERENCES `providers` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Data for products

DROP TABLE IF EXISTS `providers`;
CREATE TABLE `providers` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `contact_name` varchar(100) DEFAULT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `address` text,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Data for providers
INSERT INTO `providers` (`id`, `name`, `contact_name`, `phone`, `email`, `address`) VALUES ('1', 'Comtech Nicaragua', 'Carlos Ventas', '8888-8888', NULL, NULL);
INSERT INTO `providers` (`id`, `name`, `contact_name`, `phone`, `email`, `address`) VALUES ('3', 'Comtech Nicaragua', 'Carlos Ventas', '8888-8888', NULL, NULL);
INSERT INTO `providers` (`id`, `name`, `contact_name`, `phone`, `email`, `address`) VALUES ('6', 'w', '2', '84031936', 'waskareliasrios11@gmail.com', 'juigalpa juigalpan de la rotonda 6 c al sur 1/2 al oeste');
INSERT INTO `providers` (`id`, `name`, `contact_name`, `phone`, `email`, `address`) VALUES ('7', 'f', '45', '84031936', 'waskareliasrios11@gmail.com', 'juigalpa juigalpan de la rotonda 6 c al sur 1/2 al oeste');
INSERT INTO `providers` (`id`, `name`, `contact_name`, `phone`, `email`, `address`) VALUES ('8', 'w', '', '', '', '');
INSERT INTO `providers` (`id`, `name`, `contact_name`, `phone`, `email`, `address`) VALUES ('9', ',', '', '', '', '');
INSERT INTO `providers` (`id`, `name`, `contact_name`, `phone`, `email`, `address`) VALUES ('10', 'sw', 'w', '84031936', 'waskareliasrios11@gmail.com', 'juigalpa juigalpan de la rotonda 6 c al sur 1/2 al oeste');

DROP TABLE IF EXISTS `service_orders`;
CREATE TABLE `service_orders` (
  `id` int NOT NULL AUTO_INCREMENT,
  `client_id` int NOT NULL,
  `type` enum('INSTALLATION','RECONNECTION','CUTOFF','TRANSFER','REMOVAL','REPAIR') NOT NULL,
  `status` enum('PENDING','IN_PROGRESS','COMPLETED','CANCELLED') DEFAULT 'PENDING',
  `created_by_user_id` int DEFAULT NULL,
  `assigned_tech_id` int DEFAULT NULL,
  `scheduled_date` datetime DEFAULT NULL,
  `completion_date` datetime DEFAULT NULL,
  `technician_notes` text,
  `material_cost` decimal(10,2) DEFAULT '0.00',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `client_id` (`client_id`),
  KEY `assigned_tech_id` (`assigned_tech_id`),
  CONSTRAINT `service_orders_ibfk_1` FOREIGN KEY (`client_id`) REFERENCES `clients` (`id`) ON DELETE CASCADE,
  CONSTRAINT `service_orders_ibfk_2` FOREIGN KEY (`assigned_tech_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `service_plan_items`;
CREATE TABLE `service_plan_items` (
  `id` int NOT NULL AUTO_INCREMENT,
  `service_plan_id` int NOT NULL,
  `product_id` int NOT NULL,
  `quantity` int NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`),
  KEY `service_plan_id` (`service_plan_id`),
  KEY `product_id` (`product_id`),
  CONSTRAINT `service_plan_items_ibfk_1` FOREIGN KEY (`service_plan_id`) REFERENCES `service_plans` (`id`) ON DELETE CASCADE,
  CONSTRAINT `service_plan_items_ibfk_2` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `service_plans`;
CREATE TABLE `service_plans` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `type` enum('TV','INTERNET','COMBO') NOT NULL,
  `base_price` decimal(10,2) NOT NULL,
  `description` text,
  `is_active` tinyint(1) DEFAULT '1',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `system_settings`;
CREATE TABLE `system_settings` (
  `setting_key` varchar(50) NOT NULL,
  `setting_value` varchar(255) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`setting_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Data for system_settings
INSERT INTO `system_settings` (`setting_key`, `setting_value`, `description`) VALUES ('company_name', 'Americable', 'Nombre de la empresa');
INSERT INTO `system_settings` (`setting_key`, `setting_value`, `description`) VALUES ('company_phone', '8949-3940', 'Teléfono principal');
INSERT INTO `system_settings` (`setting_key`, `setting_value`, `description`) VALUES ('company_ruc', 'J0310000015333-8', 'Número RUC');
INSERT INTO `system_settings` (`setting_key`, `setting_value`, `description`) VALUES ('cutoff_day', '18', 'Día del mes para corte automático');
INSERT INTO `system_settings` (`setting_key`, `setting_value`, `description`) VALUES ('exchange_rate', '36.6243', 'Tasa de Cambio Oficial');
INSERT INTO `system_settings` (`setting_key`, `setting_value`, `description`) VALUES ('mora_fee', '50.00', 'Cargo por Mora (C$)');
INSERT INTO `system_settings` (`setting_key`, `setting_value`, `description`) VALUES ('receipt_footer', 'LO QUE AMERICABLE PROMETE TE LO CUMPLE', 'Frase final del recibo');
INSERT INTO `system_settings` (`setting_key`, `setting_value`, `description`) VALUES ('receipt_header', 'LA MEJOR SEÑAL EN JUIGALPA CHONTALES', 'Frase inicial del recibo');

DROP TABLE IF EXISTS `transactions`;
CREATE TABLE `transactions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `session_id` int NOT NULL,
  `client_id` int DEFAULT NULL,
  `amount` decimal(10,2) NOT NULL,
  `type` varchar(100) NOT NULL,
  `payment_method` varchar(100) NOT NULL,
  `description` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `justification` text,
  `service_plan_id` int DEFAULT NULL,
  `exchange_rate` decimal(10,4) DEFAULT NULL,
  `reference_id` varchar(100) DEFAULT NULL,
  `details_json` json DEFAULT NULL,
  `collector_id` int DEFAULT NULL,
  `invoice_id` int DEFAULT NULL,
  `reference_number` varchar(100) DEFAULT NULL,
  `notes` text,
  PRIMARY KEY (`id`),
  KEY `session_id` (`session_id`),
  KEY `client_id` (`client_id`),
  KEY `fk_invoice` (`invoice_id`),
  CONSTRAINT `fk_invoice` FOREIGN KEY (`invoice_id`) REFERENCES `invoices` (`id`) ON DELETE SET NULL,
  CONSTRAINT `transactions_ibfk_1` FOREIGN KEY (`session_id`) REFERENCES `cash_sessions` (`id`),
  CONSTRAINT `transactions_ibfk_2` FOREIGN KEY (`client_id`) REFERENCES `clients` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `username` varchar(50) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `role` enum('admin','office','collector','technician') NOT NULL DEFAULT 'office',
  `full_name` varchar(100) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `is_active` tinyint(1) DEFAULT '1',
  `phone` varchar(20) DEFAULT NULL,
  `identity_document` varchar(20) DEFAULT NULL,
  `password` varchar(255) DEFAULT '123456',
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`),
  UNIQUE KEY `identity_document` (`identity_document`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Data for users
INSERT INTO `users` (`id`, `username`, `password_hash`, `role`, `full_name`, `created_at`, `is_active`, `phone`, `identity_document`, `password`) VALUES ('5', 'waskar', '$2b$10$kOFlIYtF3QkTYd6Dryabq.P3FxAH3FBeM8KvFPS65O8wDT6UvfUVW', 'admin', 'Admin Waskar', 'Thu Dec 18 2025 15:54:20 GMT-0600 (hora estándar central)', '1', NULL, 'ADMIN-001', '1987');
INSERT INTO `users` (`id`, `username`, `password_hash`, `role`, `full_name`, `created_at`, `is_active`, `phone`, `identity_document`, `password`) VALUES ('8', 'admin', '', 'admin', 'Administrador', 'Fri Dec 19 2025 13:10:25 GMT-0600 (hora estándar central)', '1', NULL, NULL, '$2a$10$X...');

DROP TABLE IF EXISTS `zones`;
CREATE TABLE `zones` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `tariff` decimal(10,2) NOT NULL DEFAULT '0.00',
  `description` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Data for zones
INSERT INTO `zones` (`id`, `name`, `tariff`, `description`, `created_at`) VALUES ('1', 'General', '300.00', NULL, 'Wed Dec 17 2025 22:47:25 GMT-0600 (hora estándar central)');
INSERT INTO `zones` (`id`, `name`, `tariff`, `description`, `created_at`) VALUES ('2', 'el ayote', '250.00', 'ninguno', 'Wed Dec 17 2025 22:56:01 GMT-0600 (hora estándar central)');
INSERT INTO `zones` (`id`, `name`, `tariff`, `description`, `created_at`) VALUES ('3', 'regalia', '0.00', 'regalia', 'Wed Dec 17 2025 22:56:10 GMT-0600 (hora estándar central)');

