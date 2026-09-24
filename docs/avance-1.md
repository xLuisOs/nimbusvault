# Avance funcional 1 (30 %), 25 de septiembre de 2026

Criterio que pusimos en la propuesta (sección 10.2): *registro, autenticación y catálogo de planes operativos de extremo a extremo*.

## Qué está funcionando

| Requisito | Qué se implementó | Dónde |
|---|---|---|
| RF-01 Registro | Formulario conectado a `POST /api/auth/registro`. Valida correo único, contraseña (8+ caracteres, letras y números) y aceptación de términos. | `modules/auth`, `pages/auth/SignUp.tsx` |
| RF-02 Validación de correo | Se envía un enlace de un solo uso que vence en 24 h. Hasta confirmar, la cuenta queda `pendiente` y no puede entrar. Se puede reenviar. | `pages/auth/VerifyEmail.tsx` |
| RF-03 Inicio de sesión | JWT de acceso (15 min) y refresh token en cookie httpOnly (7 días) que rota en cada uso. La sesión sobrevive a recargar la página. | `core/security.py`, `context/AuthContext.tsx` |
| RF-04 Recuperar contraseña | Enlace de 30 min, un solo uso. Al cambiarla se cierran todas las sesiones abiertas. No revela si un correo existe. | `pages/auth/ForgotPassword.tsx`, `ResetPassword.tsx` |
| RF-05 Roles | Administrador y Cliente (Soporte creado en la BD). Rutas protegidas en frontend y backend: un cliente no entra a `/admin` ni a `/api/admin/*`. | `core/deps.py`, `components/routing/ProtectedRoute.tsx` |
| RF-06 Catálogo de planes | Landing y página de planes leen de `GET /api/planes`. Nada de precios quemados en el código. | `pages/Landing.tsx`, `pages/Plans.tsx` |
| RF-18 Gestión de planes | El admin crea, edita, activa/desactiva y elimina planes. Si un plan tiene suscripciones no se borra, se desactiva. | `pages/admin/AdminPlans.tsx` |
| RN-02 Todo usuario con plan | Al confirmar el correo se asigna el plan Gratis (5 GB). El dashboard muestra el plan real. | `modules/suscripciones` |
| RNF-01 | Contraseñas con bcrypt. | `core/security.py` |
| RNF-11 | Todo corre con `docker compose up`. | `docker-compose.yml` |

Además: 13 pruebas automáticas (`pytest`) y CI en GitHub Actions.

## Qué sigue siendo solo diseño (datos de ejemplo)

Explorador de archivos, consumo, historial de pagos, checkout y el dashboard/usuarios/infra del admin. Se conectan en el Avance 2 (50 %): contratación de planes y carga/descarga de archivos.

## Guion de la demo (unos 5 minutos)

1. **Landing** (`/`): bajar a "Planes" y decir que los precios salen de la base de datos.
2. **Admin**: iniciar sesión como admin, ir a Planes, cambiar el precio de "Personal" y volver al landing para mostrar que ya cambió. Esto es lo que más impresiona.
3. **Registro**: crear una cuenta nueva. Mostrar la pantalla de "Revisa tu correo".
4. **Intentar entrar sin verificar**: aparece el aviso y el botón de reenviar.
5. **Mailpit** (`localhost:8025`): abrir el correo y darle clic al enlace. Cuenta activada.
6. **Login**: entra al dashboard con su nombre y el plan Gratis de 5 GB. Recargar la página: sigue la sesión.
7. **Seguridad**: con la sesión de cliente, escribir `/admin` en la URL, y lo regresa al dashboard. Abrir `/api/docs` y mostrar los endpoints.
8. **Recuperar contraseña**: pedir el enlace, abrirlo en Mailpit y cambiarla.
9. **Cierre**: mostrar el repo, las ramas, un PR con revisión y el CI en verde.

## Preguntas que pueden hacer

- **¿Por qué el refresh token va en una cookie y no en localStorage?** Porque es httpOnly: JavaScript no la puede leer, así que un script malicioso (XSS) no puede robar la sesión.
- **¿Por qué guardan el hash de los tokens y no el token?** Si alguien lee la tabla, no puede usar los enlaces de verificación ni las sesiones.
- **¿Por qué `precio_contratado` en suscripciones?** Si el admin sube el precio de un plan, al que ya pagó no le cambia su precio.
- **¿Por qué monolito modular y no microservicios?** Somos 4 personas con 10 semanas. Cada módulo tiene fronteras claras (`modules/*`) y se podría separar después.
