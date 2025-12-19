const http = require('http');

function request(method, path, data = null) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 3001,
            path: '/api' + path,
            method: method,
            headers: { 'Content-Type': 'application/json' }
        };

        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(body);
                    resolve({ status: res.statusCode, data: json });
                } catch (e) {
                    resolve({ status: res.statusCode, data: body });
                }
            });
        });

        req.on('error', reject);
        if (data) req.write(JSON.stringify(data));
        req.end();
    });
}

async function run() {
    console.log("🚀 Starting System Test (Native Mode)...");

    try {
        // 1. Create Client
        console.log("\n1️⃣ Creating Test Client...");
        const clientRes = await request('POST', '/clients', {
            full_name: "Cliente Test Auto",
            id_card: "AUTO-" + Date.now(),
            phone: "88888888",
            address: "Test Address",
            contract_number: "CTR-" + Date.now(),
            service_type: "CABLE",
            zone_id: 1,
            monthly_cost: 300,
            status: 'active'
        });

        if (clientRes.status >= 400 && clientRes.status !== 409) {
            throw new Error(`Client creation failed: ${JSON.stringify(clientRes.data)}`);
        }

        let clientId = clientRes.data.insertId;
        if (!clientId) {
            // If failed, try fetching existing
            const getClients = await request('GET', '/clients');
            if (getClients.data.length > 0) clientId = getClients.data[0].id;
        }
        console.log("✅ Client Ready. ID:", clientId);

        // 2. Open Session
        console.log("\n2️⃣ Checking Cash Session...");
        const status = await request('GET', '/billing/status');
        if (!status.data) {
            await request('POST', '/billing/open', { start_amount: 1000, exchange_rate: 36.5 });
            console.log("✅ Session Opened.");
        } else {
            console.log("✅ Session Active.");
        }

        // 3. Charge
        console.log("\n3️⃣ Processing Transaction...");
        const chargeRes = await request('POST', '/billing/charge', {
            client_id: clientId,
            amount: 500,
            currency: 'COR',
            description: "PAGO TEST VERIFICACION",
            type: 'monthly',
            details: { months_paid: 1, items: [{ description: "Test", amount: 500 }] }
        });

        if (chargeRes.status >= 400) throw new Error("Charge Failed: " + JSON.stringify(chargeRes.data));
        console.log("✅ Charge Successful.");

        // 4. Verify History
        console.log("\n4️⃣ Verifying History...");
        await new Promise(r => setTimeout(r, 1000));
        const history = await request('GET', '/history?limit=10');

        const found = history.data.data.find(tx => tx.description === "PAGO TEST VERIFICACION");

        if (found) {
            console.log("🎉 SUCCESS: Transaction found in History!");
            console.log(`   [${found.created_at}] ${found.client_name}: C$ ${found.amount}`);
        } else {
            console.error("❌ FAILURE: Transaction NOT found in history.");
            console.log("Top 3 in History:", history.data.data.slice(0, 3));
        }

    } catch (err) {
        console.error("❌ TEST CRASHED:", err);
    }
}

run();
