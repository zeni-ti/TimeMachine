from datetime import date, datetime, time, timedelta, timezone
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError


def compute_next_trigger_utc(
    target_time_str: str,
    tz_name: str,
    repeat_days: list[int] | None = None,
    one_time_date: date | None = None,
) -> datetime:
    """
    Computes the next UTC trigger datetime for an alarm.
    - target_time_str: "HH:MM" (24-hour format, e.g., "07:30")
    - tz_name: IANA timezone (e.g., "Asia/Manila", "Asia/Tokyo")
    - repeat_days: list of weekday ints (0=Mon .. 6=Sun), or empty/None
    - one_time_date: specific date if scheduled once
    """
    try:
        tz = ZoneInfo(tz_name)
    except ZoneInfoNotFoundError as exc:
        raise ValueError(f"Invalid IANA timezone: {tz_name}") from exc

    hour, minute = map(int, target_time_str.split(":"))
    alarm_time = time(hour=hour, minute=minute)
    now_in_tz = datetime.now(timezone.utc).astimezone(tz)

    if one_time_date is not None:
        candidate = datetime.combine(one_time_date, alarm_time, tzinfo=tz)
        return candidate.astimezone(timezone.utc)

    if repeat_days:
        valid_days = set(repeat_days)
        for day_offset in range(8):
            candidate_date = now_in_tz.date() + timedelta(days=day_offset)
            if candidate_date.weekday() in valid_days:
                candidate = datetime.combine(candidate_date, alarm_time, tzinfo=tz)
                if candidate > now_in_tz:
                    return candidate.astimezone(timezone.utc)

    candidate = datetime.combine(now_in_tz.date(), alarm_time, tzinfo=tz)
    if candidate <= now_in_tz:
        candidate += timedelta(days=1)

    return candidate.astimezone(timezone.utc)


def preview_timezone_equivalent(
    target_time_str: str,
    alarm_tz_name: str,
    home_tz_name: str,
) -> dict:
    """
    Powers the Time Zone screen ("07:30 AM Tokyo -> 22:30 in London · previous day").
    """
    alarm_tz = ZoneInfo(alarm_tz_name)
    home_tz = ZoneInfo(home_tz_name)

    hour, minute = map(int, target_time_str.split(":"))
    today_in_alarm_tz = datetime.now(timezone.utc).astimezone(alarm_tz).date()

    alarm_dt = datetime.combine(today_in_alarm_tz, time(hour, minute), tzinfo=alarm_tz)
    home_dt = alarm_dt.astimezone(home_tz)

    day_diff = (home_dt.date() - alarm_dt.date()).days
    if day_diff < 0:
        day_label = "previous day"
    elif day_diff > 0:
        day_label = "next day"
    else:
        day_label = "same day"

    offset = alarm_dt.utcoffset() or timedelta(0)
    total_mins = int(offset.total_seconds() // 60)
    sign = "+" if total_mins >= 0 else "-"
    abs_mins = abs(total_mins)
    utc_offset_str = f"UTC {sign}{abs_mins // 60:02d}:{abs_mins % 60:02d}"

    return {
        "timezone": alarm_tz_name,
        "utc_offset": utc_offset_str,
        "alarm_time": target_time_str,
        "home_equivalent_time": home_dt.strftime("%H:%M"),
        "day_relation": day_label,
    }