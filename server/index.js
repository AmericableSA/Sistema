const express = require('express');
const cors = require('cors');
require('dotenv').config();
const db = require('./config/db');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

const routes = ['products', 'transactions', 'users', 'clients', 'zones', 'cities', 'billing', 'providers', 'settings', 'history', 'reports', 'auth', 'invoices'];
routes.forEach(r => { 
    try { 
        app.use(`/api/${r}`, require(`./routes/${r}`)); 
    } catch (e) {
        console.log(`⚠️ Ruta ${r} no cargada`);
    } 
});

app.post('/api/upload/clients', (req, res, next) => { 
    try { 
        require('./controllers/uploadController').uploadClients(req, res, next); 
    } catch (e) { 
        res.status(500).send(e.message); 
    } 
});

app.get('/api/health', (req, res) => res.json({ status: 'ok', database: 'connected' }));

app.listen(PORT, () => console.log(`🚀 Backend en puerto ${PORT}`));
