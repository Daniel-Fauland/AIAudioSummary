import logging
from config import config

# Map the string to logging level
LOGGING_LEVELS = {
    "DEBUG": logging.DEBUG,
    "INFO": logging.INFO,
    "WARNING": logging.WARNING,
    "ERROR": logging.ERROR,
    "CRITICAL": logging.CRITICAL,
}

# Configuring logging format and log level
logging.basicConfig(
    format="%(asctime)-20s | %(levelname)-10s | %(filename)s:%(lineno)-17s | %(funcName)-30s | \n%(message)s\n",
    datefmt="%Y-%m-%d %H:%M:%S",
    level=LOGGING_LEVELS.get(config.logging_level, logging.INFO),
)
logger = logging.getLogger(__name__)
