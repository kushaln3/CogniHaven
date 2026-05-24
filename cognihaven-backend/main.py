import numpy as np
import joblib
import os
import pandas as pd
import datetime
import redis
import json
import traceback
from fastapi import FastAPI, Body, Depends, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict
from sqlalchemy.orm import Session
from database import SessionLocal, User, BehaviorProfile, AuditLog, Transaction, RawTelemetry, init_db

# Initialize Database
init_db()

# --- Security Configuration ---
TRANSFER_PERCENTAGE_THRESHOLD = 70.0

app = FastAPI()

# --- Redis Setup ---
try:
    redis_client = redis.Redis(host='localhost', port=6379, db=0, decode_responses=True, socket_connect_timeout=2)
    redis_client.ping()
    print("STATUS: Redis connected successfully (Layer 1 Cache Active)")
except Exception as e:
    print(f"WARNING: Could not connect to Redis: {e}. System falling back to degraded mode.")
    redis_client = None

# Allow CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
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
SESSIONS: Dict[str, int] = {}
SESSION_STATE: Dict[str, Dict] = {}

# --- Load ML Model ---
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, "..", "ml_engine", "isolation_forest.pkl")
try:
    model = joblib.load(MODEL_PATH)
    print(f"STATUS: ML Model loaded successfully")
except Exception as e:
    print(f"ERROR: Could not load ML model: {e}")
    model = None

# --- Feature Columns ---
FEATURE_COLS = [
    'dwell_mean', 'dwell_variance', 
    'flight_mean', 'flight_variance', 
    'mouse_velocity_mean', 'mouse_velocity_variance'
]

# --- Helper Functions ---

def get_session_state(session_id: str):
    if redis_client:
        try:
            data = redis_client.get(f"session_state:{session_id}")
            if data: return json.loads(data)
        except: pass
    return SESSION_STATE.get(session_id)

def set_session_state(session_id: str, state: Dict):
    if redis_client:
        try:
            redis_client.setex(f"session_state:{session_id}", 3600, json.dumps(state))
        except: pass
    SESSION_STATE[session_id] = state

def delete_session_state(session_id: str):
    if redis_client:
        try:
            redis_client.delete(f"session_state:{session_id}")
        except: pass
    SESSION_STATE[session_id] = {
        "risk_score": 0,
        "status": "allowed",
        "strike_count": 0,
        "last_verified": datetime.datetime.utcnow().timestamp()
    }

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

class VerifyOtpRequest(BaseModel):
    session_id: str
    otp: str

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

@app.get("/api/user/account")
async def get_account(session_id: str, db: Session = Depends(get_db)):
    user_id = SESSIONS.get(session_id)
    if not user_id: raise HTTPException(status_code=401, detail="Invalid session")
    user = db.query(User).filter(User.id == user_id).first()
    return {
        "username": str(user.username),
        "current_balance": float(user.current_balance),
        "is_enrolled": bool(user.is_enrolled)
    }

@app.get("/api/user/transactions")
async def get_transactions(session_id: str, db: Session = Depends(get_db)):
    user_id = SESSIONS.get(session_id)
    if not user_id: raise HTTPException(status_code=401, detail="Invalid session")
    txs = db.query(Transaction).filter(Transaction.user_id == user_id).order_by(Transaction.timestamp.desc()).all()
    return [{
        "id": tx.id,
        "amount": float(tx.amount),
        "recipient": str(tx.recipient or ""),
        "status": str(tx.status),
        "timestamp": tx.timestamp.isoformat(),
        "description": str(tx.description or "")
    } for tx in txs]

@app.post("/pre-login-check")
async def pre_login_check(req: PreLoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == req.username).first()
    
    risk_score = 0
    otp_required = False
    learning_step = 1
    
    if user:
        if user.login_count < 3 or not user.is_enrolled:
            risk_score = 100 
            otp_required = True
            learning_step = user.login_count + 1
        elif "admin" in user.username.lower():
            risk_score = 45 
            otp_required = True
        else:
            risk_score = 15
            otp_required = False
    
    return {
        "username": str(req.username),
        "risk_score": int(risk_score),
        "otp_required": bool(otp_required),
        "is_first_login": bool(user.login_count < 3 if user else False),
        "learning_step": int(learning_step)
    }

