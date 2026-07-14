import argparse
import os

from backend.auth.roles import UserRole
from backend.models.auth import UserCreate
from backend.models.driver import DriverCreate
from backend.repositories.driver_repository import DriverRepository
from backend.repositories.user_repository import UserRepository
from backend.services.driver_service import DriverService
from backend.services.user_service import UserService, public_user


DEFAULT_DRIVERS = (
    ("driver1@example.com", "Demo Driver 1", "DL-001", "0900000001"),
    ("driver2@example.com", "Demo Driver 2", "DL-002", "0900000002"),
    ("driver3@example.com", "Demo Driver 3", "DL-003", "0900000003"),
)
DEFAULT_DRIVER_PASSWORD = "driver123456"


def main() -> None:
    parser = argparse.ArgumentParser(description="Create or update basic seed driver users.")
    parser.parse_args()

    password = os.environ.get("DROWSINESS_SEED_DRIVER_PASSWORD", DEFAULT_DRIVER_PASSWORD)
    if len(password) < 12:
        parser.error("driver password must be at least 12 characters")

    user_service = UserService()
    user_repository = UserRepository()
    driver_service = DriverService()
    driver_repository = DriverRepository()

    for email, full_name, license_number, phone in DEFAULT_DRIVERS:
        existing_user = user_repository.find_by_email(email)
        if existing_user is None:
            user = user_service.create_user(
                UserCreate(
                    full_name=full_name,
                    email=email,
                    password=password,
                    role=UserRole.DRIVER,
                    status="active",
                )
            )
            action = "created"
        else:
            updated_user = user_service.set_user_password(email=email, password=password)
            user = updated_user or existing_user
            action = "updated_password"

        output_user = public_user(user)
        print(f"{action}: {output_user['email']} ({output_user['role'].value})")

        if driver_repository.find_by_email(email) is None:
            driver = driver_service.create_driver(
                DriverCreate(
                    full_name=full_name,
                    license_number=license_number,
                    phone=phone,
                    email=email,
                )
            )
            print(f"created_driver_profile: {driver['driver_id']} ({email})")
        else:
            print(f"driver_profile_exists: {email}")


if __name__ == "__main__":
    main()
