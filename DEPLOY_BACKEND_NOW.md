# 🔴 EJECUTA ESTO AHORA EN DIGITALOCEAN

## El Problema
El frontend se actualizó ✅ pero el **backend NO** ❌  
Por eso sigues viendo error 500.

## La Solución - UN SOLO COMANDO

Conecta a tu servidor DigitalOcean y pega esto:

```bash
cd /root/Sistema/server && git pull && pm2 restart all
```

## Qué hace:
1. `cd /root/Sistema/server` → Va al backend
2. `git pull` → Descarga el código arreglado de GitHub
3. `pm2 restart all` → Reinicia el servidor con los fixes

## ⏱️ Tiempo: 10 segundos

## ✅ Después los errores desaparecerán

---

### ¿Cómo conectar a DigitalOcean?

1. Ve a: https://cloud.digitalocean.com/droplets
2. Click en tu droplet "americable"
3. Click en "Console" (arriba derecha)
4. Pega el comando

**O desde tu terminal local:**
```bash
ssh root@165.227.163.249
cd /root/Sistema/server && git pull && pm2 restart all
```
