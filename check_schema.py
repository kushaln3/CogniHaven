import sqlite3
import os

db_path = 'cognihaven-backend/cognihaven.db'
if not os.path.exists(db_path):
    print(f"Database not found at {db_path}")
    exit()

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

tables = ['users', 'transactions', 'raw_telemetry', 'behavior_profiles', 'audit_logs']

for table in tables:
    print(f"\n--- Table: {table} ---")
    try:
        cursor.execute(f"PRAGMA table_info({table})")
        columns = cursor.fetchall()
        for col in columns:
            print(f"Column: {col[1]}, Type: {col[2]}")
    except Exception as e:
        print(f"Error checking table {table}: {e}")

conn.close()
