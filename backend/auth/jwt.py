import base64
import hashlib
import hmac
import json
from datetime import datetime, timedelta, timezone
from typing import Any


class TokenError(Exception):
    """Raised when a JWT cannot be trusted."""


def _b64encode(value: bytes) -> str:
    return base64.urlsafe_b64encode(value).decode("ascii").rstrip("=")


def _b64decode(value: str) -> bytes:
    padding = "=" * (-len(value) % 4)
    return base64.urlsafe_b64decode(f"{value}{padding}".encode("ascii"))


def _json_encode(value: dict[str, Any]) -> bytes:
    return json.dumps(value, separators=(",", ":"), sort_keys=True).encode("utf-8")


def _sign(signing_input: str, secret: str) -> str:
    digest = hmac.new(secret.encode("utf-8"), signing_input.encode("ascii"), hashlib.sha256).digest()
    return _b64encode(digest)


def create_access_token(
    *,
    subject: str,
    role: str,
    secret: str,
    expires_delta: timedelta,
    algorithm: str = "HS256",
) -> str:
    if algorithm != "HS256":
        raise ValueError("Only HS256 JWT signing is supported.")
    if not secret:
        raise ValueError("JWT secret is not configured.")

    now = datetime.now(timezone.utc)
    payload = {
        "sub": subject,
        "role": role,
        "type": "access",
        "iat": int(now.timestamp()),
        "exp": int((now + expires_delta).timestamp()),
    }
    header = {"alg": algorithm, "typ": "JWT"}
    signing_input = ".".join(
        (
            _b64encode(_json_encode(header)),
            _b64encode(_json_encode(payload)),
        )
    )
    return f"{signing_input}.{_sign(signing_input, secret)}"


def decode_access_token(token: str, *, secret: str, algorithm: str = "HS256") -> dict[str, Any]:
    if algorithm != "HS256":
        raise TokenError("Unsupported JWT algorithm.")
    if not secret:
        raise TokenError("JWT secret is not configured.")

    try:
        header_text, payload_text, signature = token.split(".", 2)
        signing_input = f"{header_text}.{payload_text}"
        expected_signature = _sign(signing_input, secret)
        if not hmac.compare_digest(signature, expected_signature):
            raise TokenError("Invalid token signature.")

        header = json.loads(_b64decode(header_text))
        payload = json.loads(_b64decode(payload_text))
    except (ValueError, json.JSONDecodeError, UnicodeDecodeError) as exc:
        raise TokenError("Invalid token.") from exc

    if header.get("alg") != algorithm or header.get("typ") != "JWT":
        raise TokenError("Invalid token header.")
    if payload.get("type") != "access":
        raise TokenError("Invalid token type.")
    if not payload.get("sub"):
        raise TokenError("Invalid token subject.")

    now = int(datetime.now(timezone.utc).timestamp())
    try:
        expires_at = int(payload["exp"])
    except (KeyError, TypeError, ValueError) as exc:
        raise TokenError("Invalid token expiration.") from exc
    if expires_at <= now:
        raise TokenError("Token has expired.")

    return payload
