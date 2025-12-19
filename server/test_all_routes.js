const files = [
    './routes/products',
    './routes/transactions',
    './routes/users',
    './controllers/uploadController',
    './routes/clients',
    './routes/zones',
    './routes/cities',
    './routes/billing',
    './routes/providers',
    './routes/settings',
    './routes/history',
    './routes/reports',
    './routes/auth',
    './routes/invoices'
];

async function check() {
    for (const f of files) {
        try {
            process.stdout.write(`Checking ${f}... `);
            require(f);
            console.log("OK");
        } catch (e) {
            console.log("");
            console.error(`FAIL ${f}:`, e);
        }
    }
}
check();
