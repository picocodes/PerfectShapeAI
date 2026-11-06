import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:perfectshape/engine/engine.dart';
import 'package:perfectshape/models/models.dart';
import 'package:perfectshape/state/app_controller.dart';
import 'package:perfectshape/ui/flow.dart';
import 'package:perfectshape/ui/loop.dart';
import 'package:perfectshape/ui/theme.dart';
import 'package:provider/provider.dart';

void main() {
  testWidgets('home shows the streak and today session', (tester) async {
    final app = AppController();
    app.profile = UserProfile(name: 'Ada', onboardingComplete: true);
    app.today = TodayBundle(
      date: '2026-11-06',
      profileComplete: true,
      disclaimer: healthDisclaimer,
      calorieTarget: 1800,
      day: const DayPlan(id: 'day', name: 'Lower strength', focus: 'strength', minutes: 20, habit: 'Shoes by the door.', exercises: [Exercise(name: 'Squat', cue: 'Heels heavy.', seconds: 40, restSeconds: 15)]),
      daily: const DailyView(caloriesConsumed: 400, workoutCompleted: false, waterMl: 250, steps: 1200),
      game: const GameView(totalXp: 55, level: 1, xpIntoLevel: 55, xpForLevel: 500, streakCount: 4, streakAtRisk: false, graceTokens: 1, bestStreak: 4, workoutsCompleted: 1, zoneName: 'Foundation', zoneLine: 'Learn the shape of a good day.'),
      entitlement: Entitlement.free(),
    );
    await tester.pumpWidget(ChangeNotifierProvider.value(value: app, child: MaterialApp(theme: perfectTheme(), home: const HomeScreen())));
    expect(find.text('Hello, Ada.'), findsOneWidget);
    expect(find.text('Lower strength'), findsOneWidget);
    expect(find.textContaining('4-day streak'), findsOneWidget);
    expect(find.text('Start session'), findsOneWidget);
  });

  testWidgets('paywall names both products and offers restore', (tester) async {
    final app = AppController();
    app.offers = const [
      StoreOffer(id: productMonthly, title: 'Plus monthly', price: r'$4.99', description: 'Monthly', purchasable: true),
      StoreOffer(id: productYearly, title: 'Plus yearly', price: r'$39.99', description: 'Yearly', purchasable: true),
    ];
    await tester.pumpWidget(ChangeNotifierProvider.value(value: app, child: MaterialApp(theme: perfectTheme(), home: const PaywallScreen())));
    expect(find.textContaining('Not a coin shop'), findsOneWidget);
    await tester.scrollUntilVisible(find.text('Plus monthly'), 300);
    expect(find.text('Plus monthly'), findsOneWidget);
    await tester.scrollUntilVisible(find.text('Plus yearly'), 300);
    expect(find.text('Plus yearly'), findsOneWidget);
    await tester.scrollUntilVisible(find.text('Restore purchases'), 300);
    expect(find.text('Restore purchases'), findsOneWidget);
    await tester.scrollUntilVisible(find.textContaining('Apple ID or Google account'), 300);
    expect(find.textContaining('Apple ID or Google account'), findsOneWidget);
  });

  testWidgets('onboarding blocks the plan until the disclaimer is accepted', (tester) async {
    final app = AppController();
    await tester.pumpWidget(ChangeNotifierProvider.value(value: app, child: MaterialApp(theme: perfectTheme(), home: const OnboardingScreen())));
    expect(find.text('Continue'), findsOneWidget);
    await tester.tap(find.text('Continue'));
    await tester.pumpAndSettle();
    expect(find.text('What should we call you?'), findsOneWidget);
  });
}
