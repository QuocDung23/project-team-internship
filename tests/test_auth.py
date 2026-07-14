import os
import unittest
from datetime import timedelta

from fastapi import HTTPException

from backend.auth.dependencies import require_roles
from backend.auth.jwt import TokenError, create_access_token, decode_access_token
from backend.auth.password import hash_password, verify_password
from backend.auth.roles import UserRole, parse_role
from backend.core.settings import get_settings
from backend.services.user_service import InactiveUserError, InvalidCredentialsError, UserService, public_user


class FakeUserRepository:
    def __init__(self, user):
        self.user = user

    def find_by_email(self, email):
        if self.user and self.user["email"] == email.lower():
            return self.user
        return None


class AuthenticationTest(unittest.TestCase):
    def setUp(self):
        os.environ["DROWSINESS_JWT_SECRET"] = "unit-test-secret"
        get_settings.cache_clear()

    def tearDown(self):
        os.environ.pop("DROWSINESS_JWT_SECRET", None)
        get_settings.cache_clear()

    def test_password_hash_is_not_plaintext_and_verifies(self):
        password_hash = hash_password("StrongerPassword123!")

        self.assertNotEqual(password_hash, "StrongerPassword123!")
        self.assertTrue(verify_password("StrongerPassword123!", password_hash))
        self.assertFalse(verify_password("wrong-password", password_hash))

    def test_user_service_authenticates_without_exposing_password_hash(self):
        user = {
            "user_id": "user-1",
            "full_name": "Admin User",
            "email": "admin@example.com",
            "password_hash": hash_password("StrongerPassword123!"),
            "role": UserRole.ADMIN,
            "status": "active",
            "created_at": None,
            "updated_at": None,
        }
        service = UserService(FakeUserRepository(user))

        authenticated_user = service.authenticate_user(
            email="admin@example.com",
            password="StrongerPassword123!",
        )
        token, expires_in = service.create_access_token_for_user(authenticated_user)
        claims = decode_access_token(token, secret="unit-test-secret")

        self.assertEqual(claims["sub"], "user-1")
        self.assertEqual(claims["role"], "admin")
        self.assertEqual(expires_in, 1800)
        self.assertNotIn("password_hash", public_user(authenticated_user))

    def test_user_service_rejects_bad_credentials(self):
        user = {
            "email": "admin@example.com",
            "password_hash": hash_password("StrongerPassword123!"),
            "status": "active",
        }
        service = UserService(FakeUserRepository(user))

        with self.assertRaises(InvalidCredentialsError):
            service.authenticate_user(email="admin@example.com", password="bad-password")

    def test_user_service_rejects_disabled_driver_profile(self):
        for driver_status in ("inactive", "suspended"):
            with self.subTest(driver_status=driver_status):
                user = {
                    "email": "driver@example.com",
                    "password_hash": hash_password("StrongerPassword123!"),
                    "role": UserRole.DRIVER,
                    "status": "active",
                    "driver_status": driver_status,
                }
                service = UserService(FakeUserRepository(user))

                with self.assertRaises(InactiveUserError):
                    service.authenticate_user(email="driver@example.com", password="StrongerPassword123!")

    def test_jwt_expiration_is_enforced(self):
        token = create_access_token(
            subject="user-1",
            role="admin",
            secret="unit-test-secret",
            expires_delta=timedelta(seconds=-1),
        )

        with self.assertRaises(TokenError):
            decode_access_token(token, secret="unit-test-secret")

    def test_role_parsing_and_authorization_dependency(self):
        self.assertEqual(parse_role("admin"), UserRole.ADMIN)
        self.assertEqual(UserRole.DRIVER.value, "driver")
        with self.assertRaises(ValueError):
            parse_role("operator")

        dependency = require_roles(UserRole.ADMIN)
        current_user = {"role": UserRole.DRIVER}

        with self.assertRaises(HTTPException) as exc:
            dependency(current_user)

        self.assertEqual(exc.exception.status_code, 403)


if __name__ == "__main__":
    unittest.main()
