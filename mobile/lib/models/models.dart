import '../engine/engine.dart';

class UserProfile {
  UserProfile({
    this.name,
    this.age,
    this.gender,
    this.heightCm,
    this.currentWeightKg,
    this.targetWeightKg,
    this.startWeightKg,
    this.activityLevel,
    this.country,
    this.dietaryPreferences = const [],
    this.equipment = const [],
    this.dailyMinutes,
    this.units = 'metric',
    this.waterReminders = false,
    this.streakReminders = true,
    this.disclaimerAccepted = false,
    this.timezone = 'UTC',
    this.onboardingComplete = false,
    this.email,
  });

  String? name;
  int? age;
  String? gender;
  double? heightCm;
  double? currentWeightKg;
  double? targetWeightKg;
  double? startWeightKg;
  String? activityLevel;
  String? country;
  List<String> dietaryPreferences;
  List<String> equipment;
  int? dailyMinutes;
  String units;
  bool waterReminders;
  bool streakReminders;
  bool disclaimerAccepted;
  String timezone;
  bool onboardingComplete;
  String? email;

  Map<String, dynamic> toJson() => {
        if (name != null) 'name': name,
        if (age != null) 'age': age,
        if (gender != null) 'gender': gender,
        if (heightCm != null) 'height_cm': heightCm,
        if (currentWeightKg != null) 'current_weight_kg': currentWeightKg,
        if (targetWeightKg != null) 'target_weight_kg': targetWeightKg,
        if (activityLevel != null) 'activity_level': activityLevel,
        if (country != null) 'country': country,
        'dietary_preferences': dietaryPreferences,
        'equipment': equipment,
        if (dailyMinutes != null) 'daily_minutes': dailyMinutes,
        'units': units,
        'water_reminders': waterReminders,
        'streak_reminders': streakReminders,
        'disclaimer_accepted': disclaimerAccepted,
        'timezone': timezone,
      };

  factory UserProfile.fromJson(Map<String, dynamic> json) => UserProfile(
        name: json['name'] as String?,
        age: (json['age'] as num?)?.toInt(),
        gender: json['gender'] as String?,
        heightCm: (json['height_cm'] as num?)?.toDouble(),
        currentWeightKg: (json['current_weight_kg'] as num?)?.toDouble(),
        targetWeightKg: (json['target_weight_kg'] as num?)?.toDouble(),
        startWeightKg: (json['start_weight_kg'] as num?)?.toDouble(),
        activityLevel: json['activity_level'] as String?,
        country: json['country'] as String?,
        dietaryPreferences: _strings(json['dietary_preferences']),
        equipment: _strings(json['equipment']),
        dailyMinutes: (json['daily_minutes'] as num?)?.toInt(),
        units: json['units'] as String? ?? 'metric',
        waterReminders: json['water_reminders'] as bool? ?? false,
        streakReminders: json['streak_reminders'] as bool? ?? true,
        disclaimerAccepted: json['disclaimer_accepted'] as bool? ?? false,
        timezone: json['timezone'] as String? ?? 'UTC',
        onboardingComplete: json['onboarding_complete'] as bool? ?? false,
        email: json['email'] as String?,
      );
}

class Entitlement {
  const Entitlement({
    required this.premium,
    required this.coachRemaining,
    required this.coachLimit,
    this.productId,
    this.expiresAt,
    this.platform,
    this.status = 'free',
  });

  final bool premium;
  final int coachRemaining;
  final int coachLimit;
  final String? productId;
  final String? expiresAt;
  final String? platform;
  final String status;

  factory Entitlement.free() => const Entitlement(premium: false, coachRemaining: freeCoachPerDay, coachLimit: freeCoachPerDay);

  factory Entitlement.fromJson(Map<String, dynamic> json) => Entitlement(
        premium: json['premium'] as bool? ?? false,
        coachRemaining: (json['coach_remaining'] as num?)?.toInt() ?? 0,
        coachLimit: (json['coach_limit'] as num?)?.toInt() ?? freeCoachPerDay,
        productId: json['product_id'] as String?,
        expiresAt: json['expires_at'] as String?,
        platform: json['platform'] as String?,
        status: json['status'] as String? ?? 'free',
      );
}

class GameView {
  const GameView({
    required this.totalXp,
    required this.level,
    required this.xpIntoLevel,
    required this.xpForLevel,
    required this.streakCount,
    required this.streakAtRisk,
    required this.graceTokens,
    required this.bestStreak,
    required this.workoutsCompleted,
    required this.zoneName,
    required this.zoneLine,
    this.nextZoneName,
  });

  final int totalXp;
  final int level;
  final int xpIntoLevel;
  final int xpForLevel;
  final int streakCount;
  final bool streakAtRisk;
  final int graceTokens;
  final int bestStreak;
  final int workoutsCompleted;
  final String zoneName;
  final String zoneLine;
  final String? nextZoneName;

