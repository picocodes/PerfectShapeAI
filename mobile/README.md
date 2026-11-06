# PerfectShape mobile

Flutter app for iOS and Android. Setup, store product ids, and the submission checklist are in the repository README at the repo root.

Demo, with no Firebase project:

```bash
flutter pub get
flutter run --dart-define=DEMO_MODE=true
```

Against your API:

```bash
flutter run --dart-define-from-file=dart_defines.json
```

Copy `dart_defines.example.json` to `dart_defines.json` first. Bundle id and application id are both `com.perfectshapeai.app`. Subscription product ids are `perfectshape_plus_monthly` and `perfectshape_plus_yearly`.
