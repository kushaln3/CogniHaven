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
from database import SessionLocal, User, BehaviorProfile, AuditLog, Transaction, RawTelemetry, init_db

# ...

class AccountResponse(BaseModel):
    username: str
    current_balance: float
    is_enrolled: bool

class TransactionResponse(BaseModel):
    id: int
    amount: float
    recipient: str
    status: str
    timestamp: str
    description: str

# Initialize Database
init_db()

# --- Security Configuration ---
# Transfers exceeding this % of total balance will trigger a Critical Violation (OTP)
TRANSFER_PERCENTAGE_THRESHOLD = 70.0

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

# Allow CORS for the React frontend (Allowing all for Tunnel/Port Forwarding)
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
# session_id -> user_id
SESSIONS: Dict[str, int] = {}
# session_id -> {risk_score, status, strike_count, last_verified}
SESSION_STATE: Dict[str, Dict] = {}

# --- Load ML Model ---
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, "..", "ml_engine", "isolation_forest.pkl")
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
    if session_id in SESSION_STATE:
        # Keep verified status if it exists, just reset risk
        old_state = SESSION_STATE[session_id]
        SESSION_STATE[session_id] = {
            "risk_score": 0,
            "status": "allowed",
            "strike_count": 0,
            "last_verified": datetime.datetime.utcnow().timestamp()
        }
    else:
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
        "username": user.username,
        "current_balance": user.current_balance,
        "is_enrolled": user.is_enrolled
    }

@app.get("/api/user/transactions")
async def get_transactions(session_id: str, db: Session = Depends(get_db)):
    user_id = SESSIONS.get(session_id)
    if not user_id: raise HTTPException(status_code=401, detail="Invalid session")
    txs = db.query(Transaction).filter(Transaction.user_id == user_id).order_by(Transaction.timestamp.desc()).all()
    return [{
        "id": tx.id,
        "amount": tx.amount,
        "recipient": tx.recipient,
        "status": tx.status,
        "timestamp": tx.timestamp.isoformat(),
        "description": tx.description
    } for tx in txs]

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
    
    # --- Capture the Data: Store raw telemetry (Learning and Anomaly) ---
    # We store it as unverified (is_verified=False)
    raw_rec = RawTelemetry(
        user_id=user.id,
        dwell_mean=raw_features[0],
        dwell_variance=raw_features[1],
        flight_mean=raw_features[2],
        flight_variance=raw_features[3],
        velocity_mean=raw_features[4],
        velocity_variance=raw_features[5],
        is_verified=False
    )
    db.add(raw_rec)
    db.commit()

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
    is_critical_violation = False
    
    if batch.metadata:
        if batch.action == "execute_fund_transfer":
            amount = float(batch.metadata.get("amount", 0))
            # Percentage-Based Anomaly Detection
            if user.current_balance > 0:
                transfer_percentage = (amount / user.current_balance) * 100
                if transfer_percentage > TRANSFER_PERCENTAGE_THRESHOLD:
                    context_risk_spike = 100
                    is_critical_violation = True
                    justifications.append(f"HIGH RISK: Large Balance Drain ({int(transfer_percentage)}%)")
                elif transfer_percentage > 20: # Secondary caution threshold
                    context_risk_spike += 40
                    justifications.append(f"High-Value Transfer ({int(transfer_percentage)}%)")
            else:
                # If balance is 0 or less, any transfer attempt is a critical violation
                context_risk_spike = 100
                is_critical_violation = True
                justifications.append("CRITICAL: Transfer with Zero Balance")
        
        if batch.action == "execute_loan_application":
            amount = float(batch.metadata.get("amount", 0))
            if amount > 100000: 
                context_risk_spike = 100
                is_critical_violation = True
                justifications.append(f"HIGH RISK: Extreme Loan Request (${amount})")
            elif amount > 20000:
                context_risk_spike += 50
                justifications.append(f"High-Value Loan (${amount})")
        
        if batch.action == "execute_profile_update":
            changes = batch.metadata.get("changes", [])
            if "email" in changes and "phone" in changes:
                context_risk_spike = 100
                is_critical_violation = True
                justifications.append("CRITICAL: Identity Wipe Attempt")

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
    last_verified = 0
    
    # --- Load Session State (Redis or In-Memory Fallback) ---
    session_state = get_session_state(batch.session_id)
    if session_state:
        prev_score = session_state.get("risk_score", 0)
        strike_count = session_state.get("strike_count", 0)
        last_verified = session_state.get("last_verified", 0)
        
        # Bypass smoothing for critical context violations to allow immediate response
        if not in_learning_mode and not is_critical_violation:
            smoothed_risk = int((0.4 * raw_risk) + (0.6 * prev_score))

    # --- Verification Grace Period ---
    # If the user just verified via OTP in the last 60 seconds, we give them a trust boost
    time_since_verified = datetime.datetime.utcnow().timestamp() - last_verified
    is_verified_recent = time_since_verified < 60
    
    if is_verified_recent and not is_critical_violation:
        smoothed_risk = int(smoothed_risk * 0.2) # 80% risk reduction
        justifications.append("Trust Boost: Recently Verified")

    status = "allowed"
    if is_critical_violation:
        if batch.action == "execute_profile_update":
            status = "blocked" # Critical identity wipe - immediate block
            risk_score = 100
            strike_count = 3
        else:
            status = "otp_triggered" # High transaction - force verification
            risk_score = 100
            strike_count = max(strike_count, 1)
    elif smoothed_risk > 65:
        strike_count += 1
        if strike_count >= 3:
            status = "blocked"
        else:
            status = "otp_triggered" 
            justifications.append(f"Anomaly Strike {strike_count}/3")
    elif smoothed_risk > 30:
        # If we just verified, we don't re-trigger OTP immediately for behavioral drift
        if is_verified_recent:
            status = "allowed"
        else:
            status = "otp_triggered"
        strike_count = max(0, strike_count - 1) 
    else:
        status = "allowed"
        strike_count = 0 

    risk_score = smoothed_risk if not is_critical_violation else 100

    # --- Execute Real Banking Logic if Allowed ---
    if status == "allowed" and batch.action == "execute_fund_transfer" and batch.metadata:
        amount = float(batch.metadata.get("amount", 0))
        recipient = batch.metadata.get("recipient", "Unknown")
        if user.current_balance >= amount:
            user.current_balance -= amount
            new_tx = Transaction(
                user_id=user.id,
                amount=-amount,
                recipient=recipient,
                status="completed",
                description=f"Transfer to {recipient}"
            )
            db.add(new_tx)
            justifications.append(f"Transfer of ₹{amount} successful")
        else:
            status = "blocked"
            risk_score = 100
            justifications.append("Insufficient Funds")
    
    elif status != "allowed" and batch.action == "execute_fund_transfer" and batch.metadata:
        amount = float(batch.metadata.get("amount", 0))
        recipient = batch.metadata.get("recipient", "Unknown")
        # If OTP is triggered, mark it as pending
        tx_status = "pending" if status == "otp_triggered" else "blocked"
        new_tx = Transaction(
            user_id=user.id,
            amount=-amount,
            recipient=recipient,
            status=tx_status,
            description=f"Security Hold: Transfer to {recipient}"
        )
        db.add(new_tx)

    otp_reason = None
    if status == "otp_triggered":
        otp_reason = "learning" if in_learning_mode else "risk"

    # --- Save Session State ---
    new_state = {
        "risk_score": risk_score, 
        "status": status, 
        "username": user.username,
        "strike_count": strike_count,
        "otp_reason": otp_reason,
        "last_verified": last_verified
    }
    set_session_state(batch.session_id, new_state)
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
        "is_enrolled": user.is_enrolled,
        "otp_reason": otp_reason
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
        "classification": "Learning" if u.login_count < 3 else (u.profile.classification if u.profile else "N/A"),
        "login_count": u.login_count,
        "current_balance": u.current_balance
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

# --- Feedback Loop Logic (Simplified: Transactions only) ---

@app.post("/verify-otp")
async def verify_otp(req: VerifyOtpRequest, db: Session = Depends(get_db)):
    session_id = req.session_id
    otp = req.otp
    
    user_id = SESSIONS.get(session_id)
    if not user_id: raise HTTPException(status_code=401, detail="Invalid session")
    
    if otp != "123456": # Mock OTP
        raise HTTPException(status_code=401, detail="Invalid OTP")
    
    user = db.query(User).filter(User.id == user_id).first()
    
    # Update pending transactions for this user
    pending_txs = db.query(Transaction).filter(Transaction.user_id == user_id, Transaction.status == "pending").all()
    for tx in pending_txs:
        # Check if balance is still enough
        amount = abs(tx.amount)
        if user.current_balance >= amount:
            user.current_balance -= amount
            tx.status = "completed"
            tx.description = tx.description.replace("Security Hold: ", "")
        else:
            tx.status = "blocked"
            tx.description = "Insufficient Funds after verification"

    # Reset risk (Uses helper to ensure verification timestamp is set)
    delete_session_state(session_id)

    new_log = AuditLog(user_id=user_id, action="otp_verification_success", risk_score=0, status="allowed")     
    db.add(new_log)
    db.commit()
    
    return {"status": "success", "username": user.username}

@app.get("/health")
async def health_check():
    return {"status": "online", "redis": redis_client is not None}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