  factory GameView.fromJson(Map<String, dynamic> json) {
    final zone = Map<String, dynamic>.from(json['zone'] as Map? ?? const {});
    final next = json['next_zone'] == null ? null : Map<String, dynamic>.from(json['next_zone'] as Map);
    return GameView(
      totalXp: (json['total_xp'] as num?)?.toInt() ?? 0,
      level: (json['level'] as num?)?.toInt() ?? 1,
      xpIntoLevel: (json['xp_into_level'] as num?)?.toInt() ?? 0,
      xpForLevel: (json['xp_for_level'] as num?)?.toInt() ?? levelXp,
      streakCount: (json['streak_count'] as num?)?.toInt() ?? 0,
      streakAtRisk: json['streak_at_risk'] as bool? ?? false,
      graceTokens: (json['grace_tokens'] as num?)?.toInt() ?? 0,
      bestStreak: (json['best_streak'] as num?)?.toInt() ?? 0,
      workoutsCompleted: (json['workouts_completed'] as num?)?.toInt() ?? 0,
      zoneName: zone['name'] as String? ?? 'Foundation',
      zoneLine: zone['line'] as String? ?? '',
      nextZoneName: next?['name'] as String?,
    );
  }

  factory GameView.fromXp(XpState xp, String today) {
    final zone = zoneFor(xp.level);
    final next = nextZone(xp.level);
    final atRisk = xp.lastActiveDate != null && daysBetween(xp.lastActiveDate!, today) == 1;
    final pending = xp.lastActiveDate != null && daysBetween(xp.lastActiveDate!, today) >= 3 ||
        (xp.lastActiveDate != null && daysBetween(xp.lastActiveDate!, today) == 2 && xp.graceTokens <= 0);
    final floor = (xp.level - 1) * levelXp;
    return GameView(
      totalXp: xp.totalXp,
      level: xp.level,
      xpIntoLevel: (xp.totalXp - floor).clamp(0, levelXp),
      xpForLevel: levelXp,
      streakCount: pending ? 0 : xp.streakCount,
      streakAtRisk: atRisk || (xp.lastActiveDate != null && daysBetween(xp.lastActiveDate!, today) == 2 && xp.graceTokens > 0),
      graceTokens: xp.graceTokens,
      bestStreak: xp.bestStreak,
      workoutsCompleted: xp.workoutsCompleted,
      zoneName: zone.name,
      zoneLine: zone.line,
      nextZoneName: next?.name,
    );
  }
}

class DailyView {
  const DailyView({
    required this.caloriesConsumed,
    required this.workoutCompleted,
    required this.waterMl,
    required this.steps,
    this.mood,
    this.gentler = false,
  });

  final int caloriesConsumed;
  final bool workoutCompleted;
  final int waterMl;
  final int steps;
  final int? mood;
  final bool gentler;

  factory DailyView.fromJson(Map<String, dynamic> json) => DailyView(
        caloriesConsumed: (json['calories_consumed'] as num?)?.toInt() ?? 0,
        workoutCompleted: json['workout_completed'] as bool? ?? false,
        waterMl: (json['water_ml'] as num?)?.toInt() ?? 0,
        steps: (json['steps'] as num?)?.toInt() ?? 0,
        mood: (json['mood'] as num?)?.toInt(),
        gentler: json['gentler'] as bool? ?? false,
      );
}

class ChallengeView {
  const ChallengeView({required this.id, required this.title, required this.detail, required this.done});
  final String id;
  final String title;
  final String detail;
  final bool done;
  factory ChallengeView.fromJson(Map<String, dynamic> json) => ChallengeView(
        id: json['id'] as String? ?? 'burn',
        title: json['title'] as String? ?? '',
        detail: json['detail'] as String? ?? '',
        done: json['done'] as bool? ?? false,
      );
}

class InsightView {
  const InsightView({required this.title, required this.body});
  final String title;
  final String body;
  factory InsightView.fromJson(Map<String, dynamic> json) => InsightView(title: json['title'] as String? ?? '', body: json['body'] as String? ?? '');
}

class Badge {
  const Badge({required this.id, required this.title, required this.detail, this.unlockedAt});
  final String id;
  final String title;
  final String detail;
  final String? unlockedAt;
  bool get unlocked => unlockedAt != null;
  factory Badge.fromJson(Map<String, dynamic> json) => Badge(
        id: json['id'] as String? ?? '',
        title: json['title'] as String? ?? '',
        detail: json['detail'] as String? ?? '',
        unlockedAt: json['unlocked_at'] as String?,
      );
}

class TodayBundle {
  const TodayBundle({
    required this.date,
    required this.profileComplete,
    required this.disclaimer,
    this.calorieTarget,
    this.caution,
    this.bmi,
    this.day,
    this.daily,
    this.game,
    this.achievements = const [],
    this.challenge,
    this.insight,
    this.suggestions = const [],
    this.estimate,
    this.entitlement,
  });

