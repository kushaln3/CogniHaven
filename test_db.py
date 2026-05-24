import os
from sqlalchemy import create_engine
BASE_DIR = os.path.dirname(os.path.abspath('cognihaven-backend/database.py'))
db_path = os.path.join(BASE_DIR, 'cognihaven-backend', 'cognihaven.db')
url = f"sqlite:///{db_path}"
print(f"Testing URL: {url}")
try:
    engine = create_engine(url)
    conn = engine.connect()
    print("Connection successful")
    conn.close()
except Exception as e:
    print(f"Connection failed: {e}")
