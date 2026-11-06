import 'dart:async';
import 'dart:io';

import 'package:firebase_auth/firebase_auth.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/foundation.dart';
import 'package:in_app_purchase/in_app_purchase.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:uuid/uuid.dart';

import '../config.dart';
import '../data/api_repository.dart';
import '../data/demo_repository.dart';
import '../data/repository.dart';
import '../engine/engine.dart';
import '../models/models.dart';
import '../services/iap_service.dart';
import '../services/reminders.dart';
import '../services/steps.dart';

class AppController extends ChangeNotifier {
  AppController({IapService? iap, ReminderService? reminders, StepReader? steps})
      : iap = iap ?? IapService(),
        reminders = reminders ?? ReminderService(),
        steps = steps ?? StepReader();

  final IapService iap;
  final ReminderService reminders;
  final StepReader steps;

  bool booted = false;
  bool needsSetup = false;
  bool demo = false;
  bool signedIn = false;
  bool busy = false;
  String? banner;
  String installId = '';
  UserProfile? profile;
  TodayBundle? today;
  List<WeightEntry> weightLog = const [];
  List<ChatMessage> messages = const [];
  List<StoreOffer> offers = const [];
  List<ProductDetails> products = const [];
  Entitlement entitlement = Entitlement.free();
  ShapeRepository? _repo;
  DemoRepository? _demo;
  var _purchaseBusy = false;

  bool get onboarded => profile?.onboardingComplete ?? false;
  bool get premium => entitlement.premium;

  Future<void> boot() async {
    final prefs = await SharedPreferences.getInstance();
    installId = prefs.getString('perfectshape.install') ?? const Uuid().v4();
    await prefs.setString('perfectshape.install', installId);
    if (AppConfig.demoMode || !AppConfig.firebaseReady) {
      if (!AppConfig.demoMode && !AppConfig.firebaseReady) {
        needsSetup = true;
        booted = true;
        notifyListeners();
        return;
      }
      await _startDemo(prefs);
    } else {
      await _startLive();
    }
    booted = true;
    notifyListeners();
  }

  Future<void> useDemo() async {
    needsSetup = false;
    await _startDemo(await SharedPreferences.getInstance());
    booted = true;
    notifyListeners();
  }

  Future<void> _startDemo(SharedPreferences prefs) async {
    demo = true;
    final repository = DemoRepository(prefs);
    await repository.restore();
    _demo = repository;
    _repo = repository;
    signedIn = repository.signedIn;
    if (signedIn) await refresh();
    _fillPlaceholderOffers();
  }

  Future<void> _startLive() async {
    demo = false;
    await Firebase.initializeApp(options: AppConfig.firebaseOptions);
    _repo = ApiRepository(baseUrl: AppConfig.apiBaseUrl);
    FirebaseAuth.instance.authStateChanges().listen((user) async {
      signedIn = user != null;
      if (user != null) {
        await refresh();
      } else {
        profile = null;
        today = null;
        notifyListeners();
      }
    });
    final available = await iap.start(_onPurchase);
    if (available) {
      products = await iap.load();
      offers = products
          .map((product) => StoreOffer(id: product.id, title: _cleanTitle(product.title), price: product.price, description: product.description, purchasable: true))
          .toList();
    }
    if (offers.isEmpty) _fillPlaceholderOffers();
    signedIn = FirebaseAuth.instance.currentUser != null;
    if (signedIn) await refresh();
  }

  void _fillPlaceholderOffers() {
    offers = const [
      StoreOffer(id: productMonthly, title: 'Plus monthly', price: 'Store price', description: 'Auto-renewing monthly membership.'),
      StoreOffer(id: productYearly, title: 'Plus yearly', price: 'Store price', description: 'Auto-renewing yearly membership.'),
    ];
  }

  Future<void> refresh() async {
    final repo = _repo;
    if (repo == null || !repo.signedIn) return;
    try {
      profile = await repo.loadProfile();
      final date = localDate();
      today = await repo.today(date);
      weightLog = await repo.weights();
      messages = await repo.history();
      entitlement = today?.entitlement ?? await repo.subscription(date);
      await reminders.apply(streak: profile?.streakReminders ?? true, water: profile?.waterReminders ?? false);
    } on ApiException catch (error) {
      banner = error.message;
    }
    notifyListeners();
  }

  Future<String?> signIn(String email, String password) => _auth(() => _repo!.signIn(email, password));
  Future<String?> signUp(String email, String password) => _auth(() => _repo!.signUp(email, password));

  Future<String?> sendReset(String email) async {
    try {
      await _repo!.sendReset(email);
      return null;
    } catch (error) {
      return _message(error);
    }
  }

  Future<void> signOut() async {
    await _repo?.signOut();
    signedIn = false;
    profile = null;
    today = null;
    notifyListeners();
  }

  Future<String?> saveProfile(UserProfile next) async {
    try {
      profile = await _repo!.saveProfile(next, localDate());
      signedIn = true;
      await refresh();
      return null;
    } catch (error) {
      return _message(error);
    }
  }

  Future<ActionResult> completeWorkout(String workoutId, int seconds) => _act(() => _repo!.completeWorkout(date: localDate(), workoutId: workoutId, durationSec: seconds));
  Future<ActionResult> addMeal({required String name, required int calories, required bool noSugar, String source = 'manual'}) =>
      _act(() => _repo!.addMeal(date: localDate(), name: name, calories: calories, noSugar: noSugar, source: source));
  Future<ActionResult> addWater(int ml) => _act(() => _repo!.addWater(date: localDate(), ml: ml));
  Future<ActionResult> setMood(int mood) => _act(() => _repo!.setMood(date: localDate(), mood: mood));
  Future<ActionResult> setSteps(int count) => _act(() => _repo!.setSteps(date: localDate(), steps: count));
  Future<ActionResult> addWeight(double kg, {double? waist}) => _act(() => _repo!.addWeight(date: localDate(), weightKg: kg, waistCm: waist));

