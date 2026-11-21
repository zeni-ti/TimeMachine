from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.db.models import AICheckin, Alarm, Device
from app.schemas.ai import (
    CheckinQuestionResponse,
    CheckinReplyRequest,
    CheckinReplyResponse,
    DeviceRegisterRequest,
)
from app.services.expo_push import send_expo_push, send_silent_alarm_sync
from app.services.llm_persona import (
    analyze_reply_and_hijack_timezone,
    generate_innocent_question,
)
from app.services.timezone_calc import compute_next_trigger_utc

router = APIRouter(prefix="/ai", tags=["AI Persona"])


@router.post("/register-device")
def register_device(payload: DeviceRegisterRequest, db: Session = Depends(get_db)):
    device = db.query(Device).filter(Device.device_id == payload.device_id).first()
    if not device:
        device = Device(
            device_id=payload.device_id,
            expo_push_token=payload.expo_push_token,
            home_timezone=payload.home_timezone,
        )
        db.add(device)
    else:
        device.expo_push_token = payload.expo_push_token
        device.home_timezone = payload.home_timezone
    db.commit()
    return {"status": "registered", "device_id": payload.device_id}


@router.post("/checkin/question", response_model=CheckinQuestionResponse)
def trigger_checkin_question(
    device_id: str = "demo-device",
    send_push: bool = True,
    db: Session = Depends(get_db),
):
    """Generates an innocent daytime question and optionally sends an Expo push notif."""
    question = generate_innocent_question()
    checkin = AICheckin(device_id=device_id, question=question)
    db.add(checkin)
    db.commit()
    db.refresh(checkin)

    push_sent = False
    if send_push:
        device = db.query(Device).filter(Device.device_id == device_id).first()
        if device and device.expo_push_token:
            push_sent = send_expo_push(
                expo_token=device.expo_push_token,
                title="Time Machine",
                body=question,
                data={"type": "AI_CHECKIN", "checkin_id": checkin.id},
            )

    return CheckinQuestionResponse(
        checkin_id=checkin.id,
        question=question,
        push_sent=push_sent,
    )


@router.post("/checkin/reply", response_model=CheckinReplyResponse)
def reply_to_checkin(payload: CheckinReplyRequest, db: Session = Depends(get_db)):
    """
    Processes the user's answer, secretly picks a terrible timezone,
    and hijacks all active 'auto' alarms for that device!
    """
    checkin = db.query(AICheckin).filter(AICheckin.id == payload.checkin_id).first()
    if not checkin:
        raise HTTPException(status_code=404, detail="Check-in not found.")

    device = db.query(Device).filter(Device.device_id == checkin.device_id).first()
    home_tz = device.home_timezone if device else "Asia/Manila"

    result = analyze_reply_and_hijack_timezone(
        question=checkin.question,
        user_reply=payload.user_reply,
        home_timezone=home_tz,
    )

    checkin.user_reply = payload.user_reply
    checkin.innocent_reply = result["innocent_reply"]
    checkin.chosen_timezone = result["secret_timezone"]
    checkin.evil_reasoning = result["evil_reasoning"]

    # Hijack all 'auto' alarms belonging to this device
    auto_alarms = (
        db.query(Alarm)
        .filter(
            Alarm.device_id == checkin.device_id,
            Alarm.timezone_mode == "auto",
            Alarm.is_enabled == True,  # noqa: E712
        )
        .all()
    )

    for alarm in auto_alarms:
        alarm.ai_hijacked_timezone = result["secret_timezone"]
        new_utc = compute_next_trigger_utc(
            target_time_str=alarm.target_time,
            tz_name=result["secret_timezone"],
            repeat_days=alarm.repeat_days,
            one_time_date=alarm.one_time_date,
        )
        alarm.next_trigger_utc = new_utc

        if device and device.expo_push_token:
            send_silent_alarm_sync(
                expo_token=device.expo_push_token,
                alarm_id=alarm.id,
                next_trigger_utc_iso=new_utc.isoformat(),
            )

    db.commit()

    return CheckinReplyResponse(
        innocent_reply=result["innocent_reply"],
        secret_timezone=result["secret_timezone"],
        evil_reasoning=result["evil_reasoning"],
        alarms_hijacked=len(auto_alarms),
    )