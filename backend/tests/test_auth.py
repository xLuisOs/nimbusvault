from tests.conftest import login, registrar_y_verificar, token_del_ultimo_correo

REGISTRO = {"nombre": "Ana Torres", "correo": "Ana@Test.com", "password": "Segura123", "acepto_terminos": True}


def test_registro_envia_correo_y_queda_pendiente(client):
    r = client.post("/api/auth/registro", json=REGISTRO)
    assert r.status_code == 201
    r = client.post("/api/auth/login", json={"correo": "ana@test.com", "password": "Segura123"})
    assert r.status_code == 403
    assert r.json()["detail"] == "correo_no_verificado"


def test_no_permite_correo_duplicado_sin_importar_mayusculas(client):
    client.post("/api/auth/registro", json=REGISTRO)
    r = client.post("/api/auth/registro", json={**REGISTRO, "correo": "ANA@test.com"})
    assert r.status_code == 409


def test_valida_password_y_terminos(client):
    assert client.post("/api/auth/registro", json={**REGISTRO, "password": "corta"}).status_code == 422
    assert client.post("/api/auth/registro", json={**REGISTRO, "password": "sololetras"}).status_code == 422
    assert client.post("/api/auth/registro", json={**REGISTRO, "acepto_terminos": False}).status_code == 422


def test_verificar_activa_cuenta_y_asigna_plan_gratis(client):
    registrar_y_verificar(client)
    access = login(client, "ana@test.com", "Segura123")
    me = client.get("/api/auth/me", headers={"Authorization": f"Bearer {access}"}).json()
    assert me["estado"] == "activo"
    assert me["rol"] == "CLIENTE"
    assert me["suscripcion"]["plan_codigo"] == "gratis"


def test_token_de_verificacion_es_de_un_solo_uso(client):
    client.post("/api/auth/registro", json=REGISTRO)
    token = token_del_ultimo_correo()
    assert client.post("/api/auth/verificar-correo", json={"token": token}).status_code == 200
    assert client.post("/api/auth/verificar-correo", json={"token": token}).status_code == 400


def test_login_con_password_incorrecta(client):
    registrar_y_verificar(client)
    r = client.post("/api/auth/login", json={"correo": "ana@test.com", "password": "Otra12345"})
    assert r.status_code == 401


def test_me_sin_token_es_401(client):
    assert client.get("/api/auth/me").status_code == 401
    assert client.get("/api/auth/me", headers={"Authorization": "Bearer basura"}).status_code == 401


def test_refresh_rota_la_cookie_y_logout_la_revoca(client):
    registrar_y_verificar(client)
    login(client, "ana@test.com", "Segura123")
    viejo = client.cookies.get("nv_refresh")
    r = client.post("/api/auth/refresh")
    assert r.status_code == 200
    assert client.cookies.get("nv_refresh") != viejo

    # El refresh viejo ya no sirve (rotación)
    nuevo = client.cookies.get("nv_refresh")
    client.cookies.set("nv_refresh", viejo, path="/api/auth")
    assert client.post("/api/auth/refresh").status_code == 401
    client.cookies.clear()
    client.cookies.set("nv_refresh", nuevo, path="/api/auth")

    assert client.post("/api/auth/logout").status_code == 200
    # Aunque alguien guarde la cookie, después del logout ya no sirve
    client.cookies.clear()
    client.cookies.set("nv_refresh", nuevo, path="/api/auth")
    assert client.post("/api/auth/refresh").status_code == 401


def test_recuperar_contrasena(client):
    registrar_y_verificar(client)
    # Responde igual si el correo no existe (no revela cuentas)
    r = client.post("/api/auth/olvide-contrasena", json={"correo": "nadie@test.com"})
    assert r.status_code == 200

    client.post("/api/auth/olvide-contrasena", json={"correo": "ana@test.com"})
    token = token_del_ultimo_correo()
    r = client.post("/api/auth/restablecer-contrasena", json={"token": token, "password": "Nueva12345"})
    assert r.status_code == 200

    assert client.post("/api/auth/login", json={"correo": "ana@test.com", "password": "Segura123"}).status_code == 401
    login(client, "ana@test.com", "Nueva12345")
    # El enlace no se puede reutilizar
    r = client.post("/api/auth/restablecer-contrasena", json={"token": token, "password": "Otra123456"})
    assert r.status_code == 400
