import 'package:flutter_test/flutter_test.dart';
import 'package:perfectshape/engine/engine.dart';

void main() {
  test('calorie plans stay above the floor and cap the deficit', () {
    final small = planCalories(gender: 'female', age: 25, heightCm: 150, weightKg: 45, targetKg: 44, activity: 'sedentary');
    expect(small.target, greaterThanOrEqualTo(1400));
    final low = planCalories(gender: 'female', age: 25, heightCm: 175, weightKg: 45, targetKg: 44, activity: 'light');
    expect(low.bmi, lessThan(18.5));
    expect(low.deficit, 0);
    expect(low.caution, contains('clinician'));
    expect(clampCalorieAdjustment(2000, 1000, 1400), 1850);
    expect(clampCalorieAdjustment(1450, 1000, 1400), 1400);
  });

  test('a level never falls when a streak breaks', () {
    final state = XpState(totalXp: 520, level: 2, streakCount: 4, lastActiveDate: '2026-11-01', graceTokens: 0, bestStreak: 4);
    final broken = reduceDailyAward(state: state, events: const [], today: '2026-11-05', event: 'workout', xpAmount: 40, checkIn: true, countWorkout: true);
    expect(broken.streakReset, isTrue);
    expect(broken.penaltyXp, 20);
    expect(broken.xp.level, 2);
    expect(broken.xp.totalXp, 545);
  });

  test('one grace day saves a single miss', () {
    final state = XpState(streakCount: 3, lastActiveDate: '2026-11-01', graceTokens: 1, bestStreak: 3);
    final held = reduceDailyAward(state: state, events: const [], today: '2026-11-03', event: 'workout', xpAmount: 40, checkIn: true);
    expect(held.graceUsed, isTrue);
    expect(held.xp.streakCount, 3);
    expect(held.penaltyXp, 0);
    expect(themeAllowed('dawn', false), isTrue);
    expect(themeAllowed('summit', false), isFalse);
    expect(themeAllowed('summit', true), isTrue);
  });

  test('equipment the user does not own stays out of the plan', () {
    final days = buildWeek(weekId: '2026-W45', minutes: 15, equipment: const ['none']);
    final names = days.expand((day) => day.exercises.map((exercise) => exercise.name)).join(' ');
    expect(names, isNot(contains('dumbbell')));
    expect(names.toLowerCase(), isNot(contains('band')));
    expect(names.toLowerCase(), isNot(contains('rope')));
  });

  test('crisis copy points at help and does not coach through it', () {
    expect(crisisReply('I want to die'), contains('988'));
    expect(crisisReply('what is for lunch'), isNull);
  });
}
