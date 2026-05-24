import sqlite3
import os

# Database path
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, 'cognihaven-backend', 'cognihaven.db')

def migrate():
    if not os.path.exists(DB_PATH):
        print(f"Database not found at {DB_PATH}. init_db will handle creation.")
        return

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    print("Starting migration...")

    # 1. Add current_balance to users
    try:
        cursor.execute("ALTER TABLE users ADD COLUMN current_balance FLOAT DEFAULT 50000.0")
        print("Added current_balance to users table.")
    except sqlite3.OperationalError:
        print("current_balance already exists in users table.")

    # 2. Add sample_count to behavior_profiles
    try:
        cursor.execute("ALTER TABLE behavior_profiles ADD COLUMN sample_count INTEGER DEFAULT 1")
        print("Added sample_count to behavior_profiles table.")
    except sqlite3.OperationalError:
        print("sample_count already exists in behavior_profiles table.")

    # 3. Create transactions table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS transactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            amount FLOAT,
            timestamp DATETIME,
            recipient TEXT,
            status TEXT,
            description TEXT,
            FOREIGN KEY (user_id) REFERENCES users (id)
        )
    ''')
    print("Ensured transactions table exists.")

    # 4. Create raw_telemetry table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS raw_telemetry (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            timestamp DATETIME,
            is_verified BOOLEAN,
            dwell_mean FLOAT,
            dwell_variance FLOAT,
            flight_mean FLOAT,
            flight_variance FLOAT,
            velocity_mean FLOAT,
            velocity_variance FLOAT,
            FOREIGN KEY (user_id) REFERENCES users (id)
        )
    ''')
    print("Ensured raw_telemetry table exists.")

    conn.commit()
    conn.close()
    print("Migration complete.")

if __name__ == "__main__":
    migrate()
