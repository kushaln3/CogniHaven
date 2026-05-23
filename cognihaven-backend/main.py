import numpy as np
import joblib
import os
import pandas as pd
import datetime
import redis
import json
from fastapi import FastAPI, Body, Depends, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict
from sqlalchemy.orm import Session
from database import SessionLocal, User, BehaviorProfile, AuditLog, init_db

# Initialize Database
init_db()

app = FastAPI()

# --- Redis Setup ---
try:
    # decode_responses=True converts byte strings to normal strings automatically
    redis_client = redis.Redis(host='localhost', port=6379, db=0, decode_responses=True, socket_connect_timeout=2)
    redis_client.ping()
    print("STATUS: Redis connected successfully (Layer 1 Cache Active)")
except Exception as e:
    print(f"WARNING: Could not connect to Redis: {e}. System falling back to degraded mode (No Rate Limiting/Caching).")
    redis_client = None

# Allow CORS for the React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Dependency ---
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# --- In-memory Session Mapping ---
# session_id -> user_id
SESSIONS: Dict[str, int] = {}

# --- Load ML Model ---
MODEL_PATH = os.path.join("..", "ml_engine", "isolation_forest.pkl")
try:
    model = joblib.load(MODEL_PATH)
    print(f"STATUS: ML Model loaded successfully (Brain Active)")
except Exception as e:
    print(f"ERROR: Could not load ML model: {e}")
    model = None

# --- Feature Columns ---
FEATURE_COLS = [
    'dwell_mean', 'dwell_variance', 
    'flight_mean', 'flight_variance', 
    'mouse_velocity_mean', 'mouse_velocity_variance'
]

# --- Pydantic Models ---

class LoginRequest(BaseModel):
    username: str
    password: str

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
    action: Optional[str] = "heartbeat"
    metadata: Optional[Dict] = None

class CreateUserRequest(BaseModel):
    username: str

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

# --- Endpoints ---

@app.post("/login")
async def login(req: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == req.username).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found. Contact Admin for provisioning.")
    
    if user.password != req.password:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    import uuid
    session_id = str(uuid.uuid4())
    SESSIONS[session_id] = user.id
    
    new_log = AuditLog(user_id=user.id, action="login", risk_score=0, status="allowed")
    db.add(new_log)
    db.commit()
    
    return {
        "session_id": session_id,
        "username": user.username,
        "is_enrolled": user.is_enrolled
    }

@app.post("/enroll-session")
async def enroll_session(batch: TelemetryBatch, db: Session = Depends(get_db)):
    user_id = SESSIONS.get(batch.session_id)
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid session")
    
    features = extract_features(batch)
    
    # Classify user speed
    flight_mean = features[2]
    if flight_mean < 150: classification = "Fast"
    elif flight_mean < 300: classification = "Medium"
    else: classification = "Slow"
    
    profile = db.query(BehaviorProfile).filter(BehaviorProfile.user_id == user_id).first()
    if not profile:
        profile = BehaviorProfile(user_id=user_id)
        db.add(profile)
    
    profile.dwell_mu = features[0]
    profile.dwell_sigma = features[0] * 0.2 + 0.01
    profile.flight_mu = features[2]
    profile.flight_sigma = features[2] * 0.2 + 0.01
    profile.velocity_mu = features[4]
    profile.velocity_sigma = features[4] * 0.2 + 0.01
    profile.classification = classification
    
    user = db.query(User).filter(User.id == user_id).first()
    user.is_enrolled = True
    
    new_log = AuditLog(user_id=user_id, action=f"enrollment_complete (Profile: {classification})", risk_score=0, status="allowed")
    db.add(new_log)
    db.commit()
    
    return {"status": "enrolled", "classification": classification}

