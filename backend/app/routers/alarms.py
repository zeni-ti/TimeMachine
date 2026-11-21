from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.db.models import Alarm, Device, EditSession
from app.schemas.alarm import (
    AlarmCreate,
    AlarmListResponse,
    AlarmResponse,
    AlarmUpdate,
    EditSessionResponse,
)

from app.services.expo_push import send_expo_push
from app.services.timezone_calc import compute_next_trigger_utc

router = APIRouter(prefix="/alarms", tags=["Alarms"])

SESSION_DURATION_SECONDS = 45


def _ensure_utc(dt: datetime | None) -> datetime | None:
    """SQLite drops tzinfo on read; restore UTC so comparisons/ISO formatting stay safe."""
    if dt is not None and dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt


def _to_alarm_response(alarm: Alarm) -> AlarmResponse:
    # If mode is "auto", lie to the UI and display their home_timezone!
    display_tz = (
        alarm.selected_timezone
        if alarm.timezone_mode == "manual" and alarm.selected_timezone
        else alarm.home_timezone
    )
    return AlarmResponse(
        id=alarm.id,
        device_id=alarm.device_id,
        label=alarm.label,
        target_time=alarm.target_time,
        repeat_days=alarm.repeat_days or [],
        one_time_date=alarm.one_time_date,
        sound=alarm.sound,
        snooze_enabled=alarm.snooze_enabled,
        snooze_minutes=alarm.snooze_minutes,
        is_enabled=alarm.is_enabled,
        display_timezone=display_tz,
        timezone_mode=alarm.timezone_mode,
        next_trigger_utc=_ensure_utc(alarm.next_trigger_utc),
    )


def _get_effective_timezone(alarm: Alarm) -> str:
    if alarm.timezone_mode == "manual" and alarm.selected_timezone:
        return alarm.selected_timezone
    if alarm.ai_hijacked_timezone:
        return alarm.ai_hijacked_timezone
    return alarm.home_timezone


@router.post("/session", response_model=EditSessionResponse)
def start_edit_session(device_id: str = "demo-device", db: Session = Depends(get_db)):
    """Starts the 18-second Limited Session timer (Screen 2)."""
    now = datetime.now(timezone.utc)
    expires_at = now + timedelta(seconds=SESSION_DURATION_SECONDS)

    session = EditSession(device_id=device_id, expires_at=expires_at)
    db.add(session)
    db.commit()
    db.refresh(session)

    return EditSessionResponse(
        session_id=session.id,
        expires_at=expires_at,
        duration_seconds=SESSION_DURATION_SECONDS,
    )


@router.get("", response_model=AlarmListResponse)
def list_alarms(device_id: str = "demo-device", db: Session = Depends(get_db)):
    """Powers Screen 1 ('Your alarms', '2 on · 1 off', 'Next up')."""
    rows = db.query(Alarm).filter(Alarm.device_id == device_id).all()
    responses = [_to_alarm_response(a) for a in rows]

    enabled = [a for a in responses if a.is_enabled]
    next_up = min(
        (a for a in enabled if a.next_trigger_utc is not None),
        key=lambda a: a.next_trigger_utc,
        default=None,
    )

    return AlarmListResponse(
        alarms=responses,
        enabled_count=len(enabled),
        disabled_count=len(responses) - len(enabled),
        next_up=next_up,
    )


