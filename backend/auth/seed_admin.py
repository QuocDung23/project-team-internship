import argparse
import os
from getpass import getpass

from backend.auth.roles import UserRole
from backend.models.auth import UserCreate
from backend.repositories.user_repository import UserRepository
from backend.services.user_service import UserService, public_user


def main() -> None:
    parser = argparse.ArgumentParser(description="Create or update a seed admin user.")
    parser.add_argument("--email", default=os.environ.get("DROWSINESS_SEED_ADMIN_EMAIL", "admin@example.com"))
    parser.add_argument("--full-name", default=os.environ.get("DROWSINESS_SEED_ADMIN_FULL_NAME", "System Admin"))
    args = parser.parse_args()

    password = os.environ.get("DROWSINESS_SEED_ADMIN_PASSWORD")
    if not password:
        password = getpass("Admin password: ")
    if len(password) < 12:
        parser.error("admin password must be at least 12 characters")

    service = UserService()
    repository = UserRepository()
    existing_user = repository.find_by_email(args.email)

    if existing_user is None:
        user = service.create_user(
            UserCreate(
                full_name=args.full_name,
                email=args.email,
                password=password,
                role=UserRole.ADMIN,
                status="active",
            )
        )
        action = "created"
    else:
        updated_user = service.set_user_password(email=args.email, password=password)
        user = updated_user or existing_user
        action = "updated_password"

    output_user = public_user(user)
    print(f"{action}: {output_user['email']} ({output_user['role'].value})")


if __name__ == "__main__":
    main()
