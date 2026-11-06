class CaloriePlan {
  const CaloriePlan({
    required this.bmr,
    required this.tdee,
    required this.target,
    required this.deficit,
    required this.bmi,
    required this.floor,
    required this.caution,
  });

  final int bmr;
  final int tdee;
  final int target;
  final int deficit;
  final double bmi;
  final int floor;
  final String? caution;
}

const _activity = {
  'sedentary': 1.2,
  'light': 1.375,
  'moderate': 1.55,
  'active': 1.725,
};

double bmiOf(double weightKg, double heightCm) {
  final meters = heightCm / 100;
  return weightKg / (meters * meters);
}

int calorieFloor(String gender) {
  if (gender == 'female') return 1400;
  if (gender == 'male') return 1600;
  return 1500;
}

double _bmr(String gender, double kg, double cm, int age) {
  final base = 10 * kg + 6.25 * cm - 5 * age;
  if (gender == 'male') return base + 5;
  if (gender == 'female') return base - 161;
  return base - 78;
}

CaloriePlan planCalories({
  required String gender,
  required int age,
  required double heightCm,
  required double weightKg,
  required double targetKg,
  required String activity,
}) {
  final bmr = _bmr(gender, weightKg, heightCm, age);
  final tdee = bmr * (_activity[activity] ?? 1.375);
  final personBmi = bmiOf(weightKg, heightCm);
  final floor = calorieFloor(gender);
  final maintaining = targetKg >= weightKg - 0.4;
  String? caution;
  var deficit = 0.0;
  if (personBmi < 18.5) {
    caution = 'Your BMI is below the usual range. This plan holds maintenance calories. Please talk with a clinician before trying to lose weight.';
    deficit = 0;
  } else if (maintaining) {
    deficit = 0;
  } else if (personBmi >= 40) {
    caution = 'A clinician is the right partner at this BMI. The deficit stays modest — never more than 500 kcal.';
    deficit = (tdee * 0.15).round().clamp(0, 500).toDouble();
  } else {
    deficit = (tdee * 0.15).round().clamp(250, 500).toDouble();
  }
  var target = (tdee - deficit).round();
  if (target < floor) {
    target = floor;
    deficit = (tdee - target).clamp(0, 5000);
  }
  return CaloriePlan(
    bmr: bmr.round(),
    tdee: tdee.round(),
    target: target,
    deficit: deficit.round(),
    bmi: (personBmi * 10).round() / 10,
    floor: floor,
    caution: caution,
  );
}

int clampCalorieAdjustment(int current, int proposed, int floor) {
  final delta = (proposed - current).clamp(-150, 150);
  return (current + delta).clamp(floor, 10000);
}

class ScaleEstimate {
  const ScaleEstimate({required this.deltaKg, this.fatLowKg, this.fatHighKg, required this.note});
  final double deltaKg;
  final double? fatLowKg;
  final double? fatHighKg;
  final String note;
}

ScaleEstimate scaleEstimate(double startKg, double currentKg) {
  final delta = ((currentKg - startKg) * 10).round() / 10;
  if (delta <= -0.3) {
    final lost = -delta;
    return ScaleEstimate(
      deltaKg: delta,
      fatLowKg: ((lost * 0.7) * 10).round() / 10,
      fatHighKg: ((lost * 0.85) * 10).round() / 10,
      note: 'A rough share of steady scale loss is body fat, often about 70–85%. Water, food, and hormones move the scale too. This is not a body-fat test.',
    );
  }
  if (delta >= 0.3) {
    return ScaleEstimate(
      deltaKg: delta,
      note: 'The scale is up. A single rise is often water or a later meal. Use the weekly line, not one morning.',
    );
  }
  return const ScaleEstimate(
    deltaKg: 0,
    note: 'Weight is steady. That can still hide fat loss if measurements or photos are changing.',
  );
}

const levelXp = 500;
const freeCoachPerDay = 3;
const plusCoachPerDay = 80;
const waterGoalMl = 2000;
const stepsGoal = 8000;
const productMonthly = 'perfectshape_plus_monthly';
const productYearly = 'perfectshape_plus_yearly';
const productIds = [productMonthly, productYearly];

