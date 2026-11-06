import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../engine/engine.dart';
import '../models/models.dart';
import 'repository.dart';

class DemoRepository implements ShapeRepository {
  DemoRepository(this._prefs);

  final SharedPreferences _prefs;
  final Map<String, _Account> _accounts = {};
  String? _uid;

  @override
  bool get remote => false;

  @override
  bool get signedIn => _uid != null;

  @override
  String? get email => _account?.email;

  _Account? get _account => _uid == null ? null : _accounts[_uid!];

  Future<void> restore() async {
    final raw = _prefs.getString('perfectshape.demo');
    if (raw == null) return;
    final decoded = jsonDecode(raw) as Map<String, dynamic>;
    _uid = decoded['uid'] as String?;
    final accounts = Map<String, dynamic>.from(decoded['accounts'] as Map? ?? const {});
    for (final entry in accounts.entries) {
      _accounts[entry.key] = _Account.fromJson(Map<String, dynamic>.from(entry.value as Map));
    }
  }

  Future<void> _save() async {
    await _prefs.setString(
      'perfectshape.demo',
      jsonEncode({
        'uid': _uid,
        'accounts': _accounts.map((key, value) => MapEntry(key, value.toJson())),
      }),
    );
  }

  @override
  Future<void> signUp(String email, String password) async {
    _checkPassword(password);
    final id = email.trim().toLowerCase();
    if (_accounts.containsKey(id)) throw ApiException(409, 'exists', 'That email already has a demo profile on this device.');
    _accounts[id] = _Account(email: id, password: password);
    _uid = id;
    await _save();
  }

  @override
  Future<void> signIn(String email, String password) async {
    final id = email.trim().toLowerCase();
    final account = _accounts[id];
    if (account == null || account.password != password) {
      throw ApiException(401, 'invalid_auth', 'That email and password don\'t match.');
    }
    _uid = id;
    await _save();
  }

  @override
  Future<void> sendReset(String email) async {}

  @override
  Future<void> signOut() async {
    _uid = null;
    await _save();
  }

  @override
  Future<void> deleteAccount() async {
    if (_uid != null) _accounts.remove(_uid);
    _uid = null;
    await _save();
  }

  @override
  Future<UserProfile> loadProfile() async => _require().profile;

  @override
  Future<UserProfile> saveProfile(UserProfile profile, String localDate) async {
    final account = _require();
    account.profile = profile;
    account.profile.onboardingComplete = profile.name != null &&
        profile.age != null &&
        profile.gender != null &&
        profile.heightCm != null &&
        profile.currentWeightKg != null &&
        profile.targetWeightKg != null &&
        profile.activityLevel != null &&
        profile.country != null &&
        profile.dailyMinutes != null &&
        profile.disclaimerAccepted;
    if (profile.targetWeightKg != null && profile.currentWeightKg != null && profile.targetWeightKg! > profile.currentWeightKg! + 0.5) {
      throw ApiException(400, 'target_direction', 'Set a target at or below your current weight.');
    }
    if ((profile.age ?? 16) < 16) throw ApiException(400, 'invalid_body', 'PerfectShape is for ages 16 and up.');
    if (account.profile.onboardingComplete && account.profile.startWeightKg == null) {
      account.profile.startWeightKg = profile.currentWeightKg;
      account.weights.add(WeightEntry(weightKg: profile.currentWeightKg!, localDate: localDate));
      _grant(account, localDate, 'weight', xpAwards['weight']!, true);
    }
    await _save();
    return account.profile;
  }

