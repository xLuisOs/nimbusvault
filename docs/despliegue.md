# Despliegue en Render

NimbusVault se publica en [Render](https://render.com) con el plan gratuito. Toda la infraestructura está descrita en [`render.yaml`](../render.yaml) (Blueprint): Render lo lee y crea los tres recursos solo.

```
navegador ──https──> nimbusvault-web  (nginx + React)
                          │  /api/*  (mismo dominio → la cookie de sesión funciona)
                          ▼
                     nimbusvault-api  (FastAPI) ──> nimbusvault-db (PostgreSQL)
                          ├──> Supabase Storage (contenido de los archivos)
                          └──> Brevo (correos de verificación y recuperación)
```

## Por qué Render

| | Render (gratis) | Railway |
|---|---|---|
| Costo | $0, 750 h/mes | $5 una sola vez, luego $1/mes |
| Base de datos | Postgres 1 GB, vence a los 30 días | Se acaba con el crédito |
| Desventaja | El servicio se duerme tras 15 min sin uso (~1 min en despertar) | El crédito no alcanza para 3 servicios |

En los dos el **SMTP está bloqueado** en los planes baratos, por eso en producción el correo sale por la API HTTPS de Brevo (`EMAIL_BACKEND=brevo`) en lugar de Mailpit.

## Qué cambia entre local y producción

| | Local (`docker compose up`) | Render |
|---|---|---|
| Puerto | 8000 (API), 80 → 5173 (web) | Render define `PORT=10000` |
| nginx reenvía `/api` a | `http://backend:8000` | `https://nimbusvault-api.onrender.com` (`API_UPSTREAM`) |
| Base de datos | contenedor `db` | `nimbusvault-db` (la URL la inyecta Render) |
| Correo | Mailpit | Brevo |
| Cookie de sesión | `secure=false` (http) | `secure=true` (https) |
| `JWT_SECRET` | valor de desarrollo | aleatorio, lo genera Render |

Las migraciones y el seed corren solos cada vez que arranca la API (ver `backend/Dockerfile`).

## Paso a paso

### 1. Brevo (correos)

1. Crear cuenta en <https://www.brevo.com> (gratis, 300 correos al día).
2. **Senders, Domains & Dedicated IPs → Senders → Add a sender**: poner el correo del equipo (por ejemplo un Gmail) y confirmarlo desde el correo que llega.
3. **SMTP & API → API Keys → Generate a new API key**. Copiarla (solo se muestra una vez).

### 2. Supabase (archivos)

Pedir a quien administra el proyecto de Supabase:
- `S3_ENDPOINT_URL` (termina en `/storage/v1`)
- `S3_ACCESS_KEY` y `S3_SECRET_KEY` (la *service_role key*)

### 3. Render

1. Crear cuenta en <https://render.com> **con GitHub** y darle acceso al repositorio `nimbusvault`.
2. **New → Blueprint**, elegir el repositorio y la rama a desplegar (`develop` mientras estamos en avances; `main` para la entrega final).
3. Render lee `render.yaml` y pide los valores secretos:

   | Variable | Valor |
   |---|---|
   | `BREVO_API_KEY` | la llave del paso 1 |
   | `EMAIL_REMITENTE` | `NimbusVault <el-correo-verificado@gmail.com>` |
   | `S3_ENDPOINT_URL`, `S3_ACCESS_KEY`, `S3_SECRET_KEY` | los del paso 2 |
   | `ADMIN_CORREO` | correo del administrador |
   | `ADMIN_PASSWORD` | contraseña **fuerte** (no la de desarrollo: el sitio es público) |

4. **Apply**. La primera vez tarda unos 10 minutos en construir.
5. Si Render no pudo usar los nombres exactos y las URLs quedaron distintas (por ejemplo `nimbusvault-web-x1y2.onrender.com`), actualizar en el dashboard:
   - en `nimbusvault-api`: `FRONTEND_URL` y `CORS_ORIGINS` con la URL real del web
   - en `nimbusvault-web`: `API_UPSTREAM` con la URL real del api

### 4. Verificar

- `https://<api>.onrender.com/api/health` responde `{"estado":"ok","entorno":"produccion"}`.
- Abrir `https://<web>.onrender.com`, registrarse con un correo real: debe llegar el correo de verificación.
- Subir un archivo y descargarlo.

Cada push a la rama elegida vuelve a desplegar automáticamente.

## A tener en cuenta

- **Se duerme**: después de 15 minutos sin visitas, el primer acceso tarda ~1 minuto. Antes de una demo o de grabar, abrir el sitio un par de minutos antes.
- **La base gratis vence 30 días después de crearse** (hay 14 días de gracia para pasarla a un plan de pago). Anotar la fecha de creación: creada a mediados de octubre, alcanza para la entrega final de noviembre.
- **Nunca** subir llaves al repositorio: solo se ponen en el dashboard de Render (`sync: false` en `render.yaml`).