const xpAwards = {
  'workout': 40,
  'meal': 15,
  'calorieTarget': 25,
  'weight': 10,
  'mood': 5,
  'waterGoal': 10,
  'stepsGoal': 15,
};

class XpState {
  XpState({
    this.totalXp = 0,
    this.level = 1,
    this.streakCount = 0,
    this.lastActiveDate,
    this.graceTokens = 1,
    this.bestStreak = 0,
    this.workoutsCompleted = 0,
    this.stepsGoalHit = false,
  });

  int totalXp;
  int level;
  int streakCount;
  String? lastActiveDate;
  int graceTokens;
  int bestStreak;
  int workoutsCompleted;
  bool stepsGoalHit;

  XpState copy() => XpState(
        totalXp: totalXp,
        level: level,
        streakCount: streakCount,
        lastActiveDate: lastActiveDate,
        graceTokens: graceTokens,
        bestStreak: bestStreak,
        workoutsCompleted: workoutsCompleted,
        stepsGoalHit: stepsGoalHit,
      );

  Map<String, dynamic> toJson() => {
        'total_xp': totalXp,
        'level': level,
        'streak_count': streakCount,
        'last_active_date': lastActiveDate,
        'grace_tokens': graceTokens,
        'best_streak': bestStreak,
        'workouts_completed': workoutsCompleted,
        'steps_goal_hit': stepsGoalHit,
      };

  factory XpState.fromJson(Map<String, dynamic> json) => XpState(
        totalXp: json['total_xp'] as int? ?? 0,
        level: json['level'] as int? ?? 1,
        streakCount: json['streak_count'] as int? ?? 0,
        lastActiveDate: json['last_active_date'] as String?,
        graceTokens: json['grace_tokens'] as int? ?? 1,
        bestStreak: json['best_streak'] as int? ?? 0,
        workoutsCompleted: json['workouts_completed'] as int? ?? 0,
        stepsGoalHit: json['steps_goal_hit'] as bool? ?? false,
      );
}

int levelForXp(int total) => total <= 0 ? 1 : (total ~/ levelXp) + 1;

int daysBetween(String earlier, String later) {
  final a = DateTime.parse('${earlier}T00:00:00Z');
  final b = DateTime.parse('${later}T00:00:00Z');
  return b.difference(a).inDays;
}

class Award {
  const Award({
    required this.xp,
    required this.events,
    required this.gained,
    required this.duplicate,
    required this.graceUsed,
    required this.streakReset,
    required this.penaltyXp,
  });

  final XpState xp;
  final List<String> events;
  final int gained;
  final bool duplicate;
  final bool graceUsed;
  final bool streakReset;
  final int penaltyXp;
}

Award reduceDailyAward({
  required XpState state,
  required List<String> events,
  required String today,
  required String event,
  required int xpAmount,
  required bool checkIn,
  bool countWorkout = false,
  bool markStepsGoal = false,
}) {
  if (events.contains(event) || xpAmount < 0) {
    return Award(xp: state.copy(), events: events, gained: 0, duplicate: events.contains(event), graceUsed: false, streakReset: false, penaltyXp: 0);
  }
  final next = state.copy();
  var gained = 0;
  var graceUsed = false;
  var streakReset = false;
  var penalty = 0;
  if (checkIn) {
    final resolved = _resolve(next, today);
    graceUsed = resolved.graceUsed;
    streakReset = resolved.streakReset;
    penalty = resolved.penalty;
    if (resolved.incremented) {
      final bonus = (5 * next.streakCount).clamp(0, 50);
      _addXp(next, bonus);
      gained += bonus;
    }
  }
  _addXp(next, xpAmount);
  gained += xpAmount;
  if (countWorkout) next.workoutsCompleted += 1;
  if (markStepsGoal) next.stepsGoalHit = true;
  return Award(
    xp: next,
    events: [...events, event],
    gained: gained,
    duplicate: false,
    graceUsed: graceUsed,
    streakReset: streakReset,
    penaltyXp: penalty,
  );
}

void _addXp(XpState state, int amount) {
  state.totalXp += amount;
  final computed = levelForXp(state.totalXp);
  if (computed > state.level) state.level = computed;
}

class _Resolved {
  const _Resolved({required this.graceUsed, required this.streakReset, required this.penalty, required this.incremented});
  final bool graceUsed;
  final bool streakReset;
  final int penalty;
  final bool incremented;
}

