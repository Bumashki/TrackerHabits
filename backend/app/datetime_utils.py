"""ISO 8601 в UTC с суффиксом Z — чтобы в браузере Date() однозначно парсил UTC."""
from datetime import datetime, timezone


def isoformat_utc_z(dt: datetime | None) -> str:
    if not dt:
        return ""
    u = dt.replace(tzinfo=timezone.utc) if dt.tzinfo is None else dt.astimezone(timezone.utc)
    return u.isoformat().replace("+00:00", "Z")
