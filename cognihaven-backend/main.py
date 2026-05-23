import numpy as np
import joblib
import os
import pandas as pd
from fastapi import FastAPI, Body, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import redis
import json

app = FastAPI()

# --- Redis Setup ---
try:
    # decode_responses=True converts byte strings to normal strings automatically
    redis_client = redis.Redis(host='localhost', port=6379, db=0, decode_responses=True)
    redis_client.ping()
    print("Redis connected successfully!")
except Exception as e:
    print(f"ERROR: Could not connect to Redis: {e}")
    redis_client = None

# Allow CORS for the React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Load ML Model ---
MODEL_PATH = os.path.join("..", "ml_engine", "isolation_forest.pkl")
try:
    model = joblib.load(MODEL_PATH)
    print(f"ML Model loaded successfully from {MODEL_PATH}")
except Exception as e:
    print(f"ERROR: Could not load ML model: {e}")
    model = None

# --- Feature Columns (Must match training) ---
FEATURE_COLS = [
    'dwell_mean', 'dwell_variance', 
    'flight_mean', 'flight_variance', 
    'mouse_velocity_mean', 'mouse_velocity_variance'
]

# --- Pydantic Models ---

class KeystrokeMetric(BaseModel):
    dwell_time: float
    flight_time: float

class MouseMetric(BaseModel):
    x: int
    y: int
    dt: float

class TelemetryBatch(BaseModel):
    session_id: str
    batch_start_time: int
    batch_end_time: int
    keystrokes: List[KeystrokeMetric]
    mouse_movements: List[MouseMetric]

# --- Feature Extraction ---

def extract_features(batch: TelemetryBatch):
    if batch.keystrokes:
        dwells = [k.dwell_time for k in batch.keystrokes]
        flights = [k.flight_time for k in batch.keystrokes]
        dwell_mean, dwell_variance = np.mean(dwells), np.var(dwells)
        flight_mean, flight_variance = np.mean(flights), np.var(flights)
    else:
        dwell_mean = dwell_variance = flight_mean = flight_variance = 0.0

    if len(batch.mouse_movements) > 1:
        velocities = []
        for i in range(1, len(batch.mouse_movements)):
            m1, m2 = batch.mouse_movements[i-1], batch.mouse_movements[i]
            dist = np.sqrt((m2.x - m1.x)**2 + (m2.y - m1.y)**2)
            if m2.dt > 0: velocities.append(dist / m2.dt)
        mouse_velocity_mean = np.mean(velocities) if velocities else 0.0
        mouse_velocity_variance = np.var(velocities) if velocities else 0.0
    else:
        mouse_velocity_mean = mouse_velocity_variance = 0.0

    return [
        float(dwell_mean), float(dwell_variance),
        float(flight_mean), float(flight_variance),
        float(mouse_velocity_mean), float(mouse_velocity_variance)
    ]

# --- Real-Time Inference ---

@app.post("/telemetry-stream")
async def process_telemetry(batch: TelemetryBatch):

    # --- Layer 1: Perimeter Screening (Rate Limiting) ---
    if redis_client:
        client_ip = request.client.host
        request_count = redis_client.incr(f"rate_limit:{client_ip}")
        if request_count == 1:
            redis_client.expire(f"rate_limit:{client_ip}", 60) # 1-minute window
        if request_count > 20:
            raise HTTPException(status_code=429, detail="Layer 1 Block: Automated brute-force detected")
        
    features = extract_features(batch)
    
    if model:
        # Use DataFrame to avoid feature name warnings
        features_df = pd.DataFrame([features], columns=FEATURE_COLS)
        raw_score = model.decision_function(features_df)[0]
        
        # Super-Softened Normalization for Hackathon Demo
        if raw_score >= -0.05:  # High-permissibility threshold
            # Normal zone: Risk Score stays between 0 and 30
            # 0.15 is the typical high-normal score
            risk_score = int(max(0, 30 * (1 - ((raw_score + 0.05) / 0.20))))
        else:
            # Anomaly zone: Scale from 31 to 100
            # -0.20 is a typical very-anomalous score
            risk_score = int(min(100, 31 + (abs(raw_score + 0.05) * 450)))
    else:
        risk_score = 0
    
   # Determine the status string
    status_string = "safe" if risk_score <= 30 else "warning" if risk_score <= 65 else "critical"

    # --- Save to Redis ---
    if redis_client:
        redis_payload = {
            "risk_score": risk_score,
            "status": status_string
        }
        # Save with a 1-hour expiration
        redis_client.setex(f"session:{batch.session_id}", 3600, json.dumps(redis_payload))

    
    print(f"\n[SESSION: {batch.session_id}]")
    print(f"Features: {[round(f, 2) for f in features]}")
    print(f"Decision Score: {raw_score:.4f} | Risk Score: {risk_score}")
    
    
    return {
        "session_id": batch.session_id,
        "risk_score": risk_score,
        "status": "safe" if risk_score <= 30 else "warning" if risk_score <= 65 else "critical"
    }

@app.get("/health")
async def health_check():
    return {"status": "online"}

# --- Real-Time Status Endpoint ---

@app.get("/session/{session_id}")
async def get_session_status(session_id: str):
    #O(1) lookup
    if not redis_client:
        raise HTTPException(status_code=500, detail="Redis database is offline")
    
    data = redis_client.get(f"session:{session_id}")
    
    if data:
        return json.loads(data)
    
    #If no data exists yet, default to safe/0
    return {"risk_score": 0, "status": "safe", "message": "No telemetry received yet"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
