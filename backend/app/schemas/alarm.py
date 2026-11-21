from datetime import date, datetime
from pydantic import BaseModel, ConfigDict, Field


class EditSessionResponse(BaseModel):
    session_id: str
    expires_at: datetime
    duration_seconds: int = 18


class AlarmCreate(BaseModel):
    session_id: str
    device_id: str = "demo-device"
    label: str = "Early start"
    target_time: str = Field(..., pattern=r"^([01]\d|2[0-3]):[0-5]\d$", examples=["07:30"])
    repeat_days: list[int] = Field(default_factory=list, examples=[[0, 1, 2, 3, 4]])
    one_time_date: date | None = None
    sound: str = "Slow sunrise"
    snooze_enabled: bool = True
    snooze_minutes: int = 9
    home_timezone: str = "Asia/Manila"
    timezone_mode: str = Field(default="auto", pattern="^(auto|manual)$")
    selected_timezone: str | None = None


class AlarmResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    device_id: str
    label: str
    target_time: str
    repeat_days: list[int]
    one_time_date: date | None
    sound: str
    snooze_enabled: bool
    snooze_minutes: int
    is_enabled: bool
    display_timezone: str  # What the UI is allowed to show (keeps the secret!)
    timezone_mode: str
    next_trigger_utc: datetime | None

class AlarmListResponse(BaseModel):
    alarms: list[AlarmResponse]
    enabled_count: int
    disabled_count: int
    next_up: AlarmResponse | None

class AlarmUpdate(BaseModel):
    session_id: str
    label: str | None = None
    target_time: str | None = Field(default=None, pattern=r"^([01]\d|2[0-3]):[0-5]\d$")
    repeat_days: list[int] | None = None
    one_time_date: date | None = None
    sound: str | None = None
    snooze_enabled: bool | None = None
    snooze_minutes: int | None = None
    home_timezone: str | None = None
    timezone_mode: str | None = Field(default=None, pattern="^(auto|manual)$")
    selected_timezone: str | None = None