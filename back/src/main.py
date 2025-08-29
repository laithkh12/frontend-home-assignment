"""Entry point and endpoint definitions."""

from flask import Flask, jsonify, request, g
from flask_cors import CORS

from db import Database, User
from wrappers import jwt_required, admin_required, encode_jwt

app = Flask(__name__)
CORS(app)


@app.route("/api/login", methods=["POST"])
def login() -> jsonify:
    """Authenticate a user and return a JWT.

    Returns: if login was successful, the created JWT and the logged-in user {"token": token, "username": username, "role": role, "uuid": uuid}
    """
    data = request.get_json()
    if not data or not all((field in data) for field in ["username", "password"]):
        return jsonify({"message": "Username and password are required."}), 400

    user: User = Database.get_user_by_username(data.get("username"))
    if user is None or user["password"] != data.get("password"):
        return jsonify({"message": "Invalid credentials."}), 401

    del user["password"]

    token = encode_jwt(user)

    return jsonify({"token": token} | user), 200


@app.route("/api/users", methods=["GET"])
@jwt_required
@admin_required
def get_users() -> jsonify:
    """Return a list of all users.

    Returns: list of users [{"username": username, "role": role, "uuid": uuid}, ...]
    """
    return jsonify(Database.get_users_without_passwords()), 200


@app.route("/api/users", methods=["POST"])
@jwt_required
@admin_required
def create_user() -> jsonify:
    """Create a new user.

    Returns: if creation was successful, the created user {"username": username, "role": role, "uuid": uuid}
    """
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


@app.route("/api/users/<string:uuid>", methods=["DELETE"])
@jwt_required
@admin_required
def delete_user(uuid: str) -> jsonify:
    """Delete a user by uuid.

    Returns: if deletion was successful, just status code 204.
    """
    if g.user["uuid"] == uuid:
        return jsonify({"message": "Cannot delete self"}), 403

    if Database.delete_user_by_uuid(uuid):
        return jsonify({"message": "User deleted"}), 204

    return jsonify({"message": "User not found."}), 404


if __name__ == "__main__":
    app.run(debug=True, port=8000, host="0.0.0.0")
