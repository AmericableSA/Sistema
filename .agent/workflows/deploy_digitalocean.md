---
description: Sincronizar sistema y desplegar en DigitalOcean (Force Sync)
---

Sigue estos pasos EXACTOS para desplegar.

⚠️ IMPORTANTE: El build SIEMPRE se hace en tu PC local, NUNCA en el servidor (el servidor tiene poca RAM y se cae).

### 1. En tu PC Local (PowerShell)
Compila el frontend localmente y luego sube todo a GitHub:

```powershell
# 1. Construir el frontend (aquí tienes suficiente RAM)
Set-Location "$env:USERPROFILE\Desktop\AmericableS\client"
npm run build

# 2. Volver a la raíz y subir todo (código + dist compilado)
Set-Location "$env:USERPROFILE\Desktop\AmericableS"
git add .
git commit -m "deploy: build local + sync"
git push origin main
```

### 2. En tu Droplet (Consola SSH)
Solo jala el código nuevo y reinicia el backend. NO hacer build aquí:

```bash
cd /root/Sistema || exit

# 1. Jalar código (incluyendo el dist ya compilado desde tu PC)
git fetch --all
git reset --hard origin/main

# 2. Configuración del Backend
cat <<EOF > server/.env
DB_HOST=localhost
DB_USER=admin_sistema
DB_PASSWORD=1987
DB_NAME=americable
DB_PORT=3306
PORT=3001
EOF

# 3. Solo instalar dependencias del servidor (sin build)
cd server && npm install --production

# 4. Reiniciar servicios
pm2 restart all --update-env
pm2 save
```

### 🚨 RESCATE RÁPIDO (servidor caído / 502)
Si el servidor se cae y ves 502, corre SOLO esto en la consola SSH:

```bash
pm2 restart all
```

### ℹ️ Notas
- El frontend compilado (carpeta `client/dist`) se sube junto con el código a GitHub
- El servidor solo sirve esos archivos estáticos, no los construye
- Esto evita que el Droplet se quede sin RAM
