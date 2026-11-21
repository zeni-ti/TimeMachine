# TimeMachine

### Your mornings, made needlessly difficult.

TimeMachine is a comedy alarm clock built for the Malfunction hackathon. It looks like a calm, modern sleep app, then turns the simple act of setting an alarm into a chain of deeply questionable decisions.

> Set an alarm. Question your choices. Solve a puzzle. Maybe wake up.

## The experience

- **Calculator-style time entry** — tap digits, switch between hours and minutes, and try not to press the wrong operation.
- **Timezone roulette** — alarms are stored against the user's home timezone, but the AI persona can secretly hijack active alarms after a check-in. The surprise is revealed when the alarm rings.
- **A very unfair CAPTCHA** — select an item that is not in the grid. The requested word is also a hidden bypass, if you know where to tap.
- **A 45-second session** — mistakes cost time, and an expired session wipes the alarm draft.
- **Three rounds of confirmation** — every major alarm action asks again, with the buttons changing places.
- **A theme that cannot sit still** — tapping anywhere flips between light and dark.
- **A daily AI check-in** — answer an innocent question; your reply may influence which timezone hijacks your alarms.
- **An Alarms tab** — view scheduled alarms, turn them on or off, and delete them.
- **Sudoku to stop the alarm** — use the number keys to complete the 4×4 grid while the alarm sound plays.

Use **Trigger Alarm Now** from the Alarms tab to jump straight to the ringing puzzle during a demo.

## Requirements

- [Node.js LTS](https://nodejs.org/) and npm
- Python 3.10 or later
- [Expo Go](https://expo.dev/go) on your phone, if testing on a physical device
- A shared Wi-Fi network between your phone and computer for local device testing

The AI persona works without credentials using built-in fallback responses. Gemini or OpenAI API keys are optional.

## Install

Run these commands from the repository root. They create a Python virtual environment, install backend dependencies, and install the locked frontend dependencies.

**Windows PowerShell**

```powershell
cd backend
py -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
cd ..\frontend
npm.cmd ci
```

**macOS or Linux**

```bash
cd backend
python3 -m venv .venv
.venv/bin/python -m pip install -r requirements.txt
cd ../frontend
npm ci
```

## Run the app

Start the backend and Expo in **two separate terminals**. Keep both terminals running while using the app.

**Terminal 1 — backend, Windows PowerShell**

```powershell
cd backend
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**Terminal 1 — backend, macOS or Linux**

```bash
cd backend
.venv/bin/python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**Terminal 2 — Expo, Windows PowerShell**

```powershell
cd frontend
npx.cmd expo start
```

**Terminal 2 — Expo, macOS or Linux**

```bash
cd frontend
npx expo start
```

When Expo shows a QR code, connect your phone and computer to the same Wi-Fi network and scan it with Expo Go (Android) or your phone camera (iPhone). If Expo Go asks for an account on iPhone, sign in with the same Expo account on your phone and computer.

The backend health check is at [http://localhost:8000/health](http://localhost:8000/health), and the interactive API docs are at [http://localhost:8000/docs](http://localhost:8000/docs). SQLite data is stored in `backend/timemachine.db`.

For physical-device testing, allow the backend through your computer's firewall. The frontend normally discovers the backend using the Expo host and port `8000`. If it cannot connect, set `EXPO_PUBLIC_API_URL` to your computer's LAN address (for example, `http://192.168.1.23:8000`) before starting Expo. Expo tunnel mode does not tunnel the backend; the phone must still be able to reach that address.

Optional Gemini or OpenAI API keys can be configured in `backend/.env`.

## Development commands

Run these from `frontend/`. In PowerShell, use `npx.cmd` instead of `npx`.

```powershell
npx.cmd expo start --web # Open the web version
npx.cmd expo lint        # Run lint checks
npx.cmd tsc --noEmit     # Run TypeScript checks
```

## Built with

- Expo SDK 58, Expo Router, and `expo-audio`
- React 19
- React Native 0.88
- TypeScript
- FastAPI, SQLAlchemy, and SQLite

## Demo notes

- Alarm records persist in the local SQLite database. The backend must be running for alarm setup, alarm management, and AI check-ins.
- Alarm times are checked while the app is open; this is not a native background alarm service.
- The ringing screen plays `frontend/assets/alarm.mp3` with `expo-audio`.
- The deliberately hostile interactions are part of the joke. The CAPTCHA prompt word doubles as a hidden bypass; Sudoku must be solved to dismiss the alarm.

---

Made to make a simple morning unnecessarily complicated by **Ay Maliiiiii**.
