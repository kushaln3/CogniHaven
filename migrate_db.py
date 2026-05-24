import sqlite3
import os

db_path = 'cognihaven-backend/cognihaven.db'
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

print("Running Migrations...")

# 1. Add current_balance to users
try:
    cursor.execute("ALTER TABLE users ADD COLUMN current_balance FLOAT DEFAULT 50000.0")
    print("Added current_balance to users")
except sqlite3.OperationalError:
    print("current_balance already exists in users")

# 2. Add sample_count to behavior_profiles
try:
    cursor.execute("ALTER TABLE behavior_profiles ADD COLUMN sample_count INTEGER DEFAULT 1")
    print("Added sample_count to behavior_profiles")
except sqlite3.OperationalError:
    print("sample_count already exists in behavior_profiles")

# 3. Create transactions table
cursor.execute("""
CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    amount FLOAT,
    timestamp DATETIME,
    recipient VARCHAR,
    status VARCHAR,
    description VARCHAR,
    FOREIGN KEY(user_id) REFERENCES users(id)
)
""")
print("Ensured transactions table exists")

# 4. Create raw_telemetry table
cursor.execute("""
CREATE TABLE IF NOT EXISTS raw_telemetry (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    timestamp DATETIME,
    is_verified BOOLEAN DEFAULT 0,
    dwell_mean FLOAT,
    dwell_variance FLOAT,
    flight_mean FLOAT,
    flight_variance FLOAT,
    velocity_mean FLOAT,
    velocity_variance FLOAT,
    FOREIGN KEY(user_id) REFERENCES users(id)
)
""")
print("Ensured raw_telemetry table exists")

conn.commit()
conn.close()
print("Migrations completed successfully.")
