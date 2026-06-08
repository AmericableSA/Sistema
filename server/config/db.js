const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

// ═══════════════════════════════════════════════════════════════
// ZONA HORARIA MYSQL: Nicaragua = UTC-6
// mysql2 interpreta DATETIMEs usando timezone: '-06:00'
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
    timezone: '-06:00',   // mysql2: interpreta DATETIME en UTC-6 (Nicaragua)
});

// Configurar zona horaria -06:00 (Nicaragua) para todas las conexiones del pool
pool.on('connection', (connection) => {
    connection.query("SET time_zone = '-06:00'", (err) => {
        if (err) {
            console.error('❌ Error configurando time_zone en la conexión del pool:', err.message);
        }
    });
});

// Prueba de conexión + verificación de zona horaria
(async () => {
    try {
        const connection = await pool.getConnection();
        await connection.query("SET time_zone = '-06:00'");
        const [[row]] = await connection.query("SELECT NOW() as now_db");
        console.log(`✅ DB conectada. NOW() en DB: ${row.now_db}`);
        connection.release();
    } catch (error) {
        console.error('❌ Error conectando a la base de datos:', error.message);
        if (error.code === 'ECONNREFUSED') console.error('Asegúrate que el servidor MySQL esté corriendo.');
        if (error.code === 'ER_ACCESS_DENIED_ERROR') console.error('Usuario o contraseña incorrectos.');
    }
})();

module.exports = pool;
