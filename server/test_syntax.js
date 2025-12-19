try {
    require('./controllers/providerController');
    console.log("providerController: OK");
    require('./controllers/reportController');
    console.log("reportController: OK");
} catch (e) {
    console.error("SYNTAX ERROR:", e);
}
