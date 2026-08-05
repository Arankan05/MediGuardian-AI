import os
import logging
from urllib.parse import urlparse, parse_qs, urlunparse, urlencode
from sqlalchemy import create_engine, text
from sqlalchemy.orm import declarative_base, sessionmaker
from sqlalchemy.exc import OperationalError, ProgrammingError, SQLAlchemyError
from dotenv import load_dotenv

# Configure logging for database module
logger = logging.getLogger("mediguardian.database")
logger.setLevel(logging.INFO)

load_dotenv()

# Read DATABASE_URL from environment (Render / Supabase / .env)
raw_db_url = os.getenv("DATABASE_URL")

if not raw_db_url:
    error_msg = (
        "[CRITICAL] DATABASE_URL environment variable is missing. "
        "Please configure DATABASE_URL in your .env file or Render environment variables."
    )
    logger.critical(error_msg)
    raise RuntimeError(error_msg)


def prepare_database_url(url: str) -> str:
    """
    Normalizes and sanitizes the database connection URL for SQLAlchemy + psycopg2 / psycopg + Supabase / Render:
    1. Replaces legacy 'postgres://' scheme with 'postgresql://'.
    2. Strips unsupported non-libpq query parameters (e.g. 'pgbouncer', 'supavisor', 'schema', 'connection_limit')
       which trigger 'psycopg2.ProgrammingError: invalid dsn: invalid connection option "pgbouncer"'.
    3. Ensures 'sslmode=require' query parameter is present for cloud PostgreSQL providers.
    """
    url = url.strip()

    # 1. Fix legacy scheme if present (e.g., Render default postgres://)
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql://", 1)

    # 2. Parse URL and sanitize query parameters
    parsed = urlparse(url)
    query_params = parse_qs(parsed.query)

    # Remove non-libpq / unsupported parameters that break psycopg2 DSN parsing
    unsupported_params = {"pgbouncer", "supavisor", "schema", "connection_limit", "pool_timeout"}
    for param in unsupported_params:
        if param in query_params:
            logger.info(f"[DB CONFIG] Removing unsupported DSN option '{param}' from DATABASE_URL for psycopg compatibility.")
            query_params.pop(param, None)

    # 3. Ensure sslmode=require parameter is included
    if "sslmode" not in query_params:
        query_params["sslmode"] = ["require"]

    # Reconstruct clean database URL
    new_query = urlencode(query_params, doseq=True)
    clean_url = urlunparse((
        parsed.scheme,
        parsed.netloc,
        parsed.path,
        parsed.params,
        new_query,
        parsed.fragment
    ))

    return clean_url


SQLALCHEMY_DATABASE_URL = prepare_database_url(raw_db_url)


def mask_db_url(url: str) -> str:
    """Masks database password for safe logging."""
    try:
        parsed = urlparse(url)
        if parsed.password:
            netloc = parsed.netloc.replace(f":{parsed.password}@", ":****@")
            return urlunparse((parsed.scheme, netloc, parsed.path, parsed.params, parsed.query, parsed.fragment))
    except Exception:
        pass
    return "postgresql://****:****@****"


# Log masked database URL on initialization
logger.info(f"[DB CONFIG] Sanitized database target: {mask_db_url(SQLALCHEMY_DATABASE_URL)}")

# Explicit connect_args for psycopg2 / psycopg SSL & timeout compatibility
connect_args = {
    "connect_timeout": 10,
    "sslmode": "require"
}

# Supabase / Render PostgreSQL database engine setup
try:
    engine = create_engine(
        SQLALCHEMY_DATABASE_URL,
        pool_pre_ping=True,      # Verify connection validity before execution
        pool_recycle=300,        # Recycle connections every 5 minutes
        pool_size=10,
        max_overflow=20,
        connect_args=connect_args,
    )
except Exception as e:
    logger.critical(f"[DB CONFIG ERROR] Failed to create SQLAlchemy engine: {e}")
    raise

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def test_db_connection() -> tuple[bool, str]:
    """
    Tests connection to Supabase / Render PostgreSQL database with clear error reporting.
    """
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        msg = "Successfully connected to Supabase / Render PostgreSQL database."
        logger.info(f"[DB CONNECT SUCCESS] {msg}")
        return True, msg
    except (OperationalError, ProgrammingError) as oe:
        err_str = str(oe)
        diagnostic_hint = ""
        if "invalid connection option" in err_str or "pgbouncer" in err_str:
            diagnostic_hint = " HINT: Unsupported DSN parameters were detected. Remove 'pgbouncer=true' from DATABASE_URL query string."
        elif "Network is unreachable" in err_str or "could not translate host name" in err_str:
            diagnostic_hint = (
                " HINT: Render web services use IPv4 outbound networks. If direct domain (db.*.supabase.co) fails, "
                "use the Supabase Connection Pooler URL (e.g., postgresql://postgres.[REF]:[PASS]@aws-0-[REGION].pooler.supabase.com:6543/postgres?sslmode=require)."
            )
        elif "SSL" in err_str or "sslmode" in err_str:
            diagnostic_hint = " HINT: Cloud database requires SSL. Ensure 'sslmode=require' is specified."

        error_msg = f"Database connection failed: {err_str}.{diagnostic_hint}"
        logger.error(f"[DB CONNECT FAILURE] {error_msg}")
        return False, error_msg
    except Exception as e:
        error_msg = f"Database error: {e}"
        logger.error(f"[DB CONNECT FAILURE] {error_msg}")
        return False, error_msg


def init_db():
    """Ensure database schema tables are created."""
    try:
        Base.metadata.create_all(bind=engine)
        logger.info("[DB INIT SUCCESS] Database tables verified/created successfully.")
    except Exception as e:
        logger.error(f"[DB INIT FAILURE] Failed to create database tables: {e}")
        raise
