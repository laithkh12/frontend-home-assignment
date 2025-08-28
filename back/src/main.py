"""Entry point and endpoint definitions."""

from datetime import datetime, timedelta, timezone
from functools import wraps

import jwt
from flask import Flask, jsonify, request, g
from flask_cors import CORS

from db import Database

app = Flask(__name__)
CORS(app)

JWT_SECRET = "super-secret-key"  # noqa: S105
JWT_ALGORITHM = "HS256"


def jwt_required(f) -> None:
    """Protect routes that require a JWT."""

    @wraps(f)
    def decorated_function(*args, **kwargs) -> None:
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


@app.route("/api/login", methods=["POST"])
def login() -> jsonify:
    """Authenticate a user and return a JWT."""
    data = request.get_json()
    if not data or not all((field in data) for field in ["username", "password"]):
        return jsonify({"message": "Username and password are required."}), 400

    user = Database.get_user_by_username(data.get("username"))
    if user is None or user["password"] != data.get("password"):
        return jsonify({"message": "Invalid credentials."}), 401

    token = jwt.encode(
        payload={
            "uuid": user["uuid"],
            "username": user["username"],
            "role": user["role"],
            "exp": datetime.now(timezone.utc) + timedelta(hours=24),
        },
        key=JWT_SECRET,
        algorithm=JWT_ALGORITHM,
    )

    # Question: can't the frontend get the role and the username from the returned token? Why return it in separate fields?
    return jsonify(
        {"token": token, "role": user["role"], "username": user["username"]}
    ), 200


@app.route("/api/users", methods=["GET"])
@jwt_required
@admin_required
def get_users() -> jsonify:
    """Return a list of all users."""
    return jsonify(Database.get_users_without_passwords()), 200


@app.route("/api/users", methods=["POST"])
@admin_required
@jwt_required
def create_user() -> jsonify:
    """Create a new user."""
    data = request.get_json()
    if not data or not all(field in data for field in ["username", "password", "role"]):
        return jsonify({"message": "Missing required user data."}), 400

    user = Database.create_user(
        username=data.get("username"),
        password=data.get("password"),
        role=data.get("role"),
    )

    if user is None:
        return jsonify({"message": "Username already exists"}), 409

    return jsonify(user), 201


def tests() -> None:
    print("Get users:")
    print(Database.get_users())
    print("Get users without passwords:")
    print(Database.get_users_without_passwords())
    print("Get user by username:")
    print(Database.get_user_by_username("John Smith"))
    print("Get user by username that doesn't exist:")
    print(Database.get_user_by_username("aklsdhjalksjdh"))

if __name__ == "__main__":
    tests()
    app.run(port=8000)
