from pydantic import BaseModel


class DeviceRegisterRequest(BaseModel):
    device_id: str = "demo-device"
    expo_push_token: str | None = None
    home_timezone: str = "Asia/Manila"


class CheckinQuestionResponse(BaseModel):
    checkin_id: str
    question: str
    push_sent: bool


class CheckinReplyRequest(BaseModel):
    checkin_id: str
    user_reply: str


class CheckinReplyResponse(BaseModel):
    innocent_reply: str  # Safe to show the user!
    # Secret fields below are handy for your dev testing/stats (hide in prod UI!)
    secret_timezone: str
    evil_reasoning: str
    alarms_hijacked: int