@app.post("/telemetry-stream")
async def process_telemetry(request: Request, batch: TelemetryBatch, db: Session = Depends(get_db)):
    # --- Layer 1: Perimeter Screening (Rate Limiting) ---
    if redis_client:
        try:
            client_ip = request.client.host
            request_count = redis_client.incr(f"rate_limit:{client_ip}")
            if request_count == 1:
                redis_client.expire(f"rate_limit:{client_ip}", 60) # 1-minute window
            if request_count > 30: # Slightly higher for 3s heartbeats
                raise HTTPException(status_code=429, detail="Layer 1 Block: Automated brute-force detected")
        except redis.RedisError:
            pass # Fallback if redis blips during traffic

    user_id = SESSIONS.get(batch.session_id)
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid session")
    
    user = db.query(User).filter(User.id == user_id).first()
    raw_features = extract_features(batch)
    justifications = []
    
    # 1. Behavioral Biometrics Layer (Z-Score)
    risk_score = 0
    z_magnitude = 0.0
    
    if user.is_enrolled and user.profile:
        means_to_check = [raw_features[0], raw_features[2], raw_features[4]]
        profile_means = [user.profile.dwell_mu, user.profile.flight_mu, user.profile.velocity_mu]
        profile_sigmas = [user.profile.dwell_sigma, user.profile.flight_sigma, user.profile.velocity_sigma]
        feature_names = ["Dwell", "Flight", "Velocity"]
        
        z_scores = []
        for i in range(len(means_to_check)):
            mu, sigma = profile_means[i], profile_sigmas[i]
            z = (means_to_check[i] - mu) / sigma if sigma != 0 else 0.0
            z_scores.append(z)
            if abs(z) > 3.0:
                justifications.append(f"Anomalous {feature_names[i]} Deviation")
        z_magnitude = np.mean(np.abs(z_scores))

    # 2. ML Engine Layer
    ml_base_risk = 0
    if model:
        features_df = pd.DataFrame([raw_features], columns=FEATURE_COLS)
        raw_ml_score = model.decision_function(features_df)[0]
        if raw_ml_score < -0.05:
            ml_base_risk = int(min(100, 31 + (abs(raw_ml_score + 0.05) * 450)))
            justifications.append("ML Outlier Pattern Detected")
        else:
            ml_base_risk = int(max(0, 30 * (1 - ((raw_ml_score + 0.05) / 0.20))))

    # 3. Contextual Rule Engine Layer
    context_risk_spike = 0
    if batch.metadata:
        if batch.action == "execute_fund_transfer":
            amount = float(batch.metadata.get("amount", 0))
            if amount > 10000:
                context_risk_spike += 40
                justifications.append(f"High-Value Transfer (${amount})")
        if batch.action == "execute_loan_application":
            amount = float(batch.metadata.get("amount", 0))
            if amount > 20000:
                context_risk_spike += 50
                justifications.append(f"High-Value Loan (${amount})")
        if batch.action == "execute_profile_update":
            changes = batch.metadata.get("changes", [])
            if "email" in changes and "phone" in changes:
                context_risk_spike = 100
                justifications.append("Identity Wipe Attempt")

    # 4. Hybrid Aggregation
    if user.is_enrolled:
        delta_multiplier = 1.0 + (max(0, z_magnitude - 2.0) * 0.5)
        risk_score = int(min(100, (ml_base_risk + context_risk_spike) * delta_multiplier))
    else:
        risk_score = int(min(100, ml_base_risk + context_risk_spike))

    status = "allowed"
    if risk_score > 65: status = "blocked"
    elif risk_score > 30: status = "otp_triggered"
    
    # --- Layer 2: Persistence Screening (Redis Caching) ---
    if redis_client:
        try:
            redis_payload = {"risk_score": risk_score, "status": status, "username": user.username}
            redis_client.setex(f"session_state:{batch.session_id}", 3600, json.dumps(redis_payload))
        except redis.RedisError:
            pass

    # Log to Audit Table
    action_str = f"{batch.action}"
    if justifications: action_str += f" [{', '.join(justifications[:2])}]"
    new_log = AuditLog(user_id=user_id, action=action_str, risk_score=risk_score, status=status)
    db.add(new_log)
    db.commit()
    
    return {
        "session_id": batch.session_id,
        "risk_score": risk_score,
        "status": status,
        "is_enrolled": user.is_enrolled
    }

@app.get("/api/session/{session_id}")
async def get_session_state(session_id: str):
    if not redis_client:
        raise HTTPException(status_code=503, detail="State cache offline")
    
    state = redis_client.get(f"session_state:{session_id}")
    if state:
        return json.loads(state)
    return {"risk_score": 0, "status": "allowed", "message": "No active telemetry state found"}

@app.get("/api/admin/logs")
async def get_admin_logs(db: Session = Depends(get_db)):
    logs = db.query(AuditLog).order_by(AuditLog.timestamp.desc()).limit(50).all()
    return [{
        "id": l.id, "timestamp": l.timestamp.isoformat(), "username": l.user.username,
        "action": l.action, "risk_score": l.risk_score, "status": l.status
    } for l in logs]

@app.get("/api/admin/users")
async def list_users(db: Session = Depends(get_db)):
    users = db.query(User).all()
    return [{
        "id": u.id, "username": u.username, "is_enrolled": u.is_enrolled,
        "classification": u.profile.classification if u.profile else "N/A"
    } for u in users]

@app.post("/api/admin/create-user")
async def create_user(req: CreateUserRequest, db: Session = Depends(get_db)):
    if db.query(User).filter(User.username == req.username).first():
        raise HTTPException(status_code=400, detail="User already exists")
    new_user = User(username=req.username, password="password", is_enrolled=False)
    db.add(new_user)
    db.commit()
    return {"status": "created", "username": req.username}

@app.post("/api/admin/delete-user")
async def delete_user(req: CreateUserRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == req.username).first()
    if not user: raise HTTPException(status_code=404, detail="User not found")
    if user.profile: db.delete(user.profile)
    for log in user.logs: db.delete(log)
    db.delete(user)
    db.commit()
    return {"status": "deleted", "username": req.username}

@app.post("/api/admin/reset-biometrics")
async def reset_biometrics(req: CreateUserRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == req.username).first()
    if not user: raise HTTPException(status_code=404, detail="User not found")
    user.is_enrolled = False
    if user.profile: db.delete(user.profile)
    db.add(AuditLog(user_id=user.id, action="biometrics_reset_by_admin", risk_score=0, status="allowed"))
    db.commit()
    return {"status": "reset_complete", "username": req.username}

@app.get("/health")
async def health_check():
    return {"status": "online", "redis": redis_client is not None}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
