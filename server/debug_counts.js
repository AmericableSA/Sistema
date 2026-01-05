const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const db = require('./config/db');

async function debug() {
    try {
        console.log('ENV PATH:', path.join(__dirname, '.env'));
        console.log('DB_USER:', process.env.DB_USER);
        console.log('DB_NAME:', process.env.DB_NAME);
        const pool = await db.getConnection();

        // 1. Total Active
        const [active] = await pool.query("SELECT COUNT(*) as c FROM clients WHERE status = 'active'");
        console.log('Total Active:', active[0].c);

        // 2. Active with NULL last_paid_month
        const [activeNull] = await pool.query("SELECT COUNT(*) as c FROM clients WHERE status = 'active' AND last_paid_month IS NULL");
        console.log('Active with NULL last_paid_month:', activeNull[0].c);

        // 3. Report Logic Morosos ( < CURDATE() ) excluding NULLs naturally?
        // Note: In MySQL, NULL < DATE is NULL (Falsy). So they are NOT counted.
        const [morososReport] = await pool.query("SELECT COUNT(*) as c FROM clients WHERE status = 'active' AND last_paid_month < CURDATE()");
        console.log("Report Morosos (< CURDATE()):", morososReport[0].c);

        // 4. Export Logic Up to Date ( >= 1st of Month )
        const [exportAlDia] = await pool.query("SELECT COUNT(*) as c FROM clients WHERE status = 'active' AND last_paid_month >= DATE_FORMAT(CURDATE(), '%Y-%m-01')");
        console.log("Export Up To Date (>= 1st):", exportAlDia[0].c);

        // 5. Calculated Al Dia in Report
        const calculatedAlDia = active[0].c - morososReport[0].c;
        console.log("Calculated Report Al Dia:", calculatedAlDia);

        pool.release();
        process.exit();

    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

debug();
