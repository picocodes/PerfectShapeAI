import 'dart:io';

import 'package:firebase_core/firebase_core.dart';

class AppConfig {
  static const demoMode = bool.fromEnvironment('DEMO_MODE');
  static const apiBaseUrl = String.fromEnvironment('API_BASE_URL', defaultValue: 'http://127.0.0.1:5001/perfectshape-dev/us-central1/api');
  static const apiKey = String.fromEnvironment('FIREBASE_API_KEY');
  static const iosApiKey = String.fromEnvironment('FIREBASE_IOS_API_KEY');
  static const projectId = String.fromEnvironment('FIREBASE_PROJECT_ID');
  static const messagingSenderId = String.fromEnvironment('FIREBASE_MESSAGING_SENDER_ID');
  static const androidAppId = String.fromEnvironment('FIREBASE_ANDROID_APP_ID');
  static const iosAppId = String.fromEnvironment('FIREBASE_IOS_APP_ID');
  static const storageBucket = String.fromEnvironment('FIREBASE_STORAGE_BUCKET');

  static bool get firebaseReady => projectId.isNotEmpty && (androidAppId.isNotEmpty || iosAppId.isNotEmpty) && (apiKey.isNotEmpty || iosApiKey.isNotEmpty);

  static FirebaseOptions get firebaseOptions {
    final ios = Platform.isIOS;
    return FirebaseOptions(
      apiKey: ios && iosApiKey.isNotEmpty ? iosApiKey : apiKey,
      appId: ios ? iosAppId : androidAppId,
      messagingSenderId: messagingSenderId,
      projectId: projectId,
      storageBucket: storageBucket.isEmpty ? null : storageBucket,
      iosBundleId: 'com.perfectshapeai.app',
    );
  }
}
