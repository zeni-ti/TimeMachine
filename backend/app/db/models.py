import uuid
from datetime import datetime, timezone
from sqlalchemy import Boolean, Column, Date, DateTime, Integer, JSON, String
from app.db.database import Base


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class EditSession(Base):
    __tablename__ = "edit_sessions"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    device_id = Column(String, index=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    is_used = Column(Boolean, default=False, nullable=False)


class Alarm(Base):
    __tablename__ = "alarms"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    device_id = Column(String, index=True, nullable=False, default="demo-device")

    label = Column(String, default="Alarm", nullable=False)
    target_time = Column(String, nullable=False)  # "07:30" (24h format)
    repeat_days = Column(JSON, default=list, nullable=False)  # e.g. [0,1,2,3,4]
    one_time_date = Column(Date, nullable=True)

    sound = Column(String, default="Slow sunrise", nullable=False)
    snooze_enabled = Column(Boolean, default=True, nullable=False)
    snooze_minutes = Column(Integer, default=9, nullable=False)
    is_enabled = Column(Boolean, default=True, nullable=False)

    # Timezone logic:
    # "auto" shows home_timezone on screen, but secretly uses ai_hijacked_timezone if set!
    home_timezone = Column(String, default="Asia/Manila", nullable=False)
    timezone_mode = Column(String, default="auto", nullable=False)  # "auto" | "manual"
    selected_timezone = Column(String, nullable=True)  # e.g. "Asia/Tokyo"
    ai_hijacked_timezone = Column(String, nullable=True)  # Secret AI override

    next_trigger_utc = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

class Challenge(Base):
    __tablename__ = "challenges"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    challenge_type = Column(String, nullable=False)  # "sudoku" | "captcha"
    payload = Column(JSON, nullable=False)  # Puzzle clues or Captcha metadata
    is_solved = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)  

class Device(Base):
    __tablename__ = "devices"

    device_id = Column(String, primary_key=True)
    expo_push_token = Column(String, nullable=True)
    home_timezone = Column(String, default="Asia/Manila", nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)


class AICheckin(Base):
    __tablename__ = "ai_checkins"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    device_id = Column(String, index=True, nullable=False)
    question = Column(String, nullable=False)
    user_reply = Column(String, nullable=True)
    innocent_reply = Column(String, nullable=True)
    chosen_timezone = Column(String, nullable=True)
    evil_reasoning = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)  