# ⚡ Charged — Battery Full Alarm

A polished React Native (Expo) app that **sounds an alarm and notifies you the moment
your phone finishes charging**, so you can unplug it and keep your battery healthy.

- 🔋 Real‑time battery monitoring with a 10‑cell pixel battery and a giant 3D readout
- 🔔 Looping alarm sound + vibration + system notification when the target is hit
- 🎯 Configurable charge target: **80% / 90% / 100%** (lower targets extend battery lifespan)
- 🌅 **Retro 80s synthwave UI** — see below
- ⏰ A **real alarm** on Android: rings on the alarm volume (even in silent mode) with the app
  closed or the screen off, via a foreground-service monitor + a native alarm player

---

## The engineering prompt behind this build

> *You asked me to research the problem, write a strong prompt, then build from it.
> This is the prompt I authored and then executed:*

> **Build a production‑quality React Native app (Expo, latest SDK) called "Charged" that
> alerts the user when their phone reaches a target charge level while plugged in.**
>
> **Core behavior**
> - Detect, in real time, when the device is *plugged in* **and** the battery has reached a
>   user‑chosen target (default 100%). Use `expo-battery`'s `BatteryState` (`CHARGING`,
>   `FULL`, `NOT_CHARGING`, `UNPLUGGED`) plus level listeners — don't poll in a tight loop.
> - When the target is reached, trigger a **looping alarm sound** (`expo-audio`), **vibration**
>   (`Vibration` API), and a **system notification** (`expo-notifications`) with a custom sound.
> - Fire **exactly once per charging session**; re‑arm automatically when unplugged or the
>   level drops below target (hysteresis). Never spam the user.
> - Provide a **background safety net** (`expo-background-task`) so the user is alerted even
>   when the app is backgrounded, and be honest in the UI that background timing is best‑effort.
>
> **Settings (persisted with AsyncStorage)**
> - Charge target (80/90/100), master monitoring switch, alarm sound on/off, vibration on/off,
>   notification on/off, keep‑screen‑on while charging.
>
> **UI / UX (no compromises)**
> - Orange theme on a warm near‑black background. One central **animated SVG ring** showing
>   charge %, pulsing while charging, turning green when the target is reached.
> - Status pill, stat tiles, a bottom‑sheet settings modal, and a celebratory **full‑screen
>   "Fully charged" takeover** with a single large "Stop alarm" button.
> - A "Test alert" button so users can confirm the alarm works without draining/charging.
>
> **Engineering quality**
> - Clean architecture: `theme/`, `constants`, `services/`, `hooks/`, `providers/`,
>   `components/`, `screens/`. One source of truth for design tokens. No dead code, no hacks.
> - Everything must pass `expo-doctor` and bundle without errors. Generate a real alarm tone
>   and a branded orange app icon rather than leaving placeholders.

---

## Retro design

An orange‑led **80s synthwave / arcade** look:

- **Living backdrop** — a striped sun setting behind rim‑lit mountains, pixel stars, and a
  neon perspective grid whose lines roll toward you: a slow drift on battery, fast while
  charging ("energy flowing"), turbo on the alarm screen. Native-driver animation, CRT
  scanlines and a vignette on top.
- **Type** — *Press Start 2P* (pixel) for display text and *VT323* (CRT terminal) for readouts,
  loaded via `expo-font` while the splash screen holds.
- **Arcade lettering** — the charge % uses a solid 3D extrusion, an ink outline and a hard
  shadow, and changes color by state: sunset yellow, **green** at target, **red** when low.
- **Controls** — physical arcade push‑buttons that sink when pressed, pixel ON/OFF switches,
  a scrolling LED ticker, a blinking terminal cursor, and a "SETTINGS" window with retro
  title‑bar chrome.
- **Alarm screen** — a "CHARGE COMPLETE!" arcade takeover with a screen flash, a
  color‑cycling title (kept at 2.5 Hz, under the 3 Hz photosensitivity limit) and a big green
  STOP button. The Android back button also stops it.
- **Accessible** — honors the OS *Reduce Motion* setting (grid, ticker and flashes hold
  still), labels every control for screen readers, and caps font scaling on pixel display text.

All retro primitives live in `src/components/retro/` and read from one token file,
`src/theme/index.js`.

**App icon** — a "battery alarm clock": a battery body with ringing twin bells, little feet
and a glowing lightning bolt, on an orange sunset gradient with a faint retro grid. It ships as
the launcher icon, Android adaptive icon (foreground, background and a monochrome version for
themed icons), a glowing splash image, and a simplified battery-and-bolt status-bar icon.

## Ads (Google AdMob)

