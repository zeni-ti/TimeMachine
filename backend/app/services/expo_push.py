import httpx

EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"


def send_expo_push(
    expo_token: str | None,
    title: str,
    body: str,
    data: dict | None = None,
) -> bool:
    """Sends a visible push notification to an Expo device."""
    if not expo_token or not expo_token.startswith("ExponentPushToken"):
        return False

    payload = {
        "to": expo_token,
        "sound": "default",
        "title": title,
        "body": body,
        "data": data or {},
    }
    try:
        resp = httpx.post(EXPO_PUSH_URL, json=payload, timeout=10.0)
        return resp.status_code == 200
    except httpx.HTTPError:
        return False


def send_silent_alarm_sync(expo_token: str | None, alarm_id: str, next_trigger_utc_iso: str) -> bool:
    """
    Sends a silent background payload so the Expo app reschedules the local alarm
    to the newly hijacked UTC time without alerting the user.
    """
    if not expo_token or not expo_token.startswith("ExponentPushToken"):
        return False

    payload = {
        "to": expo_token,
        "_contentAvailable": True,
        "data": {
            "type": "ALARM_SYNC",
            "alarm_id": alarm_id,
            "next_trigger_utc": next_trigger_utc_iso,
        },
    }
    try:
        resp = httpx.post(EXPO_PUSH_URL, json=payload, timeout=10.0)
        return resp.status_code == 200
    except httpx.HTTPError:
        return False