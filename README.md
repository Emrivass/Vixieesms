# FP Mensaje — Explora FP × Ucademy

Herramienta post-llamada: el comercial pega la URL del negocio de HubSpot y
genera los mensajes de WhatsApp con los recursos a adjuntar. Se despliega en
**Vercel** (web + API en un solo sitio).

## Qué incluye
- `index.html` — la herramienta (web).
- `api/deal.js` — función serverless que lee el negocio en HubSpot (motivación,
  contexto, propietario/comercial, formulación global y nombre) y se lo da a la web.
  El token de HubSpot vive aquí (en Vercel), nunca en el navegador.

## Desplegar en Vercel (vía GitHub) — 5 min
1. Crea un **repositorio en GitHub** y sube estos archivos (puedes arrastrarlos
   en *Add file → Upload files*). Estructura:
   ```
   index.html
   api/deal.js
   README.md
   ```
2. Entra en **vercel.com → Add New → Project → Import** ese repo. No cambies
   nada en la detección. Pulsa **Deploy**.
3. En Vercel → tu proyecto → **Settings → Environment Variables**, añade:
   - `HUBSPOT_TOKEN` = tu token privado de HubSpot (`pat-...`)
   - *(opcional)* `PROXY_SECRET` no se usa en esta versión.
   Vuelve a **Deployments → Redeploy** para que tome la variable.
4. Abre tu web (`https://TU-PROYECTO.vercel.app`). Pega la URL de un negocio de
   HubSpot y pulsa **Traer del CRM**. ✅

> La web ya viene conectada a `/api/deal` por defecto (mismo dominio, sin CORS).
> No hay que tocar el ⚙︎ salvo que uses otro proxy (p. ej. Val Town).

## HubSpot — permisos del token
La app privada de HubSpot necesita estos scopes:
- `crm.objects.deals.read`
- `crm.objects.owners.read`  (para traer el propietario/comercial)

Propiedades de negocio que usa: `motivacion_ulterior`, `contexto_personal`,
`hubspot_owner_id`, `formulacion_global`, `nombre`, `dealname`.

## Probar la API directamente
`https://TU-PROYECTO.vercel.app/api/deal?id=494908106958`
Debe devolver un JSON con `motivacion_ulterior`, `contexto_personal`, `nombre`,
`formacion` y `owner_firstname`.

## Notas
- Todo gratis: Vercel (plan Hobby) + HubSpot.
- Los dosieres y presupuestos salen de Google Drive (enlaces dentro de la web);
  asegúrate de que están compartidos como "cualquiera con el enlace" para que el
  lead pueda abrirlos.
