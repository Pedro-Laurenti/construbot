import inspect
import logging
from datetime import datetime, timezone
from typing import Any, Dict

from fastapi import HTTPException


def raise_http_error(code: int, msg: str):
    raise HTTPException(status_code=code, detail={"status": "error", "error": msg})


def create_response(status: str, data: Any = None) -> Dict[str, Any]:
    result: Dict[str, Any] = {"status": status}
    if data is not None:
        result["data"] = data
    return result


def create_error_response(msg: str) -> Dict[str, Any]:
    return {"status": "error", "error": msg}


def get_current_timestamp() -> str:
    return datetime.now(timezone.utc).isoformat()


def get_module_logger() -> logging.Logger:
    frame = inspect.stack()[1]
    return logging.getLogger(frame[0].f_globals.get("__name__", __name__))
