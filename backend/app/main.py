from datetime import datetime, timezone

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="ConstruBot API",
    description="WhatsApp-like messaging application backend",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://construbot-frontend.azurewebsites.net",
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["*"],
)


@app.get("/api/health", tags=["Health"])
async def health_check() -> dict:
    """Health check endpoint to verify the backend is running."""
    return {
        "status": "ok",
        "message": "Backend is running",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "version": "0.1.0",
    }
