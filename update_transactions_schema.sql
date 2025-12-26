-- Script para asegurar columnas de facturación
-- Ejecutar en MySQL Workbench o phpMyAdmin

USE americabledc_system;

-- 1. Agregar reference_id (Factura Manual) si no existe
SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA='americabledc_system' AND TABLE_NAME='transactions' AND COLUMN_NAME='reference_id');
SET @sql := IF (@exist = 0, 'ALTER TABLE transactions ADD COLUMN reference_id VARCHAR(50) NULL AFTER service_plan_id;', 'SELECT "reference_id ya existe";');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 2. Agregar details_json (Detalles JSON) si no existe
SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA='americabledc_system' AND TABLE_NAME='transactions' AND COLUMN_NAME='details_json');
SET @sql := IF (@exist = 0, 'ALTER TABLE transactions ADD COLUMN details_json JSON NULL;', 'SELECT "details_json ya existe";');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 3. Agregar collector_id (Cobrador) si no existe
SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA='americabledc_system' AND TABLE_NAME='transactions' AND COLUMN_NAME='collector_id');
SET @sql := IF (@exist = 0, 'ALTER TABLE transactions ADD COLUMN collector_id INT NULL AFTER user_id;', 'SELECT "collector_id ya existe";');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 4. Asegurar que client_logs tenga columnas correctas
-- (Opcional, usualmente ya existen action/details)
