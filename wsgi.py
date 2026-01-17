import os

from app import create_app


def _get_env_name() -> str:
    # Keep backward-compat with existing docs that use FLASK_ENV.
    return os.environ.get("FLASK_ENV", "production")


app = create_app(_get_env_name())
