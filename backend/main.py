from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import engine, Base, test_db_connection, init_db
from api import routes
import models


import logging

logger = logging.getLogger("mediguardian.main")
logging.basicConfig(level=logging.INFO)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Test database connection on startup
    success, msg = test_db_connection()
    if success:
        logger.info(f"[STARTUP SUCCESS] {msg}")
        try:
            init_db()
        except Exception as e:
            logger.error(f"[STARTUP DB INIT ERROR] {e}")
    else:
        logger.error(f"[STARTUP ERROR] {msg}")
    yield




app = FastAPI(
    title="MediGuardian AI API",
    description="Enterprise Backend for Medical Report Cross-Checker",
    version="1.0.0",
    lifespan=lifespan,
)

import os

# Configure CORS for development and deployment environments
cors_origins_env = os.getenv("CORS_ORIGINS", "*")
cors_origins = [o.strip() for o in cors_origins_env.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=cors_origins != ["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routes
app.include_router(routes.router, prefix="/api/v1")

@app.get("/")
def read_root():
    return {"status": "ok", "message": "MediGuardian AI Backend Foundation"}


if __name__ == "__main__":
    import os
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port)