  @override
  Future<TodayBundle> today(String date) async {
    final account = _require();
    if (!account.profile.onboardingComplete) return TodayBundle.incomplete(date);
    final plan = _plan(account, date);
    final daily = account.daily.putIfAbsent(date, DailyLog.new);
    final meals = account.meals.where((meal) => meal.date == date).toList();
    final day = daily.gentler ? gentlerDay(date) : plan.days.firstWhere((item) => item.id.endsWith(weekdayKey(date)), orElse: () => plan.days.first);
    return TodayBundle(
      date: date,
      profileComplete: true,
      disclaimer: healthDisclaimer,
      calorieTarget: plan.target,
      caution: plan.caution,
      bmi: plan.bmi,
      day: day,
      daily: DailyView(caloriesConsumed: meals.fold(0, (sum, meal) => sum + meal.calories), workoutCompleted: daily.workout, waterMl: daily.water, steps: daily.steps, mood: daily.mood, gentler: daily.gentler),
      game: GameView.fromXp(account.xp, date),
      achievements: _badges(account),
      challenge: _challenge(date, daily, meals),
      suggestions: suggestMeals(account.profile.country, account.profile.dietaryPreferences),
      estimate: account.profile.startWeightKg == null ? null : scaleEstimate(account.profile.startWeightKg!, account.weights.isEmpty ? account.profile.currentWeightKg! : account.weights.last.weightKg),
      entitlement: _entitlement(account, date),
    );
  }

  @override
  Future<ActionResult> completeWorkout({required String date, required String workoutId, required int durationSec}) async {
    final account = _require();
    final daily = account.daily.putIfAbsent(date, DailyLog.new);
    if (daily.workout) return const ActionResult(message: 'Already logged today.');
    final award = _grant(account, date, 'workout', xpAwards['workout']!, true, countWorkout: true);
    daily.workout = true;
    await _save();
    return _result(account, date, award, 'Session logged');
  }

  @override
  Future<ActionResult> addMeal({required String date, required String name, required int calories, required bool noSugar, String source = 'manual'}) async {
    final account = _require();
    account.meals.add(_Meal(date: date, name: name, calories: calories, noSugar: noSugar));
    final slots = account.daily.putIfAbsent(date, DailyLog.new).events.where((event) => event.startsWith('meal_')).length;
    Award? award;
    if (slots < 3) award = _grant(account, date, 'meal_${slots + 1}', xpAwards['meal']!, true);
    await _save();
    return _result(account, date, award, 'Meal logged');
  }

  @override
  Future<ActionResult> addWater({required String date, required int ml}) async {
    final account = _require();
    final daily = account.daily.putIfAbsent(date, DailyLog.new);
    daily.water = (daily.water + ml).clamp(0, 6000);
    Award? award;
    if (daily.water >= waterGoalMl) award = _grant(account, date, 'water_goal', xpAwards['waterGoal']!, false);
    await _save();
    return ActionResult(message: (award?.gained ?? 0) > 0 ? 'Water goal. +${award!.gained} XP' : null);
  }

  @override
  Future<ActionResult> setMood({required String date, required int mood}) async {
    final account = _require();
    account.daily.putIfAbsent(date, DailyLog.new).mood = mood;
    _grant(account, date, 'mood', xpAwards['mood']!, false);
    await _save();
    return const ActionResult(message: 'Mood noted.');
  }

  @override
  Future<ActionResult> setSteps({required String date, required int steps}) async {
    final account = _require();
    final daily = account.daily.putIfAbsent(date, DailyLog.new);
    daily.steps = steps;
    Award? award;
    if (steps >= stepsGoal) award = _grant(account, date, 'steps_goal', xpAwards['stepsGoal']!, true, markSteps: true);
    await _save();
    return _result(account, date, award, 'Steps logged');
  }

  @override
  Future<List<WeightEntry>> weights() async => List.of(_require().weights);

  @override
  Future<ActionResult> addWeight({required String date, required double weightKg, double? waistCm}) async {
    final account = _require();
    account.weights.add(WeightEntry(weightKg: weightKg, localDate: date, waistCm: waistCm));
    account.profile.currentWeightKg = weightKg;
    final award = _grant(account, date, 'weight', xpAwards['weight']!, true);
    await _save();
    return _result(account, date, award, 'Weight logged');
  }

  @override
  Future<DayPlan> gentler(String date) async {
    final account = _require();
    account.daily.putIfAbsent(date, DailyLog.new).gentler = true;
    await _save();
    return gentlerDay(date);
  }