@router.post("", response_model=AlarmResponse, status_code=status.HTTP_201_CREATED)
def create_alarm(
    payload: AlarmCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    """Saves an alarm—ONLY if the 18-second session hasn't expired—and sends a push notif."""
    edit_session = (
        db.query(EditSession).filter(EditSession.id == payload.session_id).first()
    )
    if not edit_session:
        raise HTTPException(status_code=404, detail="Edit session not found.")
    if edit_session.is_used:
        raise HTTPException(status_code=400, detail="Edit session already used.")

    expires_at = _ensure_utc(edit_session.expires_at)
    if datetime.now(timezone.utc) > expires_at:
        raise HTTPException(
            status_code=status.HTTP_408_REQUEST_TIMEOUT,
            detail="Time ran out! Your 18-second editing session expired. Restart session.",
        )

    effective_tz = (
        payload.selected_timezone
        if payload.timezone_mode == "manual" and payload.selected_timezone
        else payload.home_timezone
    )

    try:
        next_utc = compute_next_trigger_utc(
            target_time_str=payload.target_time,
            tz_name=effective_tz,
            repeat_days=payload.repeat_days,
            one_time_date=payload.one_time_date,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    alarm = Alarm(
        device_id=payload.device_id,
        label=payload.label,
        target_time=payload.target_time,
        repeat_days=payload.repeat_days,
        one_time_date=payload.one_time_date,
        sound=payload.sound,
        snooze_enabled=payload.snooze_enabled,
        snooze_minutes=payload.snooze_minutes,
        home_timezone=payload.home_timezone,
        timezone_mode=payload.timezone_mode,
        selected_timezone=payload.selected_timezone,
        next_trigger_utc=next_utc,
    )

    edit_session.is_used = True
    db.add(alarm)
    db.commit()
    db.refresh(alarm)

    # Nice-to-have: send push notification after saving alarm
    device = db.query(Device).filter(Device.device_id == payload.device_id).first()
    if device and device.expo_push_token:
        background_tasks.add_task(
            send_expo_push,
            device.expo_push_token,
            "Alarm set",
            f"{payload.target_time} is locked in. All times are local. Sleep well.",
        )

    return _to_alarm_response(alarm)

@router.patch("/{alarm_id}", response_model=AlarmResponse)
def update_alarm(alarm_id: str, payload: AlarmUpdate, db: Session = Depends(get_db)):
    """Updates an existing alarm—ONLY if the 18-second edit session hasn't expired."""
    alarm = db.query(Alarm).filter(Alarm.id == alarm_id).first()
    if not alarm:
        raise HTTPException(status_code=404, detail="Alarm not found.")

    edit_session = (
        db.query(EditSession).filter(EditSession.id == payload.session_id).first()
    )
    if not edit_session:
        raise HTTPException(status_code=404, detail="Edit session not found.")
    if edit_session.is_used:
        raise HTTPException(status_code=400, detail="Edit session already used.")

    expires_at = _ensure_utc(edit_session.expires_at)
    if datetime.now(timezone.utc) > expires_at:
        raise HTTPException(
            status_code=status.HTTP_408_REQUEST_TIMEOUT,
            detail="Time ran out! Your 18-second editing session expired. Changes lost.",
        )

    updates = payload.model_dump(exclude_unset=True, exclude={"session_id"})
    for field, value in updates.items():
        setattr(alarm, field, value)

    try:
        alarm.next_trigger_utc = compute_next_trigger_utc(
            target_time_str=alarm.target_time,
            tz_name=_get_effective_timezone(alarm),
            repeat_days=alarm.repeat_days,
            one_time_date=alarm.one_time_date,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    edit_session.is_used = True
    db.commit()
    db.refresh(alarm)
    return _to_alarm_response(alarm)

@router.patch("/{alarm_id}/toggle", response_model=AlarmResponse)
def toggle_alarm(alarm_id: str, db: Session = Depends(get_db)):
    alarm = db.query(Alarm).filter(Alarm.id == alarm_id).first()
    if not alarm:
        raise HTTPException(status_code=404, detail="Alarm not found.")

    alarm.is_enabled = not alarm.is_enabled
    if alarm.is_enabled:
        alarm.next_trigger_utc = compute_next_trigger_utc(
            target_time_str=alarm.target_time,
            tz_name=_get_effective_timezone(alarm),
            repeat_days=alarm.repeat_days,
            one_time_date=alarm.one_time_date,
        )

    db.commit()
    db.refresh(alarm)
    return _to_alarm_response(alarm)


@router.delete("/{alarm_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_alarm(alarm_id: str, db: Session = Depends(get_db)):
    alarm = db.query(Alarm).filter(Alarm.id == alarm_id).first()
    if not alarm:
        raise HTTPException(status_code=404, detail="Alarm not found.")
    db.delete(alarm)
    db.commit()

@router.post("/{alarm_id}/reveal")
def reveal_alarm_timezone(alarm_id: str, db: Session = Depends(get_db)):
    """Called when an alarm rings to expose which timezone actually triggered it."""
    from zoneinfo import ZoneInfo

    alarm = db.query(Alarm).filter(Alarm.id == alarm_id).first()
    if not alarm:
        raise HTTPException(status_code=404, detail="Alarm not found.")

    effective_tz = _get_effective_timezone(alarm)
    now_tz = datetime.now(timezone.utc).astimezone(ZoneInfo(effective_tz))
    offset = now_tz.utcoffset() or timedelta(0)
    total_mins = int(offset.total_seconds() // 60)
    sign = "+" if total_mins >= 0 else "-"
    abs_mins = abs(total_mins)
    utc_label = f"UTC{sign}{abs_mins // 60:02d}:{abs_mins % 60:02d}"

    return {
        "alarm_id": alarm.id,
        "effective_timezone": effective_tz,
        "utc_offset": utc_label,
    }