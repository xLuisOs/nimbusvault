from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Configuración leída de variables de entorno (o del archivo .env)."""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "NimbusVault API"
    entorno: str = "desarrollo"  # desarrollo | pruebas | produccion

    database_url: str = "postgresql+psycopg://nimbus:nimbus@localhost:5432/nimbusvault"

    # JWT
    jwt_secret: str = "cambia-esto-en-produccion"
    jwt_algoritmo: str = "HS256"
    access_token_minutos: int = 15
    refresh_token_dias: int = 7

    # Tokens de un solo uso
    verificacion_horas: int = 24
    recuperacion_minutos: int = 30

    # URL del frontend, se usa para armar los enlaces de los correos
    frontend_url: str = "http://localhost:5173"
    cors_origins: str = "http://localhost:5173"

    # Correo: "consola" imprime el correo en el log, "smtp" lo envía (Mailpit en local)
    email_backend: str = "consola"
    smtp_host: str = "localhost"
    smtp_port: int = 1025
    smtp_usuario: str = ""
    smtp_password: str = ""
    smtp_tls: bool = False
    email_remitente: str = "NimbusVault <no-reply@nimbusvault.local>"

    # Cookie del refresh token
    cookie_secure: bool = False

    # Admin inicial que crea el seed
    admin_correo: str = "admin@nimbusvault.local"
    admin_password: str = "Admin12345!"

    @property
    def lista_cors(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
