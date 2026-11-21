# TimeMachine

### Your mornings, made needlessly difficult.

TimeMachine is a comedy alarm clock built for the Malfunction hackathon. It looks like a calm, modern sleep app, then turns the simple act of setting an alarm into a chain of deeply questionable decisions.

> Set an alarm. Question your choices. Solve a puzzle. Maybe wake up.

## The experience

- **Calculator-style time entry** — tap digits, switch between hours and minutes, and try not to press the wrong operation.
- **Timezone roulette** — alarm times are quietly assigned a random timezone. The surprise is revealed when the alarm rings.
- **A very unfair CAPTCHA** — find traffic lights in a grid that contains none. A few failed attempts eventually let the demo continue.
- **A 45-second session** — mistakes cost time, and the form resets when the countdown runs out.
- **Three rounds of confirmation** — every major alarm action asks again, with the buttons changing places.
- **A theme that cannot sit still** — tapping anywhere flips between light and dark.
- **Sudoku to stop the alarm** — use the number keys to complete the 4×4 grid. There is no snooze button; an emergency escape appears after 30 seconds.

Use **Trigger alarm now** to jump straight to the Sudoku during a demo.

## Run it with Expo Go

You’ll need [Node.js](https://nodejs.org/) and the Expo Go app on your phone.

1. Clone the repository and open a terminal in the project folder.
2. Install dependencies and start Expo:

   ```bash
   cd frontend
   npm ci
   npx expo start
   ```

3. Connect your phone and computer to the same Wi-Fi network.
4. Open Expo Go and scan the QR code shown in the terminal.

Keep the terminal and Expo server running while you use the app. If your network blocks local device connections, try Expo’s tunnel connection option from the CLI.

## Development commands

Run these from `frontend/`:

```bash
npx expo start       # Start the development server
npx expo start --web # Open the web version
npx expo lint        # Run lint checks
npx tsc --noEmit     # Run TypeScript checks
```

## Built with

- Expo SDK 58 and Expo Router
- React 19
- React Native 0.88
- TypeScript

## Demo notes

- This is a frontend-only demo. It has no backend, and alarm settings are kept in memory rather than saved across app restarts.
- Scheduled alarms are checked while the app is open; this is not a background alarm service.
- The synthesized alarm uses the browser’s Web Audio API when available. Native runtimes may show the ringing puzzle without sound.
- The deliberately hostile interactions are part of the joke. The CAPTCHA and Sudoku both have ways to continue if a live demo gets stuck.

---

Made to make a simple morning unnecessarily complicated by the TimeMachine team.
