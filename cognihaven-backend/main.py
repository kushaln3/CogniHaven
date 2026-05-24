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
    otp: Optional[str] = None

class PreLoginRequest(BaseModel):
    username: str

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
    action: Optional[str] = "session_sync"
    metadata: Optional[Dict] = None

class CreateUserRequest(BaseModel):
    username: str

class UpdateProfileRequest(BaseModel):
    session_id: str
    email: Optional[str] = None
    phone: Optional[str] = None

class UpdatePasswordRequest(BaseModel):
    session_id: str
    old_password: str
    new_password: str

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

@app.post("/pre-login-check")
async def pre_login_check(req: PreLoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == req.username).first()
    
    risk_score = 0
    otp_required = False
    learning_step = 1
    
    if user:
        # Mandatory OTP for first 3 logins (Learning Mode)
        if user.login_count < 3 or not user.is_enrolled:
            risk_score = 100 
            otp_required = True
            learning_step = user.login_count + 1
        # Original risk logic for subsequent logins (Admin check only)
        elif "admin" in user.username.lower():
            risk_score = 45 
            otp_required = True
        else:
            risk_score = 15
            otp_required = False
    
    return {
        "username": req.username,
        "risk_score": risk_score,
        "otp_required": otp_required,
        "is_first_login": user.login_count < 3 if user else False,
        "learning_step": learning_step
    }

@app.post("/login")
async def login(request: Request, req: LoginRequest, db: Session = Depends(get_db)):
    # --- Layer 1: Perimeter Screening (Login Rate Limiting) ---
    if redis_client:
        try:
            client_ip = request.client.host
            login_attempts = redis_client.incr(f"login_rate:{client_ip}")
            if login_attempts == 1:
                redis_client.expire(f"login_rate:{client_ip}", 60) # 1-minute window
            if login_attempts > 5: # Strict limit for login
                raise HTTPException(status_code=429, detail="Layer 1 Block: Too many login attempts. Please wait 1 minute.")
        except redis.RedisError:
            pass

    user = db.query(User).filter(User.username == req.username).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found. Contact Admin for provisioning.")
    
    if user.password != req.password:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    # OTP Verification Logic
    is_learning_mode = user.login_count < 3 or not user.is_enrolled
    high_risk_flag = "admin" in user.username.lower()
    
    if is_learning_mode or high_risk_flag:
        if not req.otp:
             raise HTTPException(status_code=403, detail="OTP Required for verification")
        if req.otp != "123456": # Mock OTP
             raise HTTPException(status_code=401, detail="Invalid OTP")

    # Increment login count upon successful login
    user.login_count += 1
    db.commit()

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
    profile.dwell_sigma = max(features[0] * 0.2, 5.0) # Floor of 5ms
    profile.flight_mu = features[2]
    profile.flight_sigma = max(features[2] * 0.2, 15.0) # Floor of 15ms
    profile.velocity_mu = features[4]
    profile.velocity_sigma = max(features[4] * 0.2, 0.5) # Floor of 0.5 px/ms
    profile.classification = classification
    
    user = db.query(User).filter(User.id == user_id).first()
    user.is_enrolled = True
    
    new_log = AuditLog(user_id=user_id, action=f"enrollment_complete (Profile: {classification})", risk_score=0, status="allowed")
    db.add(new_log)
    db.commit()
    
    return {"status": "enrolled", "classification": classification}

@app.post("/api/user/update-profile")
async def update_profile(req: UpdateProfileRequest, db: Session = Depends(get_db)):
    user_id = SESSIONS.get(req.session_id)
    if not user_id: raise HTTPException(status_code=401, detail="Invalid session")
    user = db.query(User).filter(User.id == user_id).first()
    db.add(AuditLog(user_id=user.id, action=f"execute_profile_update", risk_score=0, status="allowed"))
    db.commit()
    return {"status": "success"}

