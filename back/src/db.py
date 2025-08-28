"""Database helper class and types."""

from __future__ import annotations
from typing import TypedDict, Literal
import sys
import json
import uuid
from pathlib import Path
import logging
from functools import wraps

logger = logging.getLogger(__name__)


class UserWithoutPassword(TypedDict):
    """User dictionary without the password."""

    uuid: str  # Unique
    username: str  # Unique
    role: Literal["user", "admin"]  # Not unique


class User(UserWithoutPassword):
    """User dictionary representing the expected structure in the data file."""

    password: str  # Not unique


class Database:
    """Database helper class."""

    DATA_FILE = Path("./data.json")

    # Internal input/output

    @staticmethod
    def _data_file_required(f):
        """Ensure the data file exists. Only use this to decorate functions that directly interact with the file."""

        @wraps(f)
        def decorated_function(*args, **kwargs):
            if not Path.exists(Database.DATA_FILE):
                logger.error(
                    "Error: data file (`back/data.json`) does not exist. Backend can operate only as long as it exists."
                )
                logger.info(
                    "Note: the backend cannot create the data file on its own. You can restore it from the Git history."
                )
                sys.exit(1)
            return f(*args, **kwargs)

        return decorated_function

    @staticmethod
    @_data_file_required
    def _write_users(users: list[User]) -> None:
        """Write the user data to the JSON file."""
        with Path.open(Database.DATA_FILE, "w") as f:
            json.dump({"users": users}, f, indent=2)

    @staticmethod
    @_data_file_required
    def _read_users() -> list[User]:
        """Read the user data from the JSON file."""
        with Path.open(Database.DATA_FILE, "r") as f:
            return json.load(f)["users"]

    # API

    @staticmethod
    @_data_file_required
    def get_users() -> list[User]:
        """Read the user data from the JSON file."""
        return Database._read_users()

    @staticmethod
    def get_users_without_passwords() -> list[UserWithoutPassword]:
        """Read the user data from the JSON file."""
        users = Database._read_users()
        for user in users:
            del user["password"]
        return users

    @staticmethod
    def get_user_by_uuid(uuid: str) -> User | None:
        """Retrieve a user by uuid. Useful for validating JWT."""
        for user in Database._read_users():
            if user["uuid"] == uuid:
                return user
        return None

    @staticmethod
    def get_user_by_username(username: str) -> User | None:
        """Retrieve a user by their username. Useful for logging in."""
        for user in Database._read_users():
            if user["username"] == username:
                return user
        return None

    @staticmethod
    def create_user(
        username: str, role: str, password: str
    ) -> UserWithoutPassword | None:
        """Create a user and save it in the data file. Returns the created user, or None if creation failed due to user duplication."""
        users: list[User] = Database._read_users()
        for user in users:
            if user["username"] == username:
                return None

        user: User = {
            "username": username,
            "role": role,
            "password": password,
            "uuid": str(uuid.uuid4()),
        }

        users.append(user)
        Database._write_users(users)

        del user["password"]

        return user
