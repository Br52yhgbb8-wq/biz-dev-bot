"""Start the Biz Dev Bot server locally with SQLite.

Usage:
    python start_server.py

This will:
    1. Create all database tables (if they don't exist)
    2. Start the FastAPI server on http://localhost:8000
"""
import sys
sys.path.insert(0, ".")

import asyncio
from app.database import init_db, engine

# Create tables before starting the server
asyncio.run(init_db())

import uvicorn
from app.main import app
uvicorn.run(app, host="0.0.0.0", port=8000)