@app.post("/login")
async def login(request: Request, req: LoginRequest, db: Session = Depends(get_db)):
    if redis_client:
        try:
            client_ip = request.client.host
            login_attempts = redis_client.incr(f"login_rate:{client_ip}")
            if login_attempts == 1:
                redis_client.expire(f"login_rate:{client_ip}", 60)
            if login_attempts > 5:
                raise HTTPException(status_code=429, detail="Layer 1 Block: Too many login attempts.")
        except: pass

    user = db.query(User).filter(User.username == req.username).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found.")
    
    if user.password != req.password:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    is_learning_mode = user.login_count < 3 or not user.is_enrolled
    if is_learning_mode or "admin" in user.username.lower():
        if not req.otp:
             raise HTTPException(status_code=403, detail="OTP Required")
        if req.otp != "123456":
             raise HTTPException(status_code=401, detail="Invalid OTP")

    user.login_count += 1
    db.commit()

    import uuid
    session_id = str(uuid.uuid4())
    SESSIONS[session_id] = user.id
    
    db.add(AuditLog(user_id=user.id, action="login", risk_score=0, status="allowed"))
    db.commit()
    
    return {
        "session_id": session_id,
        "username": str(user.username),
        "is_enrolled": bool(user.is_enrolled)
    }

@app.post("/enroll-session")
async def enroll_session(batch: TelemetryBatch, db: Session = Depends(get_db)):
    user_id = SESSIONS.get(batch.session_id)
    if not user_id: raise HTTPException(status_code=401, detail="Invalid session")
    
    features = extract_features(batch)
    flight_mean = features[2]
    if flight_mean < 150: classification = "Fast"
    elif flight_mean < 300: classification = "Medium"
    else: classification = "Slow"
    
    profile = db.query(BehaviorProfile).filter(BehaviorProfile.user_id == user_id).first()
    if not profile:
        profile = BehaviorProfile(user_id=user_id)
        db.add(profile)
    
    profile.dwell_mu = features[0]
    profile.dwell_sigma = max(features[0] * 0.2, 5.0)
    profile.flight_mu = features[2]
    profile.flight_sigma = max(features[2] * 0.2, 15.0)
    profile.velocity_mu = features[4]
    profile.velocity_sigma = max(features[4] * 0.2, 0.5)
    profile.classification = classification
    
    user = db.query(User).filter(User.id == user_id).first()
    user.is_enrolled = True
    db.add(AuditLog(user_id=user_id, action=f"enrollment_complete ({classification})", risk_score=0, status="allowed"))
    db.commit()
    return {"status": "enrolled", "classification": classification}

@app.post("/api/user/update-profile")
async def update_profile(req: UpdateProfileRequest, db: Session = Depends(get_db)):
    user_id = SESSIONS.get(req.session_id)
    if not user_id: raise HTTPException(status_code=401, detail="Invalid session")
    db.add(AuditLog(user_id=user_id, action="execute_profile_update", risk_score=0, status="allowed"))
    db.commit()
    return {"status": "success"}

@app.post("/api/user/update-password")
async def update_password(req: UpdatePasswordRequest, db: Session = Depends(get_db)):
    user_id = SESSIONS.get(req.session_id)
    if not user_id: raise HTTPException(status_code=401, detail="Invalid session")
    user = db.query(User).filter(User.id == user_id).first()
    if user.password != req.old_password:
        raise HTTPException(status_code=400, detail="Incorrect password")
    user.password = req.new_password
    db.add(AuditLog(user_id=user_id, action="execute_change_password", risk_score=0, status="allowed"))
    db.commit()
    return {"status": "success"}