_Resolved _resolve(XpState state, String today) {
  if (state.lastActiveDate == null) {
    _finish(state, today, 1);
    return const _Resolved(graceUsed: false, streakReset: false, penalty: 0, incremented: true);
  }
  final diff = daysBetween(state.lastActiveDate!, today);
  if (diff <= 0) return const _Resolved(graceUsed: false, streakReset: false, penalty: 0, incremented: false);
  if (diff == 1) {
    _finish(state, today, state.streakCount + 1);
    return const _Resolved(graceUsed: false, streakReset: false, penalty: 0, incremented: true);
  }
  if (diff == 2 && state.graceTokens > 0) {
    state.graceTokens -= 1;
    _finish(state, today, state.streakCount);
    return const _Resolved(graceUsed: true, streakReset: false, penalty: 0, incremented: false);
  }
  final missed = diff - 1;
  final raw = (12 * missed).clamp(0, 100);
  final floor = (state.level - 1) * levelXp;
  final penalized = state.totalXp - raw < floor ? floor : state.totalXp - raw;
  final applied = state.totalXp - penalized;
  state.totalXp = penalized;
  _finish(state, today, 1);
  return _Resolved(graceUsed: false, streakReset: true, penalty: applied, incremented: true);
}

void _finish(XpState state, String today, int streak) {
  state.streakCount = streak;
  state.lastActiveDate = today;
  if (streak > 0 && streak % 7 == 0 && state.graceTokens < 1) state.graceTokens = 1;
  if (streak > state.bestStreak) state.bestStreak = streak;
}

class Zone {
  const Zone(this.id, this.name, this.minLevel, this.line);
  final String id;
  final String name;
  final int minLevel;
  final String line;
}

const zones = [
  Zone('foundation', 'Foundation', 1, 'Learn the shape of a good day.'),
  Zone('ember', 'Ember', 3, 'The habit is catching.'),
  Zone('momentum', 'Momentum', 5, 'Your week has a rhythm.'),
  Zone('forge', 'Forge', 8, 'Strength is starting to look like you.'),
  Zone('summit', 'Summit', 12, 'Quiet consistency. Loud results.'),
];

Zone zoneFor(int level) {
  var current = zones.first;
  for (final zone in zones) {
    if (level >= zone.minLevel) current = zone;
  }
  return current;
}

Zone? nextZone(int level) {
  for (final zone in zones) {
    if (zone.minLevel > level) return zone;
  }
  return null;
}

bool themeAllowed(String theme, bool premium) {
  if (theme == 'dawn') return true;
  if (theme == 'midnight' || theme == 'summit') return premium;
  return false;
}

const healthDisclaimer =
    'PerfectShape is a fitness and habit coach, not a medical service. It does not diagnose, treat, or prescribe. Talk with a qualified clinician before changing diet or exercise, especially if you are pregnant, under 18, or managing a health condition.';

String? crisisReply(String message) {
  final text = message.toLowerCase();
  final crisis = text.contains('suicid') || text.contains('kill myself') || text.contains('self-harm') || text.contains('self harm') || text.contains('want to die') || text.contains('end my life');
  if (!crisis) return null;
  return "I'm glad you said something. I'm a workout coach, not a crisis service, and you deserve real help right now. "
      'If you might act on these thoughts, contact local emergency services. In the US, call or text 988. '
      "Elsewhere, the IASP site at https://www.iasp.info/suicidalthoughts/ lists local lines. When you're safe, come back and we'll keep the plan gentle.";
}

String fallbackCoach({required String? name, required String message, required int streak, String? workoutName, int? caloriesLeft, int? mood}) {
  final who = (name == null || name.trim().isEmpty) ? 'friend' : name.trim();
  if ((mood ?? 3) <= 2) {
    return '$who, low days still count. Do the short mobility session, drink a glass of water, and leave the streak in one piece. You don\'t have to be impressive today.';
  }
  if (RegExp(r'hungry|snack|crav', caseSensitive: false).hasMatch(message)) {
    final left = caloriesLeft == null ? 'Stay near today\'s target.' : 'You have about $caloriesLeft kcal left in today\'s target.';
    return '$who, eat a real snack: protein plus fruit or yogurt. Hunger is a signal, not a failure. $left';
  }
  if (RegExp(r'hard|tired|sore|easy', caseSensitive: false).hasMatch(message)) {
    final session = workoutName == null ? '' : 'Today is $workoutName. ';
    return '$who, sore means we adjust, not that we quit. ${session}Make the next round slower, or take the gentler session. Consistency beats heroics.';
  }
  final streakLine = streak > 0 ? "You're on a $streak-day streak. Protect it with one honest log." : 'Log one meal or finish the session and the streak starts.';
  return '$who, $streakLine Keep portions steady and the workout short enough to repeat tomorrow.';
}

