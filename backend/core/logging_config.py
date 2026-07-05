import logging.config
import sys

LOGGING_CONFIG = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "default": {
            "format": "%(asctime)s - %(name)s - %(levelname)s - %(message)s",
            "datefmt": "%Y-%m-%d %H:%M:%S",
        },
        "access": {
            "format": "%(asctime)s - %(levelname)s - %(message)s",
            "datefmt": "%Y-%m-%d %H:%M:%S",
        },
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "formatter": "default",
            "stream": sys.stdout,
        },
        "access_console": {
            "class": "logging.StreamHandler",
            "formatter": "access",
            "stream": sys.stdout,
        },
    },
    "loggers": {
        "root": {
            "handlers": ["console"],
            "level": "INFO",
        },
        "api": {
            "handlers": ["console"],
            "level": "INFO",
            "propagate": False,
        },
        "api.access": {
            "handlers": ["access_console"],
            "level": "INFO",
            "propagate": False,
        },
        "seed": {
            "handlers": ["console"],
            "level": "INFO",
            "propagate": False,
        },
    },
}

def setup_logging():
    logging.config.dictConfig(LOGGING_CONFIG)
