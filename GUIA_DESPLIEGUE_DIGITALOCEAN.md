# 🚀 Guía de Despliegue en DigitalOcean - Sistema AmeriCable

Sigue estos pasos EXACTOS para subir tu sistema (Frontend + Backend + Base de Datos) a un Droplet de DigitalOcean.

---

## 1. PREPARACIÓN LOCAL (En tu PC)

Antes de subir nada, necesitamos construir el Frontend y empaquetar todo.

1.  **Abre la terminal en la carpeta del proyecto** (`c:\Users\Waskar\Desktop\AmericableS`).
2.  **Construye el Frontend**:
    ```powershell
    cd client
    npm install
    npm run build
    cd ..
    ```
    *(Esto creará la carpeta `client/dist` con tu página web lista).*

3.  **Verifica los Archivos**:
    Asegúrate de que tienes `database_schema.sql` en la carpeta `server/`. (Ya lo creé por ti).

4.  **Comprime todo**:
    Selecciona las carpetas `server` y `client` (asegúrate de incluir `client/dist`) y comprímelas en un archivo llamado `americable.zip`.
    *Nota: NO incluyas `node_modules` ni del server ni del cliente. Es mejor instalarlos en el servidor.*

---

## 2. PREPARACIÓN DEL SERVIDOR (En DigitalOcean)

Conéctate a tu Droplet (Consola o SSH) y ejecuta estos comandos uno por uno:

### A. Instalar Herramientas (Node, MySQL)
```bash
# 1. Actualizar sistema
sudo apt update && sudo apt upgrade -y

# 2. Instalar Node.js (Versión 18/20)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# 3. Instalar MySQL Server
sudo apt install -y mysql-server
sudo mysql_secure_installation
# (Responde 'Y' a todo, pon una contraseña fuerte ej: Admin123!)
```

### B. Configurar Base de Datos
Entra a MySQL:
```bash
sudo mysql -u root -p
# (Escribe tu contraseña)
```
Dentro de MySQL, ejecuta:
```sql
CREATE DATABASE americable_db;
CREATE USER 'americable_user'@'localhost' IDENTIFIED BY 'TuClaveSegura123';
GRANT ALL PRIVILEGES ON americable_db.* TO 'americable_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

---

## 3. SUBIR Y CONFIGURAR PROYECTO

### A. Subir Archivos
Usa FileZilla (SFTP) para subir tu `americable.zip` a la carpeta `/root/` o `/var/www/`.
O usa `scp` desde tu PC:
```powershell
scp americable.zip root@tu_ip_droplet:/root/
```

### B. Instalar Dependencias
En el servidor:
```bash
# 1. Instalar Unzip
sudo apt install unzip

# 2. Descomprimir
unzip americable.zip -d americable
cd americable/server

# 3. Instalar dependencias del servidor
npm install

# 4. Configurar Variables de Entorno
nano .env
```
Pega esto en el editor (Ctrl+O Enter, Ctrl+X para guardar):
```env
PORT=3000
DB_HOST=localhost
DB_USER=americable_user
DB_PASSWORD=TuClaveSegura123
DB_NAME=americable_db
// ... otras claves si tienes
```

### C. Importar la Base de Datos
Esta importará la estructura y usuarios/zonas que guardamos, pero SIN clientes (limpio).
Busca el archivo `database_schema.sql` (debería estar en `americable/server` si lo comprimiste bien).
```bash
mysql -u americable_user -p americable_db < database_schema.sql
# (Pon la clave 'TuClaveSegura123')
```

---

## 4. ARRANCAR EL SISTEMA (PM2)

Usaremos PM2 para que el sistema nunca se apague.

```bash
# 1. Instalar PM2 globalmente
sudo npm install -g pm2

# 2. Iniciar el Servidor (Que sirve API y Frontend)
pm2 start index.js --name "americable-system"

# 3. Guardar para que inicie al reiniciar el Droplet
pm2 save
pm2 startup
# (Copia y pega el comando que te muestre pm2 startup)
```

---

## 5. (OPCIONAL) PUBLICAR EN INTERNET (NGINX + DOMINIO)

Si quieres entrar por `tudominio.com` en lugar de `IP:3000`.

```bash
# Instalar Nginx
sudo apt install -y nginx

# Configurar Proxy
sudo nano /etc/nginx/sites-available/default
```

Borra todo y pon:
```nginx
server {
    listen 80;
    server_name _;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```
Reinicia Nginx:
```bash
sudo systemctl restart nginx
```

### ¡LISTO! 🚀
Tu sistema debería estar accesible en `http://TU_IP_DIGITALOCEAN`.
El Frontend cargará automáticamente y conectará con el Backend.

---

### Solución de Problemas Comunes

*   **Error de Conexión DB**: Revisa el archivo `.env` y asegúrate de que la clave de MySQL coincide.
*   **Pantalla Blanca**: Asegúrate de haber ejecutado `npm run build` en tu PC antes de subir la carpeta `client/dist`.
*   **Permisos**: Si hay error de escritura, ejecuta `chown -R root:root .` en la carpeta del proyecto o usa el usuario adecuado.
