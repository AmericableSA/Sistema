SET FOREIGN_KEY_CHECKS = 0;

-- =============================================
-- SCRIPT DE LIMPIEZA PARA ENTREGA DEL SISTEMA
-- =============================================
-- Este script borra TODO el historial de operaciones,
-- dejando solo los usuarios y clientes activos.
-- Úselo con precaución.

-- 1. Facturación y Pagos
TRUNCATE TABLE transactions;

-- 2. Cajas y Sesiones (Cierres de Caja)
TRUNCATE TABLE cash_sessions;
TRUNCATE TABLE cash_movements;

-- 3. Bitácora de Movimientos de Clientes (Historial)
TRUNCATE TABLE client_logs;

-- 4. Órdenes de Servicio (Instalaciones y Reparaciones pasadas)
TRUNCATE TABLE service_orders;

SET FOREIGN_KEY_CHECKS = 1;

SELECT "Historial borrado correctamente. El sistema está limpio para entrega." as Mensaje;