  @override
  Future<CoachReply> coach({required String date, required String message, required String installId}) async {
    final crisis = crisisReply(message);
    final account = _require();
    if (crisis != null) {
      account.messages.add(ChatMessage(role: 'assistant', text: crisis, source: 'crisis'));
      await _save();
      return CoachReply(reply: crisis, source: 'crisis', entitlement: _entitlement(account, date));
    }
    final entitlement = _entitlement(account, date);
    if (account.coachDate != date) {
      account.coachDate = date;
      account.coachUsed = 0;
    }
    if (!entitlement.premium && account.coachUsed >= freeCoachPerDay) {
      throw ApiException(402, 'quota_exceeded', 'You\'ve used today\'s free coach notes. Plus removes that daily cap.');
    }
    if (entitlement.premium) account.coachUsed = (account.coachUsed + 1).clamp(0, plusCoachPerDay);
    if (!entitlement.premium) account.coachUsed += 1;
    final today = await this.today(date);
    final reply = fallbackCoach(
      name: account.profile.name,
      message: message,
      streak: today.game?.streakCount ?? 0,
      workoutName: today.day?.name,
      caloriesLeft: today.calorieTarget == null ? null : (today.calorieTarget! - (today.daily?.caloriesConsumed ?? 0)).clamp(0, 10000),
      mood: today.daily?.mood,
    );
    account.messages.add(ChatMessage(role: 'user', text: message, source: 'fallback'));
    account.messages.add(ChatMessage(role: 'assistant', text: reply, source: 'fallback'));
    await _save();
    return CoachReply(reply: reply, source: 'fallback', entitlement: _entitlement(account, date));
  }

  @override
  Future<AdjustReply> adjust({required String date, required String feedback, required String installId}) async {
    final account = _require();
    if (!_entitlement(account, date).premium) {
      throw ApiException(402, 'premium_required', 'Plan adjustments from the coach are part of PerfectShape Plus.');
    }
    final hungry = RegExp(r'hungry|tired|hard|sore', caseSensitive: false).hasMatch(feedback);
    final easy = RegExp(r'easy|plateau|stuck', caseSensitive: false).hasMatch(feedback);
    final delta = hungry ? 100 : easy ? -100 : 0;
    final stored = account.adjustedTarget ?? _plan(account, date).target;
    final next = clampCalorieAdjustment(stored, stored + delta, calorieFloor(account.profile.gender ?? 'other'));
    account.adjustedTarget = next;
    await _save();
    return AdjustReply(summary: delta == 0 ? 'Keeping the calorie target steady.' : 'Shifted the target by $delta kcal, inside the 150 kcal safety cap.', calorieTarget: next, source: 'fallback');
  }

  @override
  Future<PhotoReply> photo({required String date, required String base64, required String mediaType, required String installId}) async {
    throw ApiException(503, 'ai_unconfigured', 'Meal photos run through the secure coach on the server. This demo keeps them off the device\'s network.');
  }

  @override
  Future<List<ChatMessage>> history() async => List.of(_require().messages);

  @override
  Future<Entitlement> subscription(String date) async => _entitlement(_require(), date);

  @override
  Future<Entitlement> verifyApple(String signedTransaction) async => _rejectStore();

  @override
  Future<Entitlement> verifyGoogle({required String token, required String productId}) async => _rejectStore();

  Entitlement _rejectStore() {
    if (kDebugMode && _account != null && _account!.previewPlus) {
      return Entitlement(premium: true, coachRemaining: plusCoachPerDay, coachLimit: plusCoachPerDay, productId: productYearly, platform: 'demo', status: 'active');
    }
    throw ApiException(503, 'store_unavailable', 'Purchases are verified with Apple or Google, then the PerfectShape server. Demo mode cannot unlock Plus.');
  }

  Future<void> previewPlus(bool value) async {
    final account = _account;
    if (account == null || !kDebugMode) return;
    account.previewPlus = value;
    await _save();
  }

  _Account _require() {
    final account = _account;
    if (account == null) throw ApiException(401, 'missing_auth', 'Sign in again.');
    return account;
  }

  void _checkPassword(String password) {
    if (password.length < 8) throw ApiException(400, 'weak_password', 'Use at least 8 characters.');
  }

