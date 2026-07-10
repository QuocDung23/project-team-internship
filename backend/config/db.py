import os

import psycopg2

def get_connection():

    return psycopg2.connect(
        host=os.environ.get("DROWSINESS_DB_HOST", "localhost"),
        database=os.environ.get("DROWSINESS_DB_NAME", "drowsiness_safety_phase1"),
        user=os.environ.get("DROWSINESS_DB_USER", "postgres"),
        password=os.environ.get("DROWSINESS_DB_PASSWORD", ""),
        port=int(os.environ.get("DROWSINESS_DB_PORT", "5432")),
    )
