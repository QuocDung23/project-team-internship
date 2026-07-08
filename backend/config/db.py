import os

import psycopg2


def get_connection():

    return psycopg2.connect(
        host=os.getenv("DB_HOST", "localhost"),
        database=os.getenv("DB_NAME", "drowsiness_safety_db"),
        user=os.getenv("DB_USER", "postgres"),
        password=os.getenv("DB_PASSWORD", "your_password")  # Nên đặt biến môi trường DB_PASSWORD thay vì sửa trực tiếp ở đây
    )
