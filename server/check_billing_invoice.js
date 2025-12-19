try {
    console.log("Checking billing...");
    require('./routes/billing');
    console.log("✅ Billing OK");

    console.log("Checking invoices...");
    require('./routes/invoices');
    console.log("✅ Invoices OK");
} catch (e) {
    console.error("❌ ERROR:", e.message);
}