class Move {
  const Move(this.name, this.cue, this.focus, this.gear);
  final String name;
  final String cue;
  final String focus;
  final String gear;
}

const moves = [
  Move('Bodyweight squat', 'Sit back, heels heavy, chest proud.', 'strength', 'body'),
  Move('Incline push-up', 'Hands on a counter. Body in one line.', 'strength', 'body'),
  Move('Glute bridge', 'Pause at the top and squeeze.', 'strength', 'body'),
  Move('Reverse lunge', 'Step back, front knee tracks the toes.', 'strength', 'body'),
  Move('Chair dip', 'Shoulders down. Bend the elbows, don\'t shrug.', 'strength', 'body'),
  Move('Low-impact jack', 'Step out and tap the arms overhead.', 'cardio', 'body'),
  Move('Fast march', 'Drive the knees, swing the arms.', 'cardio', 'body'),
  Move('Slow mountain climber', 'Hands planted, pull one knee in at a time.', 'cardio', 'body'),
  Move('Dead bug', 'Low back kisses the floor.', 'core', 'body'),
  Move('Bird dog', 'Reach long. Hips stay square.', 'core', 'body'),
  Move('Forearm plank', 'Ribs tucked, breathe.', 'core', 'body'),
  Move('Cat-cow', 'Move with the breath.', 'mobility', 'body'),
  Move('World\'s greatest stretch', 'Lunge, elbow to instep, reach up.', 'mobility', 'body'),
  Move('90/90 hip switch', 'Sit tall and rotate both knees.', 'mobility', 'body'),
  Move('Goblet squat', 'Hold one dumbbell at the chest.', 'strength', 'dumbbells'),
  Move('One-arm dumbbell row', 'Support on a chair. Pull to the hip.', 'strength', 'dumbbells'),
  Move('Band row', 'Elbows skim the ribs.', 'strength', 'bands'),
  Move('Band pull-apart', 'Straight arms, squeeze the shoulder blades.', 'strength', 'bands'),
  Move('Easy rope skips', 'Bounce quietly. March in place if you miss.', 'cardio', 'rope'),
];

class Exercise {
  const Exercise({required this.name, required this.cue, required this.seconds, required this.restSeconds});
  final String name;
  final String cue;
  final int seconds;
  final int restSeconds;

  Map<String, dynamic> toJson() => {'name': name, 'cue': cue, 'seconds': seconds, 'rest_seconds': restSeconds};
  factory Exercise.fromJson(Map<String, dynamic> json) => Exercise(
        name: json['name'] as String? ?? 'Move',
        cue: json['cue'] as String? ?? '',
        seconds: json['seconds'] as int? ?? 30,
        restSeconds: json['rest_seconds'] as int? ?? 15,
      );
}

class DayPlan {
  const DayPlan({required this.id, required this.name, required this.focus, required this.minutes, required this.exercises, required this.habit});
  final String id;
  final String name;
  final String focus;
  final int minutes;
  final List<Exercise> exercises;
  final String habit;

  Map<String, dynamic> toJson() => {
        'id': id,
        'name': name,
        'focus': focus,
        'minutes': minutes,
        'habit': habit,
        'exercises': exercises.map((item) => item.toJson()).toList(),
      };

  factory DayPlan.fromJson(Map<String, dynamic> json) => DayPlan(
        id: json['id'] as String? ?? 'day',
        name: json['name'] as String? ?? 'Session',
        focus: json['focus'] as String? ?? 'strength',
        minutes: json['minutes'] as int? ?? 15,
        habit: json['habit'] as String? ?? '',
        exercises: ((json['exercises'] as List?) ?? const []).map((item) => Exercise.fromJson(Map<String, dynamic>.from(item as Map))).toList(),
      );
}

