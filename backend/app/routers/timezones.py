from zoneinfo import available_timezones
from fastapi import APIRouter, Query
from pydantic import BaseModel

from app.services.timezone_calc import preview_timezone_equivalent

router = APIRouter(prefix="/timezones", tags=["Timezones"])

FEATURED_TIMEZONES = [
    "Europe/London",
    "America/New_York",
    "Asia/Tokyo",
    "Australia/Sydney",
    "Asia/Manila",
    "Europe/Paris",
    "Asia/Dubai",
    "America/Los_Angeles",
]

ALL_CITY_TIMEZONES = sorted(
    tz
    for tz in available_timezones()
    if "/" in tz and not tz.startswith(("Etc/", "SystemV/", "US/", "Canada/"))
)


class TimezonePreview(BaseModel):
    city: str
    timezone: str
    utc_offset: str
    alarm_time: str
    home_equivalent_time: str
    day_relation: str


@router.get("", response_model=list[TimezonePreview])
def list_timezones(
    q: str = Query("", description="Search city name or UTC offset, e.g. 'tokyo' or '+09'"),
    target_time: str = Query("07:30", pattern=r"^([01]\d|2[0-3]):[0-5]\d$"),
    home_timezone: str = Query("Asia/Manila"),
):
    query = q.strip().lower()
    candidates = FEATURED_TIMEZONES if not query else ALL_CITY_TIMEZONES

    results: list[TimezonePreview] = []
    for tz_name in candidates:
        city_name = tz_name.split("/")[-1].replace("_", " ")
        preview = preview_timezone_equivalent(target_time, tz_name, home_timezone)

        if query:
            searchable = f"{city_name} {tz_name} {preview['utc_offset']}".lower()
            if query not in searchable:
                continue

        results.append(TimezonePreview(city=city_name, **preview))
        if len(results) >= 25:
            break

    return results