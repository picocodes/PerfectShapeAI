# PerfectShape AI

A gamified home weight-loss app for iPhone and Android. Short bodyweight sessions, meals from the country you live in, streaks, and a coach. Plus is a normal App Store / Play subscription. There is no credit shop.

The marketing site at perfectshapeai.com is out of scope. This repo is the app and the API.

## What shipped

| Piece | Choice |
| --- | --- |
| App | Flutter (`mobile/`), one codebase for iOS and Android |
| Accounts | Firebase Authentication (email and password) |
| API | Firebase Cloud Functions, TypeScript, Express (`backend/`) |
| Database | Firestore, written only by the API. Client rules deny all direct access |
| AI | Cloudflare AI Gateway, called only from the API |
| Payments | Apple StoreKit 2 and Google Play Billing. Receipts are verified on the server before Plus unlocks |

Flutter replaced the React Native scaffold because StoreKit 2 and Play Billing share one well-supported plugin, and the UI can be the same on both stores. The old web dashboard was removed so every feature lives in the phone app.

On-device models (Apple Foundation Models, Gemini Nano, LiteRT) are not the coach. They are missing on a lot of phones, and meal photos plus a careful coach need a real model. The phone never holds an AI key. If the gateway is not configured, the app still gives a short local-style reply and does not burn the free daily allowance.

### Free and Plus

Free, with no purchase:

- Onboarding, a safe calorie target, and a weekly home plan
- Workout timer with optional spoken cues
- Meal, water, mood, weight, and step logging
- Streaks, XP, levels, zones, and achievements
- Three coach notes a day
- The Dawn share card
- Progress photos that stay on the device

Plus (`perfectshape_plus_monthly` or `perfectshape_plus_yearly`):

- The daily coach cap lifts (still capped at 80 server calls a day so a bug cannot run the bill up)
- Meal photo estimates
- Calorie adjustments, never more than 150 kcal and never under the safety floor
- Midnight and Summit share cards

Canceled subscriptions keep Plus until the store expiry. The same Apple or Google receipt cannot be attached to two accounts. Deleting an account releases it. Level does not drop when a streak breaks; only progress inside the current level can.

The old 0.1-credit and 10-credit notes are both retired.

## Layout

```
mobile/     Flutter app
backend/    Cloud Functions API
shared/     Design tokens (the app copies these into Dart)
```

## Prerequisites

- Flutter 3.47 or newer (stable), on your PATH
- Xcode on a Mac for iOS, with an Apple Developer account before you archive
- Android Studio for Android, with a Play Console account before you upload
- Node.js 22 for the API
- A Firebase project (Auth + Firestore + Functions)
- Optional: a Cloudflare AI Gateway and the upstream model key, only on the server

This environment cannot install Xcode or the Android SDK, so the native apps were type-checked and unit-tested here, not launched in a simulator.

## Run the app in demo mode

Demo mode needs no Firebase project. It keeps a local account on the device. It will not unlock Plus, because that has to come from a verified store receipt.

```bash
cd mobile
flutter pub get
flutter run --dart-define=DEMO_MODE=true
```

Use an iOS simulator or an Android emulator. Pass `-d` if more than one device is connected (`flutter devices`).

If you run without `DEMO_MODE` and without Firebase defines, the first screen offers the same demo.

## Run against your backend

1. Copy `mobile/dart_defines.example.json` to `mobile/dart_defines.json` (gitignored) and fill it in.
2. In Firebase, add an iOS app with bundle id `com.perfectshapeai.app` and an Android app with application id `com.perfectshapeai.app`.
3. Copy the public config into the dart defines. These are client identifiers, not the Admin private key. Do not put `FIREBASE_PRIVATE_KEY`, `AI_PROVIDER_API_KEY`, or the Play service account in the app.

```bash
cd mobile
flutter run --dart-define-from-file=dart_defines.json
```

`API_BASE_URL` for a deployed function looks like:

```text
https://us-central1-YOUR_PROJECT.cloudfunctions.net/api
```

The emulator URL on the iOS simulator is `http://127.0.0.1:5001/YOUR_PROJECT/us-central1/api`. The Android emulator uses `http://10.0.2.2:5001/YOUR_PROJECT/us-central1/api`.

## Backend

```bash
cd backend/functions
cp .env.example .env
npm install
npm test
npm run dev
```

`npm run dev` listens on port 8787 with an in-memory store. Set `ALLOW_DEV_AUTH=true` only on that local process. Cloud Functions ignore that flag. A local call can send `Authorization: Bearer dev:your_user:you@example.com`.

Deploy:

```bash
cd backend
npx firebase-tools deploy --only functions,firestore
```

The function export is `api`. Firestore rules deny every client read and write.

### Server environment

See `backend/functions/.env.example`.

| Variable | Purpose |
| --- | --- |
| `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` | Admin SDK when you are not running inside Google's default service account |
| `CLOUDFLARE_AI_BASE_URL` | Gateway URL, for example `https://gateway.ai.cloudflare.com/v1/<account>/<gateway>/compat` |
| `CLOUDFLARE_AI_GATEWAY_TOKEN` | Sent as `cf-aig-authorization`. `CLOUDFLARE_AI_KEY` is accepted as the same value |
| `AI_PROVIDER_API_KEY` | Upstream provider key. Server only |
| `AI_MODEL` | Default `openai/gpt-4o-mini` (vision-capable for meal photos) |
| `APPLE_BUNDLE_ID` | `com.perfectshapeai.app` |
| `ANDROID_PACKAGE_NAME` | `com.perfectshapeai.app` |
| `APPLE_ISSUER_ID`, `APPLE_KEY_ID`, `APPLE_PRIVATE_KEY` | Optional. Used to refresh a subscription from the App Store Server API when the phone does not send a new StoreKit 2 signature |
| `GOOGLE_PLAY_SERVICE_ACCOUNT_FILE` or `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` | Play Developer API. Needed before a Google purchase can unlock Plus |

