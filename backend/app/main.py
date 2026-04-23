from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import health, calculos, localidades, storage_health, auth
from app.utils.config import CM_APP_CORS_ORIGINS

app = FastAPI(title="ConstruBot API", version="0.1.0", docs_url="/docs", redoc_url="/redoc")

app.add_middleware(
    CORSMiddleware,
    allow_origins=CM_APP_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["*"],
)

app.include_router(health.router, prefix="/api", tags=["Health"])
app.include_router(calculos.router, prefix="/api", tags=["Calculos"])
app.include_router(localidades.router, prefix="/api", tags=["Localidades"])
app.include_router(storage_health.router, prefix="/api", tags=["Health"])
app.include_router(auth.router, prefix="/api/auth", tags=["Auth"])
