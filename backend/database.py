import os
import logging
from sqlalchemy import create_engine, text
from sqlalchemy.orm import declarative_base, sessionmaker
from dotenv import load_dotenv

# Configure logging
logger = logging.getLogger("mediguardian.database")

load_dotenv()

# Read DATABASE_URL from environment (Render / .env)
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL")

if not SQLALCHEMY_DATABASE_URL:
    error_msg = (
        "DATABASE_URL environment variable is missing. "
        "Please configure DATABASE_URL in your .env file or Render dashboard environment variables."
    )
    logger.critical(error_msg)
    raise RuntimeError(error_msg)

# Convert legacy/Render postgres:// to postgresql:// if needed for SQLAlchemy compatibility
if SQLALCHEMY_DATABASE_URL.startswith("postgres://"):
    SQLALCHEMY_DATABASE_URL = SQLALCHEMY_DATABASE_URL.replace("postgres://", "postgresql://", 1)

# Supabase PostgreSQL database engine with connection pooling and pre-ping checks
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    pool_pre_ping=True,
    pool_recycle=300,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def test_db_connection() -> tuple[bool, str]:
    """Test connection to Supabase PostgreSQL database."""
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        logger.info("Successfully connected to Supabase PostgreSQL database.")
        return True, "Successfully connected to Supabase PostgreSQL database."
    except Exception as e:
        error_msg = f"Failed to connect to Supabase PostgreSQL: {e}"
        logger.error(error_msg)
        return False, error_msg


def init_db():
    """Ensure database migrations/tables are created."""
    try:
        Base.metadata.create_all(bind=engine)
        logger.info("Database tables verified/created successfully.")
    except Exception as e:
        logger.error(f"Failed to create database tables: {e}")
        raise