StoreKit 2 purchases carry a signed transaction (JWS). The API checks that signature against the pinned Apple root certificates in `backend/functions/certs/` and checks the bundle id, product id, and expiry. Play purchases are checked with the Android Publisher API (`purchases.subscriptionsv2`) and acknowledged when Google still marks them pending.

## Create the subscriptions

Use these product ids exactly. Prices are chosen in the stores. $4.99 a month and $39.99 a year match the old plan's price and are only a suggestion.

### App Store Connect

1. Agreements, Tax, and Banking must be active.
2. Create the app with bundle id `com.perfectshapeai.app`.
3. In-App Purchases → auto-renewable subscriptions. Create a group, for example `Plus`.
4. Add `perfectshape_plus_monthly` (1 month) and `perfectshape_plus_yearly` (1 year).
5. Add localized display name and description. The paywall shows the store's price and title.
6. Add a review screenshot of the paywall once the app runs.
7. In Xcode, the Runner target uses bundle id `com.perfectshapeai.app`, HealthKit (`ios/Runner/Runner.entitlements`), and a development team you select. Archive with Product → Archive and upload with the Organizer.

### Google Play Console

1. Create the app with application id `com.perfectshapeai.app`.
2. Monetize → Products → Subscriptions.
3. Create subscription product ids `perfectshape_plus_monthly` and `perfectshape_plus_yearly`.
4. Give each a base plan (for example base plan ids `monthly` and `yearly`) and activate them. The app queries the subscription product id; Play returns the offer price.
5. Link a Google Cloud service account to Play Console with the Android Publisher permission, and put that JSON on the server as `GOOGLE_PLAY_SERVICE_ACCOUNT_FILE`.
6. Upload an AAB to an internal testing track before Billing can return products. License testers can buy without being charged.

The app sends the purchase token or the StoreKit 2 JWS to `/v1/subscription/google` or `/v1/subscription/apple`. Plus turns on only after that call succeeds. Restore purchases is on the paywall.

## Store submission checklist

You still have to submit. This repo cannot create your developer accounts, signing keys, or store listings.

- Apple Developer Program and Google Play Console accounts are yours.
- Signing: iOS uses the team selected in Xcode. Android release signing reads `mobile/android/key.properties` when that file exists (gitignored). Otherwise release builds use the debug key so `flutter run --release` works locally. Do not ship the debug key.

  ```bash
  keytool -genkey -v -keystore upload-keystore.jks -keyalg RSA -keysize 2048 -validity 10000 -alias upload
  ```

  `mobile/android/key.properties`:

  ```text
  storePassword=...
  keyPassword=...
  keyAlias=upload
  storeFile=../../upload-keystore.jks
  ```

  `storeFile` is relative to `mobile/android/app`. Keep the keystore out of git.
- Icons and splash are generated (`assets/brand/`, launcher mipmaps, iOS AppIcon, native splash). Replace them if you want a different mark, then run `dart run flutter_launcher_icons` and `dart run flutter_native_splash:create` from `mobile/`.
- Host the in-app privacy text (`Settings → Privacy`) at a public URL and paste that URL into App Store Connect and Play Console. Name the legal entity that operates the app. The in-app copy is a starting point, not a filed policy.
- App Store privacy nutrition labels: email, health and fitness (weight, meals, workouts, optional steps), photos only if the user takes a progress photo (stored on device) or a meal photo (sent for an estimate when they ask). No tracking, no ad id.
- Play Data safety: same categories. Health Connect steps need the Health Connect declaration if you keep step import.
- Export compliance: `ITSAppUsesNonExemptEncryption` is false.
- Age: onboarding rejects under 16. A 12+ or 16+ store rating fits. This is not a medical device.
- Account deletion is in Settings, which App Review requires because the app creates accounts. Cancel the store subscription separately. The paywall says that.
- Provide a demo account in App Review notes, plus a sandbox Apple ID / license tester that can buy Plus.
- Screenshots, a support URL, and the privacy URL are entered in the store consoles, not in this repo.

## Tests

```bash
cd backend/functions && npm test
cd mobile && flutter test
```

The API tests cover calorie floors, streak grace and XP penalties that do not drop a level, StoreKit signature checks against a test certificate chain, Play subscription states, the free coach cap (including a second account on the same install id), receipt reuse, account deletion, and plan edits that cannot exceed 150 kcal. The app tests cover the same safety rules plus the home screen, paywall, and the onboarding disclaimer gate.

## Safety

The coach is instructed not to make medical claims, not to use eating-disorder language, and not to cut calories by more than 100–150 kcal. The server clamps any model number to that range and to a floor of 1400 kcal (female), 1600 (male), or 1500 (other). A low or very high BMI adds a note to talk to a clinician and does not deepen the deficit. A message that looks like a crisis gets a short reply pointing at local emergency services and, in the US, 988. It is not stored as the raw text.
