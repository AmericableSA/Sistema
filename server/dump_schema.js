const db = require('./config/db');
const fs = require('fs');
const path = require('path');

async function dumpSchema() {
    try {
        const pool = await db.getConnection();
        console.log("Creating Backup...");

        const [tables] = await pool.query("SHOW TABLES");
        let sqlDump = "-- AMERICABLE DATABASE SCHEMA \n\n";

        for (let row of tables) {
            const tableName = Object.values(row)[0];
            const [create] = await pool.query(`SHOW CREATE TABLE \`${tableName}\``);
            sqlDump += `DROP TABLE IF EXISTS \`${tableName}\`;\n`;
            sqlDump += create[0]['Create Table'] + ";\n\n";

            // Dump Data for Config Tables
            if (['users', 'products', 'zones', 'providers', 'system_settings'].includes(tableName)) {
                sqlDump += `-- Data for ${tableName}\n`;
                const [data] = await pool.query(`SELECT * FROM \`${tableName}\``);
                for (let record of data) {
                    const keys = Object.keys(record).map(k => `\`${k}\``).join(', ');
                    const values = Object.values(record).map(v =>
                        v === null ? 'NULL' : `'${String(v).replace(/'/g, "\\'")}'`
                    ).join(', ');
                    sqlDump += `INSERT INTO \`${tableName}\` (${keys}) VALUES (${values});\n`;
                }
                sqlDump += "\n";
            }
        }

        fs.writeFileSync('database_schema.sql', sqlDump);
        console.log("✅ database_schema.sql created successfully!");
        pool.release();
        process.exit();
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
dumpSchema();
