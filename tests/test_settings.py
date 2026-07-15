import unittest
from unittest.mock import patch

from backend.core.settings import Settings


class SettingsTests(unittest.TestCase):
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