Powered by `react-native-google-mobile-ads`. All ad code lives in `src/ads/`.

| Format | Where | Unit (release builds) |
| --- | --- | --- |
| Anchored adaptive **banner** | Full-width at the bottom of the home screen | `ca-app-pub-2685624187820858/2314147961` |
| **Native Advanced** | Retro "AD" card inside Settings | `ca-app-pub-2685624187820858/5927099079` |

The Android **App ID** (`ca-app-pub-2685624187820858~3600318632`) is set in `app.json` under the
`react-native-google-mobile-ads` plugin. Ad units live in `src/ads/adConfig.js`.

How it behaves:

- **Debug builds always use Google's test ads**, release builds use the real units. Never tap
  your own live ads: AdMob treats it as invalid traffic and can suspend the account. To test
  a *release* build safely, add your phone under **AdMob → Settings → Test devices**.
- **Consent first.** On launch the app runs Google's UMP consent flow (`AdsProvider`); the SDK is
  only initialized, and ads only requested, once `canRequestAds` is true. Where required, Settings
  shows a **PRIVACY OPTIONS** button so users can change their choice. App measurement is delayed
  until then (`delayAppMeasurementInit`).
- **Never breaks the app.** In Expo Go, offline, on no-fill or without consent, ad slots
  collapse to nothing. The SDK is loaded lazily so a missing native module can't crash startup.
- **Policy-minded placement.** No ads on the "CHARGE COMPLETE!" alarm screen (accidental-click
  risk next to STOP). The banner has clear spacing from the TEST ALERT button. The native card
  shows an **AD** badge, the SDK's AdChoices icon, a ≥120dp media view, and unaltered advertiser
  text.
- **iOS:** the given App ID is Android's. `app.json` uses Google's sample iOS App ID so iOS builds
  don't crash, and release iOS builds show no ads until you create an iOS app in AdMob and fill
  in `iosAppId` + the `ios` units in `adConfig.js`.

One-time AdMob console setup (only you can do these):

1. **Privacy & messaging → create a GDPR message** (and a US-states message if you serve the US).
   Without one, the consent form can't appear and EEA/UK users will get no ads.
2. **Publish an `app-ads.txt`** on your developer website and link that site in your Play Store
   listing. AdMob limits ad serving for apps without it.
3. In Play Console, declare **"Contains ads"** and complete the **Data safety** form
   (the Ads SDK collects device identifiers).

## How it works

| Concern | Implementation |
| --- | --- |
| **Battery state** | `src/hooks/useBatteryMonitor.js` subscribes to `expo-battery` level + state listeners and re‑checks on app foreground. |
| **When to ring** | `src/services/chargeAlert.js` is the single decision point. Every reader (open app, foreground service, background task) feeds readings in; it rings once per charging session, re‑arms on unplug / drop below target, and stops the alarm when you unplug. |
| **Alarm** | `src/services/alarm.js`. On Android it drives the local native module `modules/charged-alarm` (MediaPlayer on the **ALARM** stream with a wake lock, alarm‑usage vibration, 10‑min safety stop). Elsewhere it falls back to `expo-audio` + `Vibration`. `AlarmProvider` mirrors its state for the UI. |
| **Notifications** | `src/services/notifications.js`: channel setup, a **STOP ALARM** action button, and the alert. On Android the alert channel is silent because the native alarm does the ringing. |
| **Background (fallback)** | `src/services/backgroundTask.js` registers an `expo-background-task` that checks the battery when the OS wakes the app (~15 min). Used on iOS and when the background alarm is off. |
| **Background alarm (Android)** | `src/services/foregroundService.js` + `plugins/withBatteryForegroundService.js` run a `react-native-background-actions` foreground service that listens for battery broadcasts (plus a 15s poll) so the alarm rings the instant the target is hit, even with the app closed. On by default. |
| **Settings** | `src/hooks/useSettings.js` persists preferences in AsyncStorage via React context. |
| **UI** | Retro primitives in `src/components/retro/` (`RetroScene`, `RetroText`, `PixelBattery`, `ArcadeButton`, `RetroSwitch`, `Marquee`, …) composed by `HomeScreen`, `SettingsModal` and `AlarmOverlay`, themed from `src/theme/index.js`. |

The alarm tone (`assets/alarm.wav`) and all app icons were generated for this project —
they aren't placeholders.

---

## Running the app

Install dependencies (already done if you received the project with `node_modules`):

```bash
npm install
```

### Full experience — development build (recommended)

The custom notification sound and the background task are **native features**, so they need a
development build (not Expo Go):