@app.post("/api/user/update-password")
async def update_password(req: UpdatePasswordRequest, db: Session = Depends(get_db)):
    user_id = SESSIONS.get(req.session_id)
    if not user_id: raise HTTPException(status_code=401, detail="Invalid session")
    user = db.query(User).filter(User.id == user_id).first()
    if user.password != req.old_password:
        raise HTTPException(status_code=400, detail="Incorrect current password")
    user.password = req.new_password
    db.add(AuditLog(user_id=user.id, action="execute_change_password", risk_score=0, status="allowed"))
    db.commit()
    return {"status": "success"}

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
            pass 

    user_id = SESSIONS.get(batch.session_id)
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid session")
    
    user = db.query(User).filter(User.id == user_id).first()
    raw_features = extract_features(batch)
    justifications = []
    
    behavior_dict = {
        "dwell": round(raw_features[0], 2),
        "flight": round(raw_features[2], 2),
        "velocity": round(raw_features[4], 2)
    }
    enrolled_dict = {}

    # 1. Behavioral Biometrics Layer (Z-Score)
    risk_score = 0
    z_magnitude = 0.0
    
    if user.is_enrolled and user.profile:
        means_to_check = [raw_features[0], raw_features[2], raw_features[4]]
        profile_means = [user.profile.dwell_mu, user.profile.flight_mu, user.profile.velocity_mu]
        profile_sigmas = [user.profile.dwell_sigma, user.profile.flight_sigma, user.profile.velocity_sigma]
        feature_names = ["Dwell", "Flight", "Velocity"]
        
        enrolled_dict = {
            "dwell_mu": round(user.profile.dwell_mu, 2),
            "flight_mu": round(user.profile.flight_mu, 2),
            "velocity_mu": round(user.profile.velocity_mu, 2),
            "classification": user.profile.classification
        }

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

    # 4. Hybrid Aggregation & Smoothing (EWMA)
    raw_risk = 0
    in_learning_mode = user.login_count < 3
    
    if in_learning_mode:
        raw_risk = 0
        justifications.append(f"Learning Mode (Step {user.login_count + 1}/3)")
    elif user.is_enrolled:
        delta_multiplier = 1.0 + (max(0, z_magnitude - 3.0) * 0.3)
        raw_risk = int(min(100, (ml_base_risk + context_risk_spike) * delta_multiplier))
    else:
        raw_risk = int(min(100, ml_base_risk + context_risk_spike))

    # Persistence Screening & Smoothing
    strike_count = 0
    smoothed_risk = raw_risk
    
    if redis_client and not in_learning_mode:
        try:
            prev_data_raw = redis_client.get(f"session_state:{batch.session_id}")
            if prev_data_raw:
                prev_data = json.loads(prev_data_raw)
                prev_score = prev_data.get("risk_score", 0)
                strike_count = prev_data.get("strike_count", 0)
                smoothed_risk = int((0.4 * raw_risk) + (0.6 * prev_score))
        except: pass

    status = "allowed"
    if smoothed_risk > 65:
        strike_count += 1
        if strike_count >= 3:
            status = "blocked"
        else:
            status = "otp_triggered" 
            justifications.append(f"Anomaly Strike {strike_count}/3")
    elif smoothed_risk > 30:
        status = "otp_triggered"
        strike_count = max(0, strike_count - 1) 
    else:
        status = "allowed"
        strike_count = 0 

    risk_score = smoothed_risk
    
    if redis_client:
        try:
            redis_payload = {
                "risk_score": risk_score, 
                "status": status, 
                "username": user.username,
                "strike_count": strike_count
            }
            redis_client.setex(f"session_state:{batch.session_id}", 3600, json.dumps(redis_payload))
        except redis.RedisError:
            pass
    # Log to Audit Table
    action_label = batch.action # Now defaults to session_sync from frontend
    action_str = f"{action_label}"
    if justifications: action_str += f" [{', '.join(justifications[:2])}]"
    
    new_log = AuditLog(
        user_id=user_id, 
        action=action_str, 
        risk_score=risk_score, 
        status=status,
        behavior_data=json.dumps(behavior_dict),
        enrolled_data=json.dumps(enrolled_dict) if enrolled_dict else None,
        strike_count=strike_count
    )
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
        "action": l.action, "risk_score": l.risk_score, "status": l.status,
        "behavior_data": json.loads(l.behavior_data) if l.behavior_data else None,
        "enrolled_data": json.loads(l.enrolled_data) if l.enrolled_data else None,
        "strike_count": l.strike_count
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
    user.login_count = 0 
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
