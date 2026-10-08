# Módulo de Pagos (Avance 2)

Contratación de planes, historial de pagos y comprobantes simulados (RF-07, RF-09).

- `models.py`  → `Pago` (`numero_comprobante` único, `tipo` contratacion/renovacion, `estado`, `marca_tarjeta`, `ultimos_4`)
- `schemas.py` → `ContratarIn` (plan, periodicidad y tarjeta simulada), `PagoOut`
- `service.py` → contratar plan: cancela la suscripción activa, crea la nueva y registra el pago en UNA transacción;
  historial del cliente y comprobante en PDF (reportlab)
- `router.py`  → `POST /api/suscripciones/contratar`, `GET /api/pagos`, `GET /api/pagos/{id}/comprobante`
  (solo rol CLIENTE)

Reglas:
- Nunca se guarda el número completo de tarjeta ni el CVV, aunque sea simulado: solo la marca y los últimos 4 dígitos.
- El plan gratuito no se contrata (se asigna al verificar el correo).
- No se puede cambiar a un plan cuya cuota sea menor que el espacio ya usado.
- Anual: `precio_anual_mensualizado × 12` y vigencia de 365 días; mensual: `precio_mensual` y `vigencia_dias` del plan.
- Pendiente: la renovación automática (`tipo = renovacion`) todavía no se genera.