```bash
# Android (needs Android Studio / SDK, or a connected device)
npx expo run:android

# iOS (needs macOS + Xcode; background task only runs on a physical device)
npx expo run:ios
```

Or build in the cloud with EAS: `npx eas build --profile development --platform android`.

### Quick preview — Expo Go

```bash
npx expo start
```

Then scan the QR code with the Expo Go app. In Expo Go you still get the **live battery
gauge, the in‑app alarm, vibration, and local notifications** (with the default system sound).
The **custom alarm sound in notifications** and the **background task** require a dev build.

> 💡 Use the **"Test alert"** button on the home screen to hear the alarm and see the
> full‑screen "charged" state at any charge level.

---

## Why a charge *target* (not just 100%)?

Keeping a lithium‑ion battery pinned at 100% accelerates wear. Charging to **80–90%** and
unplugging noticeably extends battery lifespan, which is why the target is front‑and‑center
in Settings. Default is 100% so it behaves as requested out of the box.

## Background reliability — two strategies

Mobile operating systems intentionally restrict background work to save power. Charged handles
this with two layers:

1. **Best-effort net (all platforms, always on).** `expo-background-task` lets the OS wake the
   app periodically (Android ≈ every 15 min minimum; iOS at its discretion). Zero battery cost,
   but a background alert can arrive a little after the exact moment.
2. **Background alarm (Android, on by default).** **Settings → Background → "Background
   alarm"** runs a **foreground service** that reacts to battery broadcasts (plus a 15-second
   poll) and rings the native alarm the instant you hit the target, even with the app closed or
   the screen off. It shows an ongoing "Charged is watching your battery" notification (Android
   requires this for foreground services). All readers go through `chargeAlert.js`, so you never
   get a double alarm.

> **iOS note:** iOS has no equivalent to a long-running foreground service, so the background alarm
> is Android-only. iOS relies on strategy #1.

### How the background alarm is wired (native)

- `react-native-background-actions@4` provides the Android foreground service.
- `plugins/withBatteryForegroundService.js` is a custom Expo config plugin that sets the
  service's `android:foregroundServiceType="specialUse"` (required on Android 14+) via the
  manifest merger (`tools:replace`) and adds the `FOREGROUND_SERVICE_SPECIAL_USE` permission.
- The runtime passes `foregroundServiceType: ['specialUse']` to match the manifest.
- `modules/charged-alarm` is a local Expo module (autolinked from `modules/`) whose Kotlin
  `AlarmPlayer` plays `res/raw/alarm.wav` (copied there by the expo-notifications plugin) on the
  alarm stream. `expo-audio`'s background playback service is disabled, so the app declares no
  `mediaPlayback` foreground service.

> `react-native-background-actions` is listed as "untested on the New Architecture" in the React
> Native Directory. It's a simple legacy bridge module and runs fine through RN 0.88's New Arch
> interop layer; the `expo-doctor` check for it is intentionally excluded in `package.json`. This
> feature **requires a development build** (it is a native module and won't work in Expo Go).

---

## Project structure

```
Battery_Charger_Notification/
├── App.js                         # Providers + root screen
├── app.json                       # Expo config (plugins, icons, permissions)
├── plugins/
│   └── withBatteryForegroundService.js  # Config plugin: Android 14 FGS manifest
├── assets/                        # Generated icons, splash, alarm.wav
└── src/
    ├── constants.js               # Keys, defaults, thresholds, FGS config
    ├── theme/index.js             # Retro tokens: palette, fonts, type presets
    ├── hooks/
    │   ├── useSettings.js         # Persisted settings (context)
    │   ├── useBatteryMonitor.js   # Real-time detection core
    │   ├── useReducedMotion.js    # OS "reduce motion" setting
    │   └── useSvgId.js            # Collision-free SVG def ids
    ├── providers/AlarmProvider.js # Alarm state for the UI
    ├── services/
    │   ├── alarm.js                # The alarm (native on Android, expo-audio fallback)
    │   ├── chargeAlert.js          # When to ring: once per session, unplug stops
    │   ├── settingsStore.js        # Settings outside React + migrations
    │   ├── notifications.js        # Permissions, channels, STOP action, alert
    │   ├── backgroundTask.js       # Best-effort background net
    │   └── foregroundService.js    # Android background alarm monitor
    ├── components/
    │   ├── retro/                  # Scene, text, panel, buttons, switch, battery, ticker…
    │   ├── SettingsModal.js        # Retro settings window
    │   └── AlarmOverlay.js         # "CHARGE COMPLETE!" takeover
    └── screens/HomeScreen.js       # Main UI
```

Built with Expo SDK 58 · React Native 0.88 · React 19.
