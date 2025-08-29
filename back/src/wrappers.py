"""Flask decorators."""

from datetime import datetime, timedelta, timezone
from functools import wraps

from flask import jsonify, request, g
import jwt

from db import Database, UserWithoutPassword

JWT_SECRET = "super-secret-key"  # noqa: S105
JWT_ALGORITHM = "HS256"


def jwt_required(f):
    """Protect routes that require a JWT."""

    @wraps(f)
    def decorated_function(*args, **kwargs):
        token = None
        if "Authorization" in request.headers:
            auth_header = request.headers["Authorization"]
            try:
                token = auth_header.split(" ")[1]
            except IndexError:
                return jsonify({"message": "Bearer token malformed."}), 401

        if not token:
            return jsonify({"message": "Authentication token is missing."}), 401

        try:
            data = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
            g.user = Database.get_user_by_uuid(data.get("uuid"))
            if g.user is None:
                return jsonify({"message": "Invalid token."}), 401
        except jwt.ExpiredSignatureError:
            return jsonify({"message": "Token has expired."}), 401
        except jwt.InvalidTokenError:
            return jsonify({"message": "Invalid token."}), 401

        return f(*args, **kwargs)

    return decorated_function


def admin_required(f):
    """Protect routes that require admin privileges."""

    @wraps(f)
    def decorated_function(*args, **kwargs) -> None:
        if g.user["role"] != "admin":
            return jsonify({"message": "Admin privileges required."}), 403
        return f(*args, **kwargs)

    return decorated_function


def encode_jwt(user: UserWithoutPassword) -> str:
    """Create a JWT."""
    return jwt.encode(
        payload={
            "uuid": user["uuid"],
            "username": user["username"],
            "role": user["role"],
            "exp": datetime.now(timezone.utc) + timedelta(hours=24),
        },
        key=JWT_SECRET,
        algorithm=JWT_ALGORITHM,
    )
