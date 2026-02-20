# PerfectShape AI Monorepo

This repository scaffolds the core product described in `AGENTS.md`.

## Structure

- `backend`: Firebase Cloud Functions API (TypeScript + Express)
- `web`: Next.js + Tailwind dashboard
- `react-native`: React Native mobile app
- `shared`: shared design tokens

## Notes

- Users start with **10 free credits** per `AGENTS.md` section 5 (there is an earlier 0.1 credit note that conflicts).
- AI calls are server-side only via Cloudflare AI Gateway.
- Clients never display credit balances.

## Local setup

1. Prereqs
- Node.js 18+
- Firebase CLI installed and authenticated
- For mobile: Android Studio and/or Xcode + CocoaPods

2. Environment variables
- Backend: copy `backend/functions/.env.example` to `.env` and fill values.
- Web: copy `web/.env.example` to `.env.local` and fill values.
- Mobile: copy `react-native/.env.example` to `.env` and fill values.

3. Install dependencies (per package)
- Backend functions:
```powershell
cd backend/functions
npm install
```
- Web:
```powershell
cd web
npm install --workspaces=false
```
- Mobile:
```powershell
cd react-native
npm install
```

## Run locally

1. Backend (Functions emulator)
```powershell
cd backend
firebase emulators:start --only functions
```

2. Web
```powershell
cd web
npm run dev
```

3. Mobile
- Metro bundler:
```powershell
cd react-native
npm start
```
- iOS (macOS):
```powershell
cd react-native
npm run ios
```
- Android:
```powershell
cd react-native
npm run android
```

## Tests

There are no automated tests wired yet. Suggested starting points:
- Backend: add unit tests for credits, XP, and AI usage accounting.
- Web/Mobile: add component tests for onboarding and dashboard screens.

## Deploy

1. Backend (Firebase Functions)
```powershell
cd backend
firebase deploy --only functions
```

2. Web (Firebase Hosting)
- Build:
```powershell
cd web
npm run build
```
- Host via Firebase Hosting:
```powershell
firebase init hosting
firebase deploy --only hosting
```

3. Mobile
- iOS: archive in Xcode and upload to App Store Connect.
- Android: generate a signed AAB and upload to Google Play Console.