@app.post("/telemetry-stream")
async def process_telemetry(request: Request, batch: TelemetryBatch, db: Session = Depends(get_db)):
    try:
        if redis_client:
            try:
                client_ip = request.client.host
                request_count = redis_client.incr(f"rate_limit:{client_ip}")
                if request_count == 1: redis_client.expire(f"rate_limit:{client_ip}", 60)
                if request_count > 40: raise HTTPException(status_code=429, detail="Rate Limit Exceeded")
            except: pass 

        user_id = SESSIONS.get(batch.session_id)
        if not user_id: raise HTTPException(status_code=401, detail="Invalid session")
        
        user = db.query(User).filter(User.id == user_id).first()
        raw_features = extract_features(batch)
        
        db.add(RawTelemetry(
            user_id=user.id,
            dwell_mean=float(raw_features[0]),
            dwell_variance=float(raw_features[1]),
            flight_mean=float(raw_features[2]),
            flight_variance=float(raw_features[3]),
            velocity_mean=float(raw_features[4]),
            velocity_variance=float(raw_features[5]),
            is_verified=False
        ))
        db.commit()

        justifications = []
        behavior_dict = {"dwell": float(raw_features[0]), "flight": float(raw_features[2]), "velocity": float(raw_features[4])}
        enrolled_dict = {}
        risk_score = 0
        z_magnitude = 0.0
        
        if user.is_enrolled and user.profile:
            means = [raw_features[0], raw_features[2], raw_features[4]]
            p_mu = [user.profile.dwell_mu or 0, user.profile.flight_mu or 0, user.profile.velocity_mu or 0]
            p_sigma = [user.profile.dwell_sigma or 5, user.profile.flight_sigma or 15, user.profile.velocity_sigma or 0.5]
            z_scores = []
            for i in range(3):
                z = (means[i] - p_mu[i]) / p_sigma[i] if p_sigma[i] != 0 else 0.0
                z_scores.append(float(z))
                if abs(z) > 3.0: justifications.append(f"Behavioral Anomaly")
            z_magnitude = float(np.mean(np.abs(z_scores)))
            if np.isnan(z_magnitude): z_magnitude = 0.0
            enrolled_dict = {"dwell_mu": float(p_mu[0]), "flight_mu": float(p_mu[1]), "velocity_mu": float(p_mu[2])}

        ml_base_risk = 0
        if model:
            f_df = pd.DataFrame([raw_features], columns=FEATURE_COLS)
            ml_score = float(model.decision_function(f_df)[0])
            if ml_score < -0.05:
                ml_base_risk = int(min(100, 31 + (abs(ml_score + 0.05) * 450)))
                justifications.append("ML Outlier")
            else:
                ml_base_risk = int(max(0, 30 * (1 - ((ml_score + 0.05) / 0.20))))

        context_risk_spike = 0
        is_critical = False
        if batch.metadata:
            if batch.action == "execute_fund_transfer":
                amount = float(batch.metadata.get("amount", 0))
                bal = float(user.current_balance or 0)
                if bal > 0:
                    pct = (amount / bal) * 100
                    if pct > TRANSFER_PERCENTAGE_THRESHOLD:
                        context_risk_spike = 100
                        is_critical = True
                        justifications.append("Large Transfer")
                    elif pct > 20: context_risk_spike += 40
                else:
                    context_risk_spike = 100
                    is_critical = True

        raw_risk = 0
        login_count = user.login_count or 0
        in_learning = login_count < 3
        if in_learning: raw_risk = 0
        elif user.is_enrolled:
            raw_risk = int(min(100, (ml_base_risk + context_risk_spike) * (1.0 + max(0, z_magnitude - 3.0) * 0.3)))
        else: raw_risk = int(min(100, ml_base_risk + context_risk_spike))

        strike_count = 0
        smoothed_risk = int(raw_risk)
        last_verified = 0.0
        session_state = get_session_state(batch.session_id)
        if session_state:
            prev_score = int(session_state.get("risk_score", 0) or 0)
            strike_count = int(session_state.get("strike_count", 0) or 0)
            last_verified = float(session_state.get("last_verified", 0) or 0.0)
            if not in_learning and not is_critical:
                smoothed_risk = int((0.4 * raw_risk) + (0.6 * prev_score))

        time_since = datetime.datetime.utcnow().timestamp() - last_verified
        verified_recent = time_since < 60
        if verified_recent and not is_critical: smoothed_risk = int(smoothed_risk * 0.2)

        status = "allowed"
        if is_critical: status = "otp_triggered"; risk_score = 100; strike_count = max(strike_count, 1)
        elif smoothed_risk > 65: strike_count += 1; status = "blocked" if strike_count >= 3 else "otp_triggered"
        elif smoothed_risk > 30: status = "allowed" if verified_recent else "otp_triggered"
        
        risk_score = int(smoothed_risk if not is_critical else 100)

        if status == "allowed" and batch.action == "execute_fund_transfer" and batch.metadata:
            amount = float(batch.metadata.get("amount", 0))
            if user.current_balance >= amount:
                user.current_balance -= amount
                db.add(Transaction(user_id=user.id, amount=-amount, recipient=str(batch.metadata.get("recipient", "")), status="completed", description=f"Transfer to {batch.metadata.get('recipient')}"))
                justifications.append("Transfer successful")
            else: status = "blocked"; risk_score = 100
        elif status != "allowed" and batch.action == "execute_fund_transfer" and batch.metadata:
            tx_status = "pending" if status == "otp_triggered" else "blocked"
            db.add(Transaction(user_id=user.id, amount=-float(batch.metadata.get("amount", 0)), recipient=str(batch.metadata.get("recipient", "")), status=tx_status, description=f"Security Hold: {batch.metadata.get('recipient')}"))

        otp_reason = ("learning" if in_learning else "risk") if status == "otp_triggered" else None
        set_session_state(batch.session_id, {"risk_score": int(risk_score), "status": str(status), "username": str(user.username), "strike_count": int(strike_count), "otp_reason": otp_reason, "last_verified": float(last_verified)})
        
        action_str = f"{batch.action}"
        if justifications: action_str += f" [{', '.join(justifications[:2])}]"
        db.add(AuditLog(user_id=user.id, action=action_str, risk_score=int(risk_score), status=str(status), behavior_data=json.dumps(behavior_dict), enrolled_data=json.dumps(enrolled_dict) if enrolled_dict else None, strike_count=int(strike_count)))
        db.commit()
        
        return {"session_id": str(batch.session_id), "risk_score": int(risk_score), "status": str(status), "is_enrolled": bool(user.is_enrolled), "otp_reason": otp_reason}
    except Exception as e:
        print(f"ERROR: {e}"); traceback.print_exc()
        raise HTTPException(status_code=500, detail="Internal Error")

