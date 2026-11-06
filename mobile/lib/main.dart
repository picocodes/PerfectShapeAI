import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import 'state/app_controller.dart';
import 'ui/flow.dart';
import 'ui/loop.dart';
import 'ui/theme.dart';
import 'ui/you.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  final controller = AppController();
  runApp(PerfectApp(controller: controller));
  await controller.boot();
}

class PerfectApp extends StatefulWidget {
  const PerfectApp({super.key, required this.controller});
  final AppController controller;

  @override
  State<PerfectApp> createState() => _PerfectAppState();
}

class _PerfectAppState extends State<PerfectApp> {
  late final GoRouter router = GoRouter(
    initialLocation: '/boot',
    refreshListenable: widget.controller,
    redirect: (context, state) {
      final app = widget.controller;
      final location = state.matchedLocation;
      if (!app.booted) return location == '/boot' ? null : '/boot';
      if (app.needsSetup) return location == '/setup' ? null : '/setup';
      if (!app.signedIn) return location == '/auth' ? null : '/auth';
      if (!app.onboarded) return location == '/onboarding' ? null : '/onboarding';
      const gates = {'/boot', '/setup', '/auth', '/onboarding'};
      if (gates.contains(location)) return '/home';
      return null;
    },
    routes: [
      GoRoute(path: '/boot', builder: (context, state) => const BootScreen()),
      GoRoute(path: '/setup', builder: (context, state) => const SetupScreen()),
      GoRoute(path: '/auth', builder: (context, state) => const AuthScreen()),
      GoRoute(path: '/onboarding', builder: (context, state) => const OnboardingScreen()),
      GoRoute(path: '/home', builder: (context, state) => const AppShell(index: 0, child: HomeScreen())),
      GoRoute(path: '/move', builder: (context, state) => const AppShell(index: 1, child: MoveScreen())),
      GoRoute(path: '/eat', builder: (context, state) => const AppShell(index: 2, child: EatScreen())),
      GoRoute(path: '/coach', builder: (context, state) => const AppShell(index: 3, child: CoachScreen())),
      GoRoute(path: '/you', builder: (context, state) => const AppShell(index: 4, child: YouScreen())),
      GoRoute(path: '/workout', builder: (context, state) => const WorkoutScreen()),
      GoRoute(path: '/weight', builder: (context, state) => const WeightScreen()),
      GoRoute(path: '/paywall', builder: (context, state) => const PaywallScreen()),
      GoRoute(path: '/settings', builder: (context, state) => const SettingsScreen()),
      GoRoute(path: '/share', builder: (context, state) => const ShareScreen()),
      GoRoute(path: '/photos', builder: (context, state) => const PhotosScreen()),
      GoRoute(path: '/legal/:doc', builder: (context, state) => LegalScreen(doc: state.pathParameters['doc'] ?? 'health')),
    ],
  );

  @override
  void dispose() {
    router.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider.value(
      value: widget.controller,
      child: MaterialApp.router(title: 'PerfectShape', theme: perfectTheme(), routerConfig: router),
    );
  }
}