const _blueprints = [
  ('mon', 'Lower strength', 'strength', 'Put your shoes where you can see them tonight.'),
  ('tue', 'Brisk cardio', 'cardio', 'Take a ten-minute walk after the biggest meal.'),
  ('wed', 'Upper strength', 'strength', 'Fill a bottle and finish it by dinner.'),
  ('thu', 'Easy mobility', 'mobility', 'Lights dimmer 30 minutes earlier.'),
  ('fri', 'Full body', 'strength', 'Plate vegetables first.'),
  ('sat', 'Core and steps', 'core', 'Hit a step goal without turning it into punishment.'),
  ('sun', 'Reset', 'mobility', 'Write tomorrow\'s first meal before bed.'),
];

String weekdayKey(String date) {
  final parsed = DateTime.parse('${date}T00:00:00Z');
  return const ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][parsed.weekday % 7];
}

List<DayPlan> buildWeek({required String weekId, required int minutes, required List<String> equipment}) {
  final gear = <String>{'body'};
  if (equipment.contains('dumbbells')) gear.add('dumbbells');
  if (equipment.contains('bands') || equipment.contains('resistance bands')) gear.add('bands');
  if (equipment.contains('rope') || equipment.contains('skipping rope')) gear.add('rope');
  return [
    for (var index = 0; index < _blueprints.length; index++)
      _assemble(
        id: '${weekId}_${_blueprints[index].$1}',
        name: _blueprints[index].$2,
        focus: _blueprints[index].$3,
        habit: _blueprints[index].$4,
        minutes: _blueprints[index].$3 == 'mobility' ? (minutes > 20 ? 20 : minutes) : minutes,
        pool: moves.where((move) => gear.contains(move.gear) && (move.focus == _blueprints[index].$3 || move.focus == 'core')).toList(),
        salt: weekId.hashCode + index,
      ),
  ];
}

DayPlan gentlerDay(String date) {
  final pool = moves.where((move) => move.focus == 'mobility' || move.name == 'Glute bridge' || move.name == 'Dead bug').toList();
  return _assemble(id: 'gentler', name: 'Gentler session', focus: 'mobility', habit: 'Doing the easy version keeps the streak honest.', minutes: 12, pool: pool, salt: 1);
}

DayPlan _assemble({
  required String id,
  required String name,
  required String focus,
  required String habit,
  required int minutes,
  required List<Move> pool,
  required int salt,
}) {
  final source = pool.isEmpty ? moves.where((move) => move.gear == 'body').toList() : pool;
  final count = minutes <= 15 ? 5 : minutes <= 30 ? 7 : 9;
  final chosen = <Move>[];
  var step = 0;
  while (chosen.length < count && chosen.length < source.length) {
    final move = source[(salt.abs() + step * 2) % source.length];
    if (!chosen.any((item) => item.name == move.name)) chosen.add(move);
    step += 1;
    if (step > 20) break;
  }
  final rest = focus == 'mobility' ? 10 : 15;
  final work = focus == 'mobility' ? 35 : 40;
  return DayPlan(
    id: id,
    name: name,
    focus: focus,
    minutes: minutes,
    habit: habit,
    exercises: [for (final move in chosen) Exercise(name: move.name, cue: move.cue, seconds: work, restSeconds: rest)],
  );
}

class MealIdea {
  const MealIdea({required this.name, required this.detail, required this.calories, required this.diets, required this.countries});
  final String name;
  final String detail;
  final int calories;
  final List<String> diets;
  final List<String> countries;

  Map<String, dynamic> toJson() => {'name': name, 'detail': detail, 'calories': calories};
  factory MealIdea.fromJson(Map<String, dynamic> json) => MealIdea(
        name: json['name'] as String? ?? 'Meal',
        detail: json['detail'] as String? ?? '',
        calories: json['calories'] as int? ?? 0,
        diets: const ['any'],
        countries: const ['INT'],
      );
}

