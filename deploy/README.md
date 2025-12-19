# Guía de Despliegue en DigitalOcean

Sigue estos pasos para llevar tu aplicación a producción manteniendo tu entorno local funcionando.

## 1. Preparación del Droplet (Servidor)

1. Crea un Droplet en DigitalOcean (Ubuntu 22.04 o 24.04).
2. Conéctate por SSH: `ssh root@tu_ip`
3. Copia y ejecuta el script de instalación automática que he preparado:
   ```bash
   # (Copia el contenido de deploy/setup_droplet.sh y ejecútalo)
   chmod +x setup_droplet.sh
   ./setup_droplet.sh
   ```

## 2. Configuración de Base de Datos (Producción)

En tu droplet, entra a MySQL:
```sql
sudo mysql
-- Dentrode MySQL:
CREATE DATABASE americables_db;
CREATE USER 'app_user'@'localhost' IDENTIFIED BY 'StrongPassword123!';
GRANT ALL PRIVILEGES ON americables_db.* TO 'app_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

Carga tu esquema de base de datos. Puedes subir tu archivo `.sql` y cargarlo:
```bash
mysql -u app_user -p americables_db < database/schema.sql
```

## 3. Configuración del Proyecto

Clona tu código en `/var/www/americables`.

### Backend (.env)
Crea el archivo `server/.env` con las credenciales de PRODUCCIÓN:
```
PORT=3001
DB_HOST=localhost
DB_USER=app_user
DB_PASSWORD=StrongPassword123!
DB_NAME=americables_db
JWT_SECRET=super_secreto_prod
```

### Frontend (.env)
Crea el archivo `client/.env` para que Vite sepa dónde está la API en producción:
```
VITE_API_URL=http://tu_dominio_o_ip/api
```
*(Nota: Al usar Nginx como proxy inverso en el mismo dominio, a veces basta con /api, pero poner la IP/Dominio completo es seguro).*

**Build del Frontend:**
```bash
cd client
npm install
npm run build
```

## 4. Ejecución

1. **Backend con PM2:**
   ```bash
   cd server
   npm install
   pm2 start index.js --name "api"
   pm2 save
   pm2 startup
   ```

2. **Servidor Web (Nginx):**
   Copia la configuración:
   ```bash
   sudo cp deploy/nginx.conf /etc/nginx/sites-available/default
   sudo systemctl restart nginx
   ```

¡Listo! Tu aplicación estará corriendo en `http://tu_ip`.

## Entorno Local (Tu PC)
En tu computadora, nada cambia.
- Frontend usa `localhost:3001` automáticamente.
- Backend usa tu `.env` local.
- Para arrancar: `npm run dev` (client) y `node server/index.js` (backend).
