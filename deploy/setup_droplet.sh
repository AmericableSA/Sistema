#!/bin/bash

# Script de configuración inicial para AmericableS en DigitalOcean (Ubuntu usually)

# 1. Actualizar sistema
sudo apt update && sudo apt upgrade -y

# 2. Instalar Node.js (v18 o v20)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# 3. Instalar MySQL Server
sudo apt install -y mysql-server
sudo systemctl start mysql.service

# 4. Instalar Nginx
sudo apt install -y nginx

# 5. Instalar PM2 para manejar el proceso de Node
sudo npm install -g pm2

# 6. Configurar Firewall (UFW)
sudo ufw allow 'Nginx Full'
sudo ufw allow OpenSSH
sudo ufw enable

echo "---------------------------------------------------"
echo "✅ Entorno base instalado."
echo "---------------------------------------------------"
echo "SIGUIENTES PASOS:"
echo "1. Clona tu repositorio en /var/www/americables"
echo "2. Configura MySQL:"
echo "   sudo mysql_secure_installation"
echo "   ENTRA A MYSQL Y CREA LA BASE DE DATOS Y USUARIO:"
echo "   CREATE DATABASE americables_db;"
echo "   CREATE USER 'admin'@'localhost' IDENTIFIED BY 'tu_password_seguro';"
echo "   GRANT ALL PRIVILEGES ON americables_db.* TO 'admin'@'localhost';"
echo "   FLUSH PRIVILEGES;"
echo "3. Configura variables de entorno en server/.env y client/.env"
echo "4. Build del frontend: cd client && npm install && npm run build"
echo "5. Arranca backend: cd server && npm install && pm2 start index.js --name 'americables-api'"
echo "6. Copia deploy/nginx.conf a /etc/nginx/sites-available/default y reinicia nginx"
echo "---------------------------------------------------"
