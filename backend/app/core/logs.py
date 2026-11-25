import logging

from app.core.config import settings


def setup_logging():
    """Print every log line as:  time  LEVEL  where-it-came-from: message"""
    logging.basicConfig(
        level=settings.log_level,
        format="%(asctime)s %(levelname)-7s %(name)s: %(message)s",
        datefmt="%H:%M:%S",
    )
    # httpx logs every request on its own; app/llm.py already logs each model call, so keep it quiet.
    logging.getLogger("httpx").setLevel(logging.WARNING)
