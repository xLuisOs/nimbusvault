# Módulo de Pagos (Avance 2)

Contratación, renovación e historial de pagos simulados (RF-07, RF-08, RF-09).

- `models.py`  → `Pago` (numero_comprobante único, tipo, estado), `MetodoPago` (solo marca + últimos 4 dígitos)
- `service.py` → contratar plan: cancelar la suscripción activa, crear la nueva y registrar el pago en UNA transacción
- `router.py`  → `/api/suscripciones/contratar`, `/api/pagos`

Nunca guardar el número completo de tarjeta ni el CVV, aunque sea simulado.
