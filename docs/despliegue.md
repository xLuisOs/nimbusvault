# Despliegue en Render

NimbusVault se publica en [Render](https://render.com) con el plan gratuito. Toda la infraestructura de Render está descrita en [`render.yaml`](../render.yaml) (Blueprint): Render lo lee y crea la API y el frontend. La base de datos y los archivos viven en Supabase.

```
navegador ──https──> nimbusvault-web  (nginx + React)
                          │  /api/*  (mismo dominio → la cookie de sesión funciona)
                          ▼
                     nimbusvault-api  (FastAPI) ──> Supabase PostgreSQL (metadatos)
                          ├──> Supabase Storage (contenido de los archivos)
                          └──> Brevo (correos de verificación y recuperación)
```

## Por qué Render

| | Render (gratis) | Railway |
|---|---|---|
| Costo | $0, 750 h/mes | $5 una sola vez, luego $1/mes |
| Desventaja | El servicio se duerme tras 15 min sin uso (~1 min en despertar) | El crédito no alcanza para 3 servicios |

Para la base de datos usamos el **PostgreSQL de Supabase** y no el de Render: el de Render vence a los 30 días, el de Supabase no (solo se pausa si pasa 7 días sin uso y se reactiva desde su panel). Además se pueden ver las tablas desde el panel de Supabase. Los servicios de Render están en Virginia, la misma zona que Supabase (`us-east-1`), para que cada consulta viaje poco.

En los dos el **SMTP está bloqueado** en los planes baratos, por eso en producción el correo sale por la API HTTPS de Brevo (`EMAIL_BACKEND=brevo`) en lugar de Mailpit.

## Qué cambia entre local y producción

| | Local (`docker compose up`) | Render |
|---|---|---|
| Puerto | 8000 (API), 80 → 5173 (web) | Render define `PORT=10000` |
| nginx reenvía `/api` a | `http://backend:8000` | `https://nimbusvault-api.onrender.com` (`API_UPSTREAM`) |
| Base de datos | contenedor `db` | PostgreSQL de Supabase (`DATABASE_URL` secreto) |
| Correo | Mailpit | Brevo |
| Cookie de sesión | `secure=false` (http) | `secure=true` (https) |
| `JWT_SECRET` | valor de desarrollo | aleatorio, lo genera Render |

Las migraciones y el seed corren solos cada vez que arranca la API (ver `backend/Dockerfile`).

## Paso a paso

### 1. Brevo (correos)

1. Crear cuenta en <https://www.brevo.com> (gratis, 300 correos al día).
2. **Senders, Domains & Dedicated IPs → Senders → Add a sender**: poner el correo del equipo (por ejemplo un Gmail) y confirmarlo desde el correo que llega.
3. **SMTP & API → API Keys → Generate a new API key**. Copiarla (solo se muestra una vez).

### 2. Supabase (base de datos y archivos)

Pedir a quien administra el proyecto de Supabase:
- `DATABASE_URL`: **Connect → Session pooler** (host `aws-0-us-east-1.pooler.supabase.com`, puerto `5432`). Empieza con `postgresql://postgres.<proyecto>:<contraseña>@...`; Render lo acepta así. No usar la conexión directa (`db.<proyecto>.supabase.co`): es solo IPv6 y Render no la alcanza. Si la contraseña tiene caracteres como `@`, `#` o `/`, hay que escribirlos codificados (`%40`, `%23`, `%2F`).
- `S3_ENDPOINT_URL`: `https://<proyecto>.supabase.co/storage/v1`
- `S3_ACCESS_KEY` y `S3_SECRET_KEY`: la *service_role key* (**Project Settings → API Keys → Legacy API keys**, empieza con `eyJ`), la misma en las dos.

**Antes del primer despliegue**, revisar en el *Table Editor* de Supabase:
- Si ya hay tablas creadas a mano (sin la tabla `alembic_version`), borrarlas: las migraciones de Alembic las crean solas y fallan si ya existen.
- Si ya existe el usuario `admin@nimbusvault.local`, cambiarle la contraseña o borrarlo: el seed no sobrescribe un administrador existente, y si alguien lo creó con la contraseña de desarrollo, cualquiera que lea el repo podría entrar.

### 3. Render

1. Crear cuenta en <https://render.com> **con GitHub** y darle acceso al repositorio `nimbusvault`.
2. **New → Blueprint**, elegir el repositorio y la rama a desplegar (`develop` mientras estamos en avances; `main` para la entrega final).
3. Render lee `render.yaml` y pide los valores secretos:

   | Variable | Valor |
   |---|---|
   | `DATABASE_URL` | la del *Session pooler* del paso 2 |
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
- **Supabase pausa el proyecto gratis tras 7 días sin actividad.** Si pasa, la API no arranca (no se conecta a la base): entrar al panel de Supabase y darle *Restore project*. Antes de una demo, revisar que esté activo.
- La base de producción es compartida: **no correr las pruebas ni el seed de desarrollo contra ella** (las pruebas borran todas las tablas).
- **Nunca** subir llaves al repositorio: solo se ponen en el dashboard de Render (`sync: false` en `render.yaml`).
