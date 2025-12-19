try {
    console.log("Req Express...");
    const express = require('express');
    console.log("Req Cors...");
    const cors = require('cors');
    console.log("Req DB...");
    const db = require('./config/db');
    console.log("Req Dotenv...");
    require('dotenv').config();

    console.log("Init App...");
    const app = express();
    console.log("Use Cors...");
    app.use(cors());
    console.log("Use Json...");
    app.use(express.json());

    console.log("SANITY PASSED");
} catch (e) {
    console.error("SANITY FAILED:", e);
}
