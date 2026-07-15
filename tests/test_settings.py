import unittest
from unittest.mock import patch

from backend.core.settings import Settings


class SettingsTests(unittest.TestCase):
    def test_cors_origins_accept_comma_separated_env_value(self):
        with patch.dict(
            "os.environ",
            {
                "DROWSINESS_CORS_ORIGINS": (
                    "https://drowsiness-detector-web.onrender.com,"
                    "http://localhost:5173"
                ),
            },
            clear=True,
        ):
            settings = Settings()

        self.assertEqual(
            settings.cors_origins,
            [
                "https://drowsiness-detector-web.onrender.com",
                "http://localhost:5173",
            ],
        )

    def test_cors_origins_accept_json_array_env_value(self):
        with patch.dict(
            "os.environ",
            {
                "DROWSINESS_CORS_ORIGINS": (
                    '["https://drowsiness-detector-web.onrender.com",'
                    '"http://localhost:5173"]'
                ),
            },
            clear=True,
        ):
            settings = Settings()

        self.assertEqual(
            settings.cors_origins,
            [
                "https://drowsiness-detector-web.onrender.com",
                "http://localhost:5173",
            ],
        )

    def test_database_url_prefers_render_database_url(self):
        with patch.dict(
            "os.environ",
            {
                "DATABASE_URL": "postgres://render_user:secret@internal-host:5432/render_db",
            },
            clear=True,
        ):
            settings = Settings()

        self.assertEqual(
            settings.database_url,
            "postgresql://render_user:secret@internal-host:5432/render_db",
        )
        self.assertEqual(
            settings.psycopg_dsn,
            "postgresql://render_user:secret@internal-host:5432/render_db",
        )

    def test_drowsiness_database_url_overrides_generic_database_url(self):
        with patch.dict(
            "os.environ",
            {
                "DATABASE_URL": "postgres://generic:secret@generic-host:5432/generic_db",
                "DROWSINESS_DATABASE_URL": (
                    "postgresql+psycopg2://specific:secret@specific-host:5432/specific_db"
                ),
            },
            clear=True,
        ):
            settings = Settings()

        self.assertEqual(
            settings.database_url,
            "postgresql+psycopg2://specific:secret@specific-host:5432/specific_db",
        )
        self.assertEqual(
            settings.psycopg_dsn,
            "postgresql://specific:secret@specific-host:5432/specific_db",
        )


if __name__ == "__main__":
    unittest.main()
