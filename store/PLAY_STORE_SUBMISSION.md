# Google Play Submission Checklist — Charged

Everything needed to publish `com.fathomstack.charged`. Work top to bottom. Items marked
**[you]** can only be done by you in the Play Console / AdMob; the rest is already prepared in
this repo.

---

## 0. Before you start

- **Google Play Developer account** ($25 one-time). **[you]**
- ⚠️ **Closed testing requirement (personal accounts):** If your developer account is a
  *personal* account created recently, Google requires a **closed test with at least 12 testers,
  opted in for 14 continuous days**, before you can apply for production access. Plan for this —
  it's the biggest time cost. *Organization* accounts are exempt. **[you]**
- The signing key is already created and held by EAS (Expo). Google Play App Signing will manage
  the final key; your EAS key becomes the **upload key**.

---

## 1. Files to upload

| What | Where it is |
| --- | --- |
| App bundle (**.aab**) for production | `builds/Charged-1.0.0-vc2-release.aab` |
| Test APK (optional, for sideloading) | `builds/Charged-1.0.0-preview.apk` |
| Icon 512×512 | `store/icon-512.png` |
| Feature graphic 1024×500 | `store/feature-graphic.png` |
| Screenshots ×4 | `store/screenshots/` |
| Listing text | `store/play-store-listing.md` |

---

## 2. Host the privacy policy & app-ads.txt (GitHub Pages) **[you]**

The policy must be a public URL. Enable Pages once:

1. Go to **github.com/SaadbinGhaffar/battery-full-alarm → Settings → Pages**.
2. Under **Build and deployment → Source**, choose **Deploy from a branch**.
3. Branch: **main**, folder: **/docs** → **Save**.
4. Wait ~1 minute. Your URLs become:
   - Privacy policy: `https://saadbinghaffar.github.io/battery-full-alarm/privacy-policy.html`
   - Landing/support: `https://saadbinghaffar.github.io/battery-full-alarm/`
   - app-ads.txt: `https://saadbinghaffar.github.io/battery-full-alarm/app-ads.txt`

> **app-ads.txt:** In AdMob, set your app's "developer website" / app-ads.txt URL to the site
> above so Google can crawl it. This protects your ad revenue from spoofing. It can take a day or
> two for AdMob to show "found".

---

## 3. Create the app in Play Console **[you]**

**All apps → Create app**
- App name: `Charged: Battery Full Alarm`
- Default language: English (US)
- App or game: **App**
- Free or paid: **Free**
- Accept the declarations.

---

## 4. Store listing

Paste everything from `store/play-store-listing.md` and upload the graphics from `store/`.

---

## 5. App content / policy forms **[you]**

### 5a. Privacy policy
Paste: `https://saadbinghaffar.github.io/battery-full-alarm/privacy-policy.html`

### 5b. Ads
- "Does your app contain ads?" → **Yes**.

