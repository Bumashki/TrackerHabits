import re

# Латиница, цифры, подчёркивание — храним в нижнем регистре
NICKNAME_RE = re.compile(r"^[a-z0-9_]{3,32}$")


def normalize_nickname(raw: str) -> str:
    return raw.strip().lower()


def is_valid_nickname_normalized(s: str) -> bool:
    return bool(NICKNAME_RE.match(s))
