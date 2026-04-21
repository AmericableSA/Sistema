const pool = require('../server/config/db');

async function check() {
    try {
        console.log("--- Timezone Info ---");
        const [tz] = await pool.query("SELECT @@global.time_zone AS global, @@session.time_zone AS session, @@system_time_zone AS system, NOW() as now");
        console.log(JSON.stringify(tz[0], null, 2));

        console.log("\n--- Triggers ---");
        const [triggers] = await pool.query("SHOW TRIGGERS");
        console.log(JSON.stringify(triggers, null, 2));

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

check();
