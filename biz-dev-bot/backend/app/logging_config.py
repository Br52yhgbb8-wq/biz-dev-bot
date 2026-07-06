"""Structured logging configuration for the application.

Logs are written to stdout (for Docker / systemd consumption) with
consistent formatting and configurable levels.
"""

import logging
import sys
from typing import Optional


def configure_logging(level: Optional[str] = None) -> None:
    """Configure the root logger and key third-party loggers.

    Args:
        level: Log level string (DEBUG, INFO, WARNING, ERROR).
               Falls back to INFO if not provided.
    """
    log_level = (level or "INFO").upper()

    handler = logging.StreamHandler(sys.stdout)
    handler.setLevel(log_level)
    formatter = logging.Formatter(
        fmt="%(asctime)s  %(levelname)-8s  %(name)s  %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )
    handler.setFormatter(formatter)

    root = logging.getLogger()
    root.setLevel(log_level)
    # Remove any existing handlers to avoid duplicates on reinit
    root.handlers.clear()
    root.addHandler(handler)

    # Tame noisy third-party loggers
    for name in ("httpx", "httpcore", "urllib3", "asyncio"):
        logging.getLogger(name).setLevel(logging.WARNING)

    logging.getLogger("apscheduler").setLevel(logging.WARNING)
    logging.getLogger("alembic").setLevel(logging.INFO)

    logging.info("Logging configured at %s level", log_level)


def get_logger(name: str) -> logging.Logger:
    """Get a logger with the given name, configured for this app."""
    return logging.getLogger(name)
