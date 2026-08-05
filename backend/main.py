from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import engine, Base
from api import routes
import models

# Initialize database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="MediGuardian AI API",
    description="Enterprise Backend for Medical Report Cross-Checker",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for development
    allow_credentials=True,
    allow_methods=["*"],  # Allow all methods
    allow_headers=["*"],  # Allow all headers
)

# Include API routes
app.include_router(routes.router, prefix="/api/v1")

@app.get("/")
def read_root():
    return {"status": "ok", "message": "MediGuardian AI Backend Foundation"}