  final String date;
  final bool profileComplete;
  final String disclaimer;
  final int? calorieTarget;
  final String? caution;
  final double? bmi;
  final DayPlan? day;
  final DailyView? daily;
  final GameView? game;
  final List<Badge> achievements;
  final ChallengeView? challenge;
  final InsightView? insight;
  final List<MealIdea> suggestions;
  final ScaleEstimate? estimate;
  final Entitlement? entitlement;

  factory TodayBundle.incomplete(String date) => TodayBundle(date: date, profileComplete: false, disclaimer: healthDisclaimer);

  factory TodayBundle.fromJson(Map<String, dynamic> json) {
    if (json['profile_complete'] != true) {
      return TodayBundle(date: json['date'] as String? ?? '', profileComplete: false, disclaimer: json['disclaimer'] as String? ?? healthDisclaimer);
    }
    final estimateJson = json['estimate'] == null ? null : Map<String, dynamic>.from(json['estimate'] as Map);
    return TodayBundle(
      date: json['date'] as String? ?? '',
      profileComplete: true,
      disclaimer: json['disclaimer'] as String? ?? healthDisclaimer,
      calorieTarget: (json['calorie_target'] as num?)?.toInt(),
      caution: json['caution'] as String?,
      bmi: (json['bmi'] as num?)?.toDouble(),
      day: DayPlan.fromJson(Map<String, dynamic>.from(json['day'] as Map)),
      daily: DailyView.fromJson(Map<String, dynamic>.from(json['daily'] as Map)),
      game: GameView.fromJson(Map<String, dynamic>.from(json['gamification'] as Map)),
      achievements: ((json['achievements'] as List?) ?? const []).map((item) => Badge.fromJson(Map<String, dynamic>.from(item as Map))).toList(),
      challenge: json['challenge'] == null ? null : ChallengeView.fromJson(Map<String, dynamic>.from(json['challenge'] as Map)),
      insight: json['insight'] == null ? null : InsightView.fromJson(Map<String, dynamic>.from(json['insight'] as Map)),
      suggestions: ((json['suggestions'] as List?) ?? const []).map((item) => MealIdea.fromJson(Map<String, dynamic>.from(item as Map))).toList(),
      estimate: estimateJson == null
          ? null
          : ScaleEstimate(
              deltaKg: (estimateJson['delta_kg'] as num?)?.toDouble() ?? 0,
              fatLowKg: (estimateJson['fat_low_kg'] as num?)?.toDouble(),
              fatHighKg: (estimateJson['fat_high_kg'] as num?)?.toDouble(),
              note: estimateJson['note'] as String? ?? '',
            ),
      entitlement: json['entitlement'] == null ? null : Entitlement.fromJson(Map<String, dynamic>.from(json['entitlement'] as Map)),
    );
  }
}

class WeightEntry {
  const WeightEntry({required this.weightKg, required this.localDate, this.waistCm});
  final double weightKg;
  final String localDate;
  final double? waistCm;
  factory WeightEntry.fromJson(Map<String, dynamic> json) => WeightEntry(
        weightKg: (json['weight_kg'] as num).toDouble(),
        localDate: json['local_date'] as String,
        waistCm: (json['waist_cm'] as num?)?.toDouble(),
      );
}

class ChatMessage {
  const ChatMessage({required this.role, required this.text, required this.source});
  final String role;
  final String text;
  final String source;
  factory ChatMessage.fromJson(Map<String, dynamic> json) => ChatMessage(
        role: json['role'] as String? ?? 'assistant',
        text: json['text'] as String? ?? '',
        source: json['source'] as String? ?? 'fallback',
      );
}

class StoreOffer {
  const StoreOffer({required this.id, required this.title, required this.price, required this.description, this.purchasable = false});
  final String id;
  final String title;
  final String price;
  final String description;
  final bool purchasable;
}

class Celebration {
  const Celebration({required this.title, required this.detail, this.badges = const []});
  final String title;
  final String detail;
  final List<String> badges;
}

class ActionResult {
  const ActionResult({this.paywall = false, this.message, this.celebration});
  final bool paywall;
  final String? message;
  final Celebration? celebration;
}

List<String> _strings(dynamic value) => (value as List?)?.map((item) => item.toString()).toList() ?? const [];

double kgToLb(double kg) => kg * 2.2046226218;
double lbToKg(double lb) => lb / 2.2046226218;
double cmToIn(double cm) => cm / 2.54;

String formatWeight(double kg, String units) => units == 'imperial' ? '${kgToLb(kg).toStringAsFixed(1)} lb' : '${kg.toStringAsFixed(1)} kg';
String localDate([DateTime? clock]) {
  final now = clock ?? DateTime.now();
  final month = now.month.toString().padLeft(2, '0');
  final day = now.day.toString().padLeft(2, '0');
  return '${now.year}-$month-$day';
}
