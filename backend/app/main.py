from fastapi import APIRouter, FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.modules.auth.router import router as auth_router
from app.modules.planes.router import admin_router as admin_planes_router
from app.modules.planes.router import router as planes_router

app = FastAPI(
    title=settings.app_name,
    version="0.3.0",
    description="API de NimbusVault — Storage as a Service (Ingeniería de Software I, URL 2026)",
    docs_url="/api/docs",
    openapi_url="/api/openapi.json",
)

# En local el frontend usa el proxy de Vite (mismo origen), pero dejamos CORS por si
# alguien corre el front apuntando directo al puerto 8000.
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.lista_cors,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

api = APIRouter(prefix="/api")


@api.get("/health", tags=["Sistema"])
def health():
    return {"estado": "ok", "entorno": settings.entorno}


api.include_router(auth_router)
api.include_router(planes_router)
api.include_router(admin_planes_router)
# Avance 2: api.include_router(archivos_router), api.include_router(suscripciones_router), ...

app.include_router(api)