### 5c. Content rating (IARC questionnaire)
- Category: **Utility / Productivity / Other**
- Violence, sexual content, profanity, drugs, gambling → **No** to all
- Does the app share user location? → **No** (we don't; AdMob uses coarse IP only)
- Digital purchases → **No**
- "Does the app contain ads?" → **Yes**
- Expected result: **Everyone / PEGI 3**.

### 5d. Target audience & content
- Target age group: **13+** (do **not** select an under-13 group — that triggers the stricter
  Families policy and is not appropriate for an ad-supported utility).
- "Is your app designed for children?" → **No**.

### 5e. Data safety  → see section 6 below.

### 5f. Government app / Financial features / Health → **No**.

### 5g. Foreground service permissions → see section 7 below. ⚠️ Important.

---

## 6. Data safety form answers **[you]**

**Does your app collect or share any of the required user data types?** → **Yes**
(the AdMob SDK does, even though the app itself keeps battery data on-device).

**Is all collected data encrypted in transit?** → **Yes**
**Do you provide a way for users to request data deletion?** → **Yes** — there's no account; data
is removed on uninstall, and users can reset their advertising ID / change consent in-app and in
device settings. (Point to the privacy policy.)

Declare these data types (all collected by Google AdMob):

| Data type | Collected | Shared | Purpose | Optional? |
| --- | --- | --- | --- | --- |
| Device or other IDs (advertising ID) | Yes | Yes | Advertising/marketing, Analytics, Fraud prevention | Required |
| Location → Approximate location | Yes | Yes | Advertising/marketing | Required |
| App activity → app interactions (ad interactions) | Yes | Yes | Advertising/marketing, Analytics | Required |
| App info & performance → Crash logs & diagnostics | Yes | No | Analytics, App functionality | Required |

> These reflect Google's published AdMob data-disclosure guidance. If Google updates its guidance,
> follow the latest at: support.google.com/admob/answer/11140316 . The app collects **no** names,
> emails, photos, contacts, messages, files, or precise location.

---

## 7. ⚠️ Foreground service declarations (most likely rejection point) **[you]**

The app declares two foreground-service types. Play Console → **App content → Foreground service
permissions** will ask you to justify each. Use the text below.

### 7a. `FOREGROUND_SERVICE_SPECIAL_USE`  — from the "Exact Alerts" feature
Justification to submit:
> "The app is a battery-full alarm. When the user enables 'Exact Alerts', a foreground service
> polls the device battery level so it can notify the user the instant the battery reaches their
> chosen charge target (e.g. 100%), even while the app is in the background. This continuous
> battery monitoring does not fit any of the other defined foreground-service types."

> **Heads-up:** `specialUse` requires Google review and is sometimes rejected because it's meant
> only for cases that fit no other type. **This feature is optional and OFF by default.** If Google
> rejects the declaration, the quickest fix is to **remove the exact-background feature** and rely
> on the built-in periodic background check + notifications (no special permission needed). It's a
> small, isolated change: remove `src/services/foregroundService.js`, the
> `plugins/withBatteryForegroundService.js` plugin (and its entry in `app.json`), the two
> `FOREGROUND_SERVICE*` permissions in `app.json`, and the "Exact alerts" toggle in Settings, then
> rebuild. Ask the assistant to "remove the foreground-service path" and it will handle it.

### 7b. `FOREGROUND_SERVICE_MEDIA_PLAYBACK`  — from audio playback (expo-audio)
Justification to submit:
> "The app plays an alarm sound when the phone finishes charging. The media-playback foreground
> service lets the alarm continue to sound reliably if the user switches apps while it is ringing."

---

## 8. App signing **[you]**
- Keep **Play App Signing** enabled (default). Upload the `.aab`; Google manages the app signing
  key, and your EAS key is the upload key.
- Back up your EAS upload key: run `npx eas-cli credentials` → Android → download/export keystore,
  and store it somewhere safe.

---

## 9. Create a release **[you]**
1. Start with **Testing → Internal testing** (instant, add your own email as a tester) to confirm
   the build installs and ads/consent behave. Add your phone as an **AdMob test device** first so
   you don't tap live ads.
2. If on a personal account, run the required **Closed testing** (12 testers / 14 days).
3. Then **Production → Create new release**:
   - Upload `builds/Charged-1.0.0-vc2-release.aab`.
   - Release name: `1.0.0 (2)`.
   - Release notes: e.g. "First release of Charged: Battery Full Alarm."
   - Review → **Start rollout to Production**.

---

## 10. In AdMob **[you]**
- **Privacy & messaging → GDPR:** create and publish a consent message (and a US-states message if
  you serve the US). Without it, the in-app consent form can't appear and EEA/UK users get no ads.
- **app-ads.txt:** add your site URL (section 2) so AdMob can verify it.
- **Link** the AdMob app to your Play Console app once it's live, and confirm the ad unit IDs match
  those in `src/ads/adConfig.js`.

---

## Quick reference — IDs & URLs
- Package: `com.fathomstack.charged`
- AdMob App ID (Android): `ca-app-pub-2685624187820858~3600318632`
- Banner unit: `ca-app-pub-2685624187820858/2314147961`
- Native unit: `ca-app-pub-2685624187820858/5927099079`
- Privacy policy: `https://saadbinghaffar.github.io/battery-full-alarm/privacy-policy.html`
- Repo: `https://github.com/SaadbinGhaffar/battery-full-alarm`
