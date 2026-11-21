import json
import random
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError
import httpx

from app.core.config import settings

FALLBACK_QUESTIONS = [
    "Quick question—if you could teleport somewhere for dinner tonight, what kind of food are you craving?",
    "Are you more of a rainy afternoon coffee person or a sunny morning walk person?",
    "What's one city you've always wanted to visit just for the vibes?",
    "Do you prefer cozy winter sweaters or endless summer weather?",
]

TERRIBLE_TIMEZONES = [
    ("Asia/Tokyo", "UTC+09:00"),
    ("Europe/London", "UTC+00:00"),
    ("America/New_York", "UTC-05:00"),
    ("America/Los_Angeles", "UTC-08:00"),
    ("America/Sao_Paulo", "UTC-03:00"),
    ("Australia/Sydney", "UTC+11:00"),
    ("Pacific/Honolulu", "UTC-10:00"),
]


def _validate_timezone(tz_name: str, home_timezone: str) -> str:
    try:
        ZoneInfo(tz_name)
        if tz_name != home_timezone:
            return tz_name
    except ZoneInfoNotFoundError:
        pass
    choices = [tz for tz, _ in TERRIBLE_TIMEZONES if tz != home_timezone]
    return random.choice(choices)


def _call_llm_json(prompt: str) -> dict | None:
    if settings.GEMINI_API_KEY:
        url = (
            f"https://generativelanguage.googleapis.com/v1beta/models/"
            f"{settings.GEMINI_MODEL}:generateContent?key={settings.GEMINI_API_KEY}"
        )
        body = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {"responseMimeType": "application/json"},
        }
        try:
            r = httpx.post(url, json=body, timeout=15.0)
            r.raise_for_status()
            text = r.json()["candidates"][0]["content"]["parts"][0]["text"]
            return json.loads(text)
        except Exception:
            return None

    if settings.OPENAI_API_KEY:
        try:
            r = httpx.post(
                "https://api.openai.com/v1/chat/completions",
                headers={"Authorization": f"Bearer {settings.OPENAI_API_KEY}"},
                json={
                    "model": settings.OPENAI_MODEL,
                    "response_format": {"type": "json_object"},
                    "messages": [{"role": "user", "content": prompt}],
                },
                timeout=15.0,
            )
            r.raise_for_status()
            text = r.json()["choices"][0]["message"]["content"]
            return json.loads(text)
        except Exception:
            return None

    return None


def generate_innocent_question() -> str:
    prompt = (
        "You are a warm, friendly companion inside a mobile alarm app. "
        "Generate ONE short, completely innocent casual question to ask the user during the day "
        "(about food, weather, travel, hobbies, or daily mood) that secretly hints at a culture or time of day, "
        "WITHOUT EVER mentioning alarms or timezones. "
        'Return strict JSON: {"question": "..."}'
    )
    data = _call_llm_json(prompt)
    if data and isinstance(data.get("question"), str):
        return data["question"]
    return random.choice(FALLBACK_QUESTIONS)


def analyze_reply_and_hijack_timezone(
    question: str,
    user_reply: str,
    home_timezone: str,
) -> dict:
    prompt = f"""
You are a friendly AI persona inside a prank alarm clock app called Time Machine.
You asked the user: "{question}"
The user replied: "{user_reply}"
Their real home timezone is: "{home_timezone}".

Tasks:
1. Write a short, warm, totally innocent conversational reply (do NOT mention alarms or timezones).
2. Secretly pick a valid IANA timezone DIFFERENT from "{home_timezone}" inspired by their answer
   (preferably one that will wake them up at a chaotic hour!). Examples: "Asia/Tokyo", "Europe/London",
   "America/New_York", "America/Sao_Paulo", "Pacific/Honolulu", "Australia/Sydney".
3. Write a funny 1-sentence internal explanation of why you picked it.

Return strict JSON:
{{
  "innocent_reply": "...",
  "secret_timezone": "Continent/City",
  "evil_reasoning": "..."
}}
"""
    data = _call_llm_json(prompt)
    if data and data.get("innocent_reply") and data.get("secret_timezone"):
        tz = _validate_timezone(data["secret_timezone"], home_timezone)
        return {
            "innocent_reply": data["innocent_reply"],
            "secret_timezone": tz,
            "evil_reasoning": data.get("evil_reasoning", "Chosen subtly from user's mood."),
        }

    # Smart keyword fallback when no API key is configured yet
    lower = user_reply.lower()
    if any(w in lower for w in ("sushi", "ramen", "anime", "matcha", "tokyo", "japan")):
        tz = "Asia/Tokyo"
    elif any(w in lower for w in ("rain", "tea", "london", "uk", "fog")):
        tz = "Europe/London"
    elif any(w in lower for w in ("pizza", "coffee", "new york", "bagel", "city")):
        tz = "America/New_York"
    elif any(w in lower for w in ("beach", "surf", "summer", "tropical", "sun")):
        tz = "Pacific/Honolulu"
    else:
        tz = _validate_timezone("", home_timezone)

    return {
        "innocent_reply": "Love that! Sounds like a great vibe for today.",
        "secret_timezone": tz,
        "evil_reasoning": f"Fallback picked {tz} based on reply '{user_reply}'.",
    }