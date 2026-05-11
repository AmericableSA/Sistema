const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

// ═══════════════════════════════════════════════════════════════
// ZONA HORARIA MYSQL: Nicaragua = UTC-6
// ═══════════════════════════════════════════════════════════════
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
    timezone: '-06:00',                    // mysql2: interpreta DATETIME como UTC-6
    dateStrings: false,                    // Retorna objetos Date nativos de JS
});

// Al crear cada conexión, forzar zone_time a Nicaragua en el servidor MySQL
pool.on('connection', (connection) => {
    connection.query("SET time_zone = '-06:00'");
});

// Prueba de conexión inmediata + verificación de zona horaria
(async () => {
    try {
        const connection = await pool.getConnection();
        await connection.query("SET time_zone = '-06:00'");
        const [[tzRow]] = await connection.query("SELECT @@global.time_zone as g, @@session.time_zone as s, NOW() as now_db");
        console.log(`✅ DB conectada. TZ Sesión: ${tzRow.s} | NOW() en DB: ${tzRow.now_db}`);
        connection.release();
    } catch (error) {
        console.error('❌ Error conectando a la base de datos:', error.message);
        if (error.code === 'ECONNREFUSED') console.error('Asegúrate que el servidor MySQL esté corriendo.');
        if (error.code === 'ER_ACCESS_DENIED_ERROR') console.error('Usuario o contraseña incorrectos.');
    }
})();

module.exports = pool;