@app.get("/api/session/{session_id}")
async def get_session_state_endpoint(session_id: str):
    state = get_session_state(session_id)
    return state if state else {"risk_score": 0, "status": "allowed"}

@app.get("/api/admin/logs")
async def get_admin_logs(db: Session = Depends(get_db)):
    logs = db.query(AuditLog).order_by(AuditLog.timestamp.desc()).limit(50).all()
    return [{"id": l.id, "timestamp": l.timestamp.isoformat(), "username": str(l.user.username), "action": str(l.action), "risk_score": int(l.risk_score), "status": str(l.status), "behavior_data": json.loads(l.behavior_data) if l.behavior_data else None, "enrolled_data": json.loads(l.enrolled_data) if l.enrolled_data else None, "strike_count": int(l.strike_count)} for l in logs]

@app.get("/api/admin/users")
async def list_users(db: Session = Depends(get_db)):
    users = db.query(User).all()
    return [{"id": u.id, "username": str(u.username), "is_enrolled": bool(u.is_enrolled), "classification": str(u.profile.classification if u.profile else "N/A"), "login_count": int(u.login_count), "current_balance": float(u.current_balance)} for u in users]

@app.post("/api/admin/create-user")
async def create_user(req: CreateUserRequest, db: Session = Depends(get_db)):
    if db.query(User).filter(User.username == req.username).first(): raise HTTPException(status_code=400, detail="Exists")
    db.add(User(username=req.username, password="password", is_enrolled=False))
    db.commit()
    return {"status": "created"}

@app.post("/api/admin/delete-user")
async def delete_user(req: CreateUserRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == req.username).first()
    if not user: raise HTTPException(status_code=404)
    if user.profile: db.delete(user.profile)
    for log in user.logs: db.delete(log)
    db.delete(user)
    db.commit()
    return {"status": "deleted"}

@app.post("/api/admin/reset-biometrics")
async def reset_biometrics(req: CreateUserRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == req.username).first()
    if not user: raise HTTPException(status_code=404)
    user.is_enrolled = False; user.login_count = 0 
    if user.profile: db.delete(user.profile)
    db.commit()
    return {"status": "reset"}

@app.post("/verify-otp")
async def verify_otp(req: VerifyOtpRequest, db: Session = Depends(get_db)):
    user_id = SESSIONS.get(req.session_id)
    if not user_id or req.otp != "123456": raise HTTPException(status_code=401)
    user = db.query(User).filter(User.id == user_id).first()
    pending = db.query(Transaction).filter(Transaction.user_id == user_id, Transaction.status == "pending").all()
    for tx in pending:
        if user.current_balance >= abs(tx.amount):
            user.current_balance -= abs(tx.amount); tx.status = "completed"
        else: tx.status = "blocked"
    delete_session_state(req.session_id)
    db.add(AuditLog(user_id=user_id, action="otp_success", risk_score=0, status="allowed"))
    db.commit()
    return {"status": "success"}

@app.get("/health")
async def health_check():
    return {"status": "online", "redis": redis_client is not None}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
