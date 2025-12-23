---
description: Sincronizar sistema y desplegar en DigitalOcean (Force Sync)
---

Sigue estos pasos EXACTOS para desplegar.

### 1. En tu PC Local (PowerShell)
Ejecuta esto para forzar que el repositorio sea idéntico a tu local:

```powershell
git add .
git commit -m "Despliegue: Sincronización forzada"
git push origin main --force
```

### 2. En tu Droplet (Consola SSH)
Copia y pega este bloque COMPLETO para limpiar, configurar y reiniciar:

```bash
cd /root/Sistema || exit

# 1. Sincronización Forzada
git fetch --all
git reset --hard origin/main
git clean -fd

# 2. Configuración de Credenciales (.env Backend)
# (Se sobrescribe con la configuración fija solicitada)
cat <<EOF > server/.env
DB_HOST=localhost
DB_USER=admin_sistema
DB_PASSWORD=1987
DB_NAME=americable
DB_PORT=3306
PORT=3001
EOF

# 3. Instalación de dependencias (por si hubo cambios en package.json)
cd server && npm install
cd ../client && npm install

# 4. Construcción del Frontend (Vite)
npm run build

# 5. Reinicio de Servicios
pm2 restart all --update-env
```