  _Plan _plan(_Account account, String date) {
    final profile = account.profile;
    final calories = planCalories(
      gender: profile.gender ?? 'other',
      age: profile.age ?? 30,
      heightCm: profile.heightCm ?? 170,
      weightKg: profile.currentWeightKg ?? 70,
      targetKg: profile.targetWeightKg ?? 70,
      activity: profile.activityLevel ?? 'light',
    );
    final days = buildWeek(weekId: date, minutes: profile.dailyMinutes ?? 30, equipment: profile.equipment);
    return _Plan(target: account.adjustedTarget ?? calories.target, caution: calories.caution, bmi: calories.bmi, days: days);
  }

  Award? _grant(_Account account, String date, String event, int amount, bool checkIn, {bool countWorkout = false, bool markSteps = false}) {
    final daily = account.daily.putIfAbsent(date, DailyLog.new);
    final award = reduceDailyAward(state: account.xp, events: daily.events, today: date, event: event, xpAmount: amount, checkIn: checkIn, countWorkout: countWorkout, markStepsGoal: markSteps);
    account.xp = award.xp;
    daily.events = award.events;
    if (award.gained <= 0) return null;
    return award;
  }

  Entitlement _entitlement(_Account account, String date) {
    final premium = account.previewPlus && kDebugMode;
    if (account.coachDate != date) return Entitlement(premium: premium, coachRemaining: premium ? plusCoachPerDay : freeCoachPerDay, coachLimit: premium ? plusCoachPerDay : freeCoachPerDay, productId: premium ? productYearly : null, status: premium ? 'active' : 'free', platform: premium ? 'demo' : null);
    final limit = premium ? plusCoachPerDay : freeCoachPerDay;
    return Entitlement(premium: premium, coachRemaining: (limit - account.coachUsed).clamp(0, limit), coachLimit: limit, productId: premium ? productYearly : null, status: premium ? 'active' : 'free', platform: premium ? 'demo' : null);
  }

  List<Badge> _badges(_Account account) {
    final latest = account.weights.isEmpty ? account.profile.currentWeightKg : account.weights.last.weightKg;
    final start = account.profile.startWeightKg;
    final unlocked = <String>{
      if (account.xp.workoutsCompleted >= 1) 'first_session',
      if (account.xp.bestStreak >= 7 || account.xp.streakCount >= 7) 'streak_7',
      if (account.xp.bestStreak >= 30 || account.xp.streakCount >= 30) 'streak_30',
      if (start != null && latest != null && start - latest >= 2) 'first_2kg',
      if (account.xp.workoutsCompleted >= 30) 'workouts_30',
      if (account.xp.level >= 5) 'level_5',
      if (account.xp.stepsGoalHit) 'steps_8k',
    };
    return [
      for (final item in achievementCatalog) Badge(id: item.id, title: item.title, detail: item.detail, unlockedAt: unlocked.contains(item.id) ? 'demo' : null),
    ];
  }

  ChallengeView _challenge(String date, DailyLog daily, List<_Meal> meals) {
    final hash = date.codeUnits.fold(0, (sum, code) => (sum * 33 + code) % 997);
    final options = [
      ChallengeView(id: 'burn', title: '15-minute fat burn', detail: 'Finish today\'s session. Short and sweaty still counts.', done: daily.workout),
      ChallengeView(id: 'soda', title: 'No soda today', detail: 'Log what you eat and keep added sugar off the list.', done: meals.isNotEmpty && meals.every((meal) => meal.noSugar)),
      ChallengeView(id: 'steps', title: '8k steps day', detail: 'Get to 8,000 steps.', done: daily.steps >= stepsGoal),
    ];
    return options[hash % options.length];
  }

  ActionResult _result(_Account account, String date, Award? award, String fallback) {
    if (award == null || award.gained <= 0) return const ActionResult();
    final game = GameView.fromXp(account.xp, date);
    return ActionResult(celebration: Celebration(title: '+${award.gained} XP', detail: 'Level ${game.level} · ${game.zoneName} · ${game.streakCount}-day streak'));
  }
}