  Future<String?> gentler() async {
    try {
      await _repo!.gentler(localDate());
      await refresh();
      return null;
    } catch (error) {
      return _message(error);
    }
  }

  Future<int?> importSteps() async {
    final count = await steps.today();
    if (count == null) return null;
    await setSteps(count);
    return count;
  }

  Future<CoachReply?> askCoach(String message) async {
    final local = crisisReply(message);
    if (local != null) {
      messages = [...messages, ChatMessage(role: 'assistant', text: local, source: 'crisis')];
      notifyListeners();
      return CoachReply(reply: local, source: 'crisis', entitlement: entitlement);
    }
    try {
      final reply = await _repo!.coach(date: localDate(), message: message, installId: installId);
      entitlement = reply.entitlement;
      messages = await _repo!.history();
      notifyListeners();
      return reply;
    } on ApiException catch (error) {
      banner = error.message;
      notifyListeners();
      if (error.paywall) return CoachReply(reply: error.message, source: 'paywall', entitlement: entitlement, paywall: true);
      return null;
    }
  }

  Future<String?> adjustPlan(String feedback) async {
    try {
      final reply = await _repo!.adjust(date: localDate(), feedback: feedback, installId: installId);
      await refresh();
      return reply.summary;
    } on ApiException catch (error) {
      banner = error.message;
      notifyListeners();
      return error.paywall ? null : error.message;
    }
  }

  Future<PhotoReply?> analyzePhoto(String base64, String mediaType) async {
    try {
      final reply = await _repo!.photo(date: localDate(), base64: base64, mediaType: mediaType, installId: installId);
      return reply;
    } on ApiException catch (error) {
      banner = error.message;
      notifyListeners();
      return null;
    }
  }

  Future<String?> buy(StoreOffer offer) async {
    if (demo) return 'Demo mode shows the paywall only. A store build verifies the receipt on the server.';
    final product = products.where((item) => item.id == offer.id).firstOrNull;
    if (product == null) return 'This build is not signed into a store account that can see the Plus products yet.';
    try {
      await iap.buy(product);
      return null;
    } catch (error) {
      return _message(error);
    }
  }

  Future<String?> restore() async {
    if (demo) return 'Restore works on a store build after Apple or Google sends the receipt.';
    try {
      await iap.restore();
      return null;
    } catch (error) {
      return _message(error);
    }
  }

  Future<void> _onPurchase(PurchaseDetails purchase) async {
    if (_purchaseBusy) return;
    if (purchase.status == PurchaseStatus.pending) {
      banner = 'Waiting for the store to confirm…';
      notifyListeners();
      return;
    }
    if (purchase.status == PurchaseStatus.canceled) return;
    if (purchase.status == PurchaseStatus.error) {
      banner = purchase.error?.message ?? 'The purchase did not go through.';
      notifyListeners();
      return;
    }
    _purchaseBusy = true;
    try {
      final token = purchase.verificationData.serverVerificationData;
      final google = purchase.verificationData.source == 'google_play' || Platform.isAndroid;
      entitlement = google ? await _repo!.verifyGoogle(token: token, productId: purchase.productID) : await _repo!.verifyApple(token);
      if (purchase.pendingCompletePurchase) await iap.finish(purchase);
      banner = entitlement.premium ? 'Plus is active on this account.' : 'The store did not return an active Plus membership.';
      await refresh();
    } on ApiException catch (error) {
      if ((error.status == 400 || error.status == 409) && purchase.pendingCompletePurchase) {
        await iap.finish(purchase);
      }
      banner = error.message;
      notifyListeners();
    } finally {
      _purchaseBusy = false;
    }
  }

  Future<String?> deleteAccount() async {
    try {
      await _repo!.deleteAccount();
      signedIn = false;
      profile = null;
      today = null;
      notifyListeners();
      return null;
    } catch (error) {
      return _message(error);
    }
  }

  Future<void> enablePreviewPlus() async {
    await _demo?.previewPlus(true);
    await refresh();
  }

  Future<String?> _auth(Future<void> Function() action) async {
    try {
      await action();
      signedIn = true;
      await refresh();
      return null;
    } catch (error) {
      return _message(error);
    }
  }

  Future<ActionResult> _act(Future<ActionResult> Function() action) async {
    try {
      final result = await action();
      await refresh();
      return result;
    } on ApiException catch (error) {
      return ActionResult(paywall: error.paywall, message: error.message);
    } catch (error) {
      return ActionResult(message: _message(error));
    }
  }

  String _message(Object error) {
    if (error is ApiException) return error.message;
    if (error is FirebaseAuthException) {
      return switch (error.code) {
        'email-already-in-use' => 'That email already has an account.',
        'invalid-email' => 'That email does not look right.',
        'wrong-password' || 'invalid-credential' || 'user-not-found' => 'Email or password does not match.',
        'weak-password' => 'Use at least 8 characters.',
        'network-request-failed' => 'You appear to be offline.',
        _ => error.message ?? 'Sign-in failed.',
      };
    }
    return 'Something went wrong.';
  }

  String _cleanTitle(String title) => title.replaceAll(RegExp(r'\s*\(.*\)\s*$'), '');

  void clearBanner() {
    banner = null;
    notifyListeners();
  }

  @override
  void dispose() {
    iap.dispose();
    super.dispose();
  }
}
