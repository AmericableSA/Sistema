# Protocolo de Despliegue: "Sincronizar el Sistema"

Este documento contiene los comandos exactos para tu flujo de despliegue definido.

## Configuración Fija del Entorno
*   **Base de Datos**: `americable`
*   **Usuario**: `admin_sistema`
*   **Password**: `1987`
*   **Puerto**: `3306`

---

## Paso 1: PC Local (PowerShell)
*Objetivo: Subir tu versión actual como la única válida.*

```powershell
git add .
git commit -m "Despliegue: Sincronización del sistema"
git push origin main --force
```

---

## Paso 2: Droplet DigitalOcean
*Objetivo: Borrar todo rastro local antiguo, bajar la nueva versión, re-crear credenciales y reiniciar.*

Copia y pega todo este bloque en la terminal del servidor:

```bash
# Ir al directorio
cd /root/Sistema

# 1. Limpieza Extrema (Git Reset hard)
git fetch --all
git reset --hard origin/main
git clean -fd

# 2. Reconstruir .env del Servidor (Credenciales Fijas)
echo "Generando .env..."
echo "DB_HOST=localhost" > server/.env
echo "DB_USER=admin_sistema" >> server/.env
echo "DB_PASSWORD=1987" >> server/.env
echo "DB_NAME=americable" >> server/.env
echo "DB_PORT=3306" >> server/.env
echo "PORT=3001" >> server/.env

# 3. Asegurar dependencias y build (Por seguridad)
echo "Instalando dependencias..."
cd server && npm install
cd ../client && npm install
echo "Construyendo Frontend..."
npm run build

# 4. Reiniciar PM2
echo "Reiniciando servicios..."
pm2 restart all --update-env

echo "✅ Sincronización Completada."
```