class _Account {
  _Account({required this.email, required this.password});
  String email;
  String password;
  UserProfile profile = UserProfile();
  XpState xp = XpState();
  final List<WeightEntry> weights = [];
  final List<_Meal> meals = [];
  final List<ChatMessage> messages = [];
  final Map<String, DailyLog> daily = {};
  int coachUsed = 0;
  String coachDate = '';
  bool previewPlus = false;
  int? adjustedTarget;

  Map<String, dynamic> toJson() => {
        'email': email,
        'password': password,
        'profile': profile.toJson()..['onboarding_complete'] = profile.onboardingComplete ..['start_weight_kg'] = profile.startWeightKg ..['email'] = email,
        'xp': xp.toJson(),
        'weights': weights.map((item) => {'weight_kg': item.weightKg, 'local_date': item.localDate, 'waist_cm': item.waistCm}).toList(),
        'meals': meals.map((item) => item.toJson()).toList(),
        'messages': messages.map((item) => {'role': item.role, 'text': item.text, 'source': item.source}).toList(),
        'daily': daily.map((key, value) => MapEntry(key, value.toJson())),
        'coach_used': coachUsed,
        'coach_date': coachDate,
        'preview_plus': previewPlus,
        'adjusted_target': adjustedTarget,
      };

  factory _Account.fromJson(Map<String, dynamic> json) {
    final account = _Account(email: json['email'] as String, password: json['password'] as String);
    account.profile = UserProfile.fromJson(Map<String, dynamic>.from(json['profile'] as Map));
    account.xp = XpState.fromJson(Map<String, dynamic>.from(json['xp'] as Map));
    for (final item in (json['weights'] as List? ?? const [])) {
      account.weights.add(WeightEntry.fromJson(Map<String, dynamic>.from(item as Map)));
    }
    for (final item in (json['meals'] as List? ?? const [])) {
      account.meals.add(_Meal.fromJson(Map<String, dynamic>.from(item as Map)));
    }
    for (final item in (json['messages'] as List? ?? const [])) {
      account.messages.add(ChatMessage.fromJson(Map<String, dynamic>.from(item as Map)));
    }
    final daily = Map<String, dynamic>.from(json['daily'] as Map? ?? const {});
    for (final entry in daily.entries) {
      account.daily[entry.key] = DailyLog.fromJson(Map<String, dynamic>.from(entry.value as Map));
    }
    account.coachUsed = json['coach_used'] as int? ?? 0;
    account.coachDate = json['coach_date'] as String? ?? '';
    account.previewPlus = json['preview_plus'] as bool? ?? false;
    account.adjustedTarget = json['adjusted_target'] as int?;
    return account;
  }
}

class _Meal {
  _Meal({required this.date, required this.name, required this.calories, required this.noSugar});
  final String date;
  final String name;
  final int calories;
  final bool noSugar;
  Map<String, dynamic> toJson() => {'date': date, 'name': name, 'calories': calories, 'no_sugar': noSugar};
  factory _Meal.fromJson(Map<String, dynamic> json) => _Meal(date: json['date'] as String, name: json['name'] as String, calories: json['calories'] as int, noSugar: json['no_sugar'] as bool? ?? false);
}

class DailyLog {
  DailyLog();
  List<String> events = [];
  bool workout = false;
  int water = 0;
  int steps = 0;
  int? mood;
  bool gentler = false;
  Map<String, dynamic> toJson() => {'events': events, 'workout': workout, 'water': water, 'steps': steps, 'mood': mood, 'gentler': gentler};
  factory DailyLog.fromJson(Map<String, dynamic> json) => DailyLog()
    ..events = (json['events'] as List? ?? const []).map((item) => item.toString()).toList()
    ..workout = json['workout'] as bool? ?? false
    ..water = json['water'] as int? ?? 0
    ..steps = json['steps'] as int? ?? 0
    ..mood = json['mood'] as int?
    ..gentler = json['gentler'] as bool? ?? false;
}

class _Plan {
  _Plan({required this.target, required this.caution, required this.bmi, required this.days});
  final int target;
  final String? caution;
  final double bmi;
  final List<DayPlan> days;
}
