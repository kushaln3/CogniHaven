from sqlalchemy import create_engine, Column, Integer, String, Float, Boolean, ForeignKey, DateTime
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
import datetime

SQLALCHEMY_DATABASE_URL = "sqlite:///./cognihaven.db"

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

    profile = relationship("BehaviorProfile", back_populates="user", uselist=False)
    logs = relationship("AuditLog", back_populates="user")

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

    user = relationship("User", back_populates="profile")

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    user_id = Column(Integer, ForeignKey("users.id"))
    action = Column(String)
    risk_score = Column(Integer)
    status = Column(String) # 'allowed', 'otp_triggered', 'blocked'

    user = relationship("User", back_populates="logs")

def init_db():
    Base.metadata.create_all(bind=engine)