const mealIdeas = [
  MealIdea(name: 'Oats, milk, and berries', detail: 'A bowl that holds you until lunch.', calories: 380, diets: ['vegetarian', 'budget'], countries: ['US', 'GB', 'INT']),
  MealIdea(name: 'Eggs and greens', detail: 'Two eggs, spinach, and tomatoes.', calories: 320, diets: ['vegetarian', 'keto'], countries: ['INT', 'NG', 'US']),
  MealIdea(name: 'Pap or oats with milk', detail: 'Warm pap or oats, milk, and a banana.', calories: 370, diets: ['vegetarian', 'budget'], countries: ['NG', 'GH']),
  MealIdea(name: 'Vegetable upma', detail: 'Semolina, peas, carrot, and peanuts.', calories: 390, diets: ['vegan', 'budget'], countries: ['IN']),
  MealIdea(name: 'Jollof and grilled chicken', detail: 'A smaller scoop of jollof, chicken, and salad.', calories: 640, diets: ['any'], countries: ['NG', 'GH']),
  MealIdea(name: 'Beans and ripe plantain', detail: 'Stewed beans with a few slices of plantain.', calories: 580, diets: ['vegan', 'budget'], countries: ['NG', 'GH']),
  MealIdea(name: 'Dal, rice, and cucumber', detail: 'A cup of dal, a modest scoop of rice, raw salad.', calories: 540, diets: ['vegan', 'budget'], countries: ['IN']),
  MealIdea(name: 'Githeri and greens', detail: 'Maize and beans with sukuma wiki.', calories: 560, diets: ['vegan', 'budget'], countries: ['KE']),
  MealIdea(name: 'Bean chili', detail: 'Beans, tomato, pepper, and a little rice.', calories: 520, diets: ['vegan', 'budget'], countries: ['US', 'GB', 'INT']),
  MealIdea(name: 'Big chicken salad', detail: 'Chicken, leaves, cucumber, olive oil, lemon.', calories: 480, diets: ['keto', 'any'], countries: ['INT']),
  MealIdea(name: 'Tofu and leafy greens', detail: 'Crisped tofu and a large salad.', calories: 460, diets: ['vegan', 'keto'], countries: ['INT']),
  MealIdea(name: 'Fruit and peanuts', detail: 'A piece of fruit and a small handful of peanuts.', calories: 220, diets: ['vegan', 'budget'], countries: ['INT']),
];

List<MealIdea> suggestMeals(String? country, List<String> preferences) {
  final code = _country(country);
  final prefs = preferences.map((item) => item.toLowerCase()).toSet()..remove('none');
  bool match(MealIdea idea) {
    if (prefs.contains('vegan') && !idea.diets.contains('vegan')) return false;
    if (prefs.contains('vegetarian') && !prefs.contains('vegan') && !(idea.diets.contains('vegetarian') || idea.diets.contains('vegan'))) return false;
    if (prefs.contains('keto') && !idea.diets.contains('keto')) return false;
    return true;
  }

  final filtered = mealIdeas.where(match).toList();
  final local = filtered.where((idea) => idea.countries.contains(code)).toList();
  final pool = local.length >= 2 ? local : filtered;
  return pool.take(4).toList();
}

String _country(String? input) {
  final key = (input ?? '').trim().toLowerCase();
  const codes = {'nigeria': 'NG', 'ng': 'NG', 'india': 'IN', 'in': 'IN', 'kenya': 'KE', 'ghana': 'GH', 'united states': 'US', 'usa': 'US', 'us': 'US', 'united kingdom': 'GB', 'uk': 'GB'};
  return codes[key] ?? (key.length == 2 ? key.toUpperCase() : 'INT');
}

class AchievementDef {
  const AchievementDef(this.id, this.title, this.detail);
  final String id;
  final String title;
  final String detail;
}

const achievementCatalog = [
  AchievementDef('first_session', 'First session', 'Finish a workout.'),
  AchievementDef('streak_7', 'Week of fire', 'Keep a 7-day streak.'),
  AchievementDef('streak_30', 'Unbreakable', 'Keep a 30-day streak.'),
  AchievementDef('first_2kg', 'First 2 kg', 'See the scale drop by 2 kilograms.'),
  AchievementDef('workouts_30', 'Thirty strong', 'Complete 30 workouts.'),
  AchievementDef('no_sugar_week', 'No sugar week', 'Seven days of meals with no added sugar.'),
  AchievementDef('level_5', 'Momentum', 'Reach level 5.'),
  AchievementDef('steps_8k', '8k day', 'Log 8,000 steps in a day.'),
];
