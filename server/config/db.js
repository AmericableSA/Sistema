const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 3306, // Puerto estándar
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    // Esto ayuda en entornos de producción (DigitalOcean) para evitar cierres inesperados
    enableKeepAlive: true,
    keepAliveInitialDelay: 0
});

// Prueba de conexión inmediata
(async () => {
    try {
        const connection = await pool.getConnection();
        console.log('✅ Conexión a la base de datos establecida correctamente.');
        connection.release();
    } catch (error) {
        console.error('❌ Error conectando a la base de datos:', error.message);
        // Detalles específicos para ayudarte a debugear
        if (error.code === 'ECONNREFUSED') console.error('Asegúrate que el servidor MySQL esté corriendo.');
        if (error.code === 'ER_ACCESS_DENIED_ERROR') console.error('Usuario o contraseña incorrectos.');
    }
})();

module.exports = pool;