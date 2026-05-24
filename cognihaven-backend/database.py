from sqlalchemy import create_engine, Column, Integer, String, Float, Boolean, ForeignKey, DateTime
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
import datetime
import os

def get_ist():
    # IST is UTC+5:30
    return datetime.datetime.utcnow() + datetime.timedelta(hours=5, minutes=30)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
SQLALCHEMY_DATABASE_URL = f"sqlite:///{os.path.join(BASE_DIR, 'cognihaven.db')}"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    password = Column(String)
    is_enrolled = Column(Boolean, default=False)
    login_count = Column(Integer, default=0)
    current_balance = Column(Float, default=50000.0)

    profile = relationship("BehaviorProfile", back_populates="user", uselist=False)
    logs = relationship("AuditLog", back_populates="user")
    transactions = relationship("Transaction", back_populates="user")
    raw_telemetry = relationship("RawTelemetry", back_populates="user")

class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    amount = Column(Float)
    timestamp = Column(DateTime, default=get_ist)
    recipient = Column(String)
    status = Column(String) # 'completed', 'blocked', 'flagged'
    description = Column(String)

    user = relationship("User", back_populates="transactions")

class RawTelemetry(Base):
    __tablename__ = "raw_telemetry"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    timestamp = Column(DateTime, default=get_ist)
    is_verified = Column(Boolean, default=False) # True if verified via OTP
    
    # Raw features extracted from batch
    dwell_mean = Column(Float)
    dwell_variance = Column(Float)
    flight_mean = Column(Float)
    flight_variance = Column(Float)
    velocity_mean = Column(Float)
    velocity_variance = Column(Float)

    user = relationship("User", back_populates="raw_telemetry")

class BehaviorProfile(Base):
    __tablename__ = "behavior_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    
    dwell_mu = Column(Float)
    dwell_sigma = Column(Float)
    flight_mu = Column(Float)
    flight_sigma = Column(Float)
    velocity_mu = Column(Float)
    velocity_sigma = Column(Float)
    classification = Column(String) # 'Slow', 'Medium', 'Fast'
    sample_count = Column(Integer, default=1) # Number of verified batches incorporated

    user = relationship("User", back_populates="profile")

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=get_ist)
    user_id = Column(Integer, ForeignKey("users.id"))
    action = Column(String)
    risk_score = Column(Integer)
    status = Column(String) # 'allowed', 'otp_triggered', 'blocked'

    # Detailed behavioral insights
    behavior_data = Column(String, nullable=True) # JSON string of current batch features
    enrolled_data = Column(String, nullable=True) # JSON string of user baseline
    strike_count = Column(Integer, default=0)

    user = relationship("User", back_populates="logs")

def init_db():
    Base.metadata.create_all(bind=engine)
