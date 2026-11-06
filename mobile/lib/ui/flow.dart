import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../config.dart';
import '../engine/engine.dart';
import '../models/models.dart';
import '../state/app_controller.dart';
import 'theme.dart';

class BootScreen extends StatelessWidget {
  const BootScreen({super.key});
  @override
  Widget build(BuildContext context) {
    return const PaperScaffold(child: Center(child: Display('PerfectShape', size: 42)));
  }
}

class SetupScreen extends StatelessWidget {
  const SetupScreen({super.key});
  @override
  Widget build(BuildContext context) {
    final app = context.read<AppController>();
    return PaperScaffold(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Spacer(),
            const Display('Keys live\non the server.'),
            const SizedBox(height: 16),
            const Text('This build has no Firebase config yet. You can walk the whole app in demo mode, or add the dart defines from the README and run it against your project.'),
            const SizedBox(height: 28),
            EmberButton(label: 'Continue in demo', onPressed: app.useDemo),
            const SizedBox(height: 12),
            Text('API default: ${AppConfig.apiBaseUrl}', style: const TextStyle(fontSize: 12, color: Tone.inkSoft)),
            const Spacer(),
          ],
        ),
      ),
    );
  }
}

class AuthScreen extends StatefulWidget {
  const AuthScreen({super.key});
  @override
  State<AuthScreen> createState() => _AuthScreenState();
}

class _AuthScreenState extends State<AuthScreen> {
  final email = TextEditingController();
  final password = TextEditingController();
  var creating = false;
  var error = '';

  @override
  void dispose() {
    email.dispose();
    password.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final app = context.read<AppController>();
    final message = creating ? await app.signUp(email.text, password.text) : await app.signIn(email.text, password.text);
    if (mounted) setState(() => error = message ?? '');
  }

  @override
  Widget build(BuildContext context) {
    final demo = context.watch<AppController>().demo;
    return PaperScaffold(
      child: ListView(
        padding: const EdgeInsets.fromLTRB(24, 32, 24, 24),
        children: [
          const Display('Home workouts.\nHonest food.\nA streak worth keeping.'),
          const SizedBox(height: 12),
          Text(demo ? 'Demo mode stays on this device. Passwords are not sent anywhere.' : 'Sign in with the email you want on both stores.'),
          const SizedBox(height: 28),
          TextField(controller: email, keyboardType: TextInputType.emailAddress, decoration: const InputDecoration(labelText: 'Email')),
          const SizedBox(height: 12),
          TextField(controller: password, obscureText: true, decoration: const InputDecoration(labelText: 'Password')),
          if (error.isNotEmpty) Padding(padding: const EdgeInsets.only(top: 12), child: Text(error, style: const TextStyle(color: Tone.coral))),
          const SizedBox(height: 20),
          EmberButton(label: creating ? 'Create account' : 'Enter', onPressed: _submit),
          TextButton(onPressed: () => setState(() => creating = !creating), child: Text(creating ? 'I already have an account' : 'Create an account')),
          if (!demo)
            TextButton(
              onPressed: () async {
                final message = await context.read<AppController>().sendReset(email.text);
                if (context.mounted) setState(() => error = message ?? 'Reset link sent if that account exists.');
              },
              child: const Text('Forgot password'),
            ),
        ],
      ),
    );
  }
}

class OnboardingScreen extends StatefulWidget {
  const OnboardingScreen({super.key});
  @override
  State<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends State<OnboardingScreen> {
  var step = 0;
  var imperial = false;
  var error = '';
  final name = TextEditingController();
  final age = TextEditingController();
  final height = TextEditingController();
  final weight = TextEditingController();
  final target = TextEditingController();
  final countryController = TextEditingController(text: 'Nigeria');
  String gender = 'female';
  String activity = 'light';
  String country = 'Nigeria';
  final diets = <String>{'none'};
  final gear = <String>{'none'};
  int minutes = 30;
  var accepted = false;

  @override
  void dispose() {
    name.dispose();
    age.dispose();
    height.dispose();
    weight.dispose();
    target.dispose();
    countryController.dispose();
    super.dispose();
  }

  double? _num(TextEditingController controller) => double.tryParse(controller.text.trim());

  double? get heightCm {
    final value = _num(height);
    if (value == null) return null;
    return imperial ? value * 2.54 : value;
  }

  double? get weightKg {
    final value = _num(weight);
    if (value == null) return null;
    return imperial ? lbToKg(value) : value;
  }

  double? get targetKg {
    final value = _num(target);
    if (value == null) return null;
    return imperial ? lbToKg(value) : value;
  }

  void _next() {
    final problem = _validate();
    if (problem != null) {
      setState(() => error = problem);
      return;
    }
    setState(() {
      error = '';
      step += 1;
    });
  }

  String? _validate() {
    switch (step) {
      case 1:
        if (name.text.trim().length < 2) return 'Add the name you want the coach to use.';
      case 2:
        final years = int.tryParse(age.text.trim());
        if (years == null || years < 16 || years > 90) return 'PerfectShape is for ages 16 to 90.';
        if (heightCm == null || heightCm! < 120 || heightCm! > 230) return 'Check the height.';
        if (weightKg == null || weightKg! < 35 || weightKg! > 300) return 'Check the weight.';
      case 3:
        if (targetKg == null || weightKg == null) return 'Add a target.';
        if (targetKg! > weightKg! + 0.5) return 'This plan is for losing weight or holding steady.';
    }
    return null;
  }

  Future<void> _finish() async {
    if (!accepted) {
      setState(() => error = 'Read the health note and confirm it before the plan starts.');
      return;
    }
    final profile = UserProfile(
      name: name.text.trim(),
      age: int.parse(age.text.trim()),
      gender: gender,
      heightCm: heightCm,
      currentWeightKg: weightKg,
      targetWeightKg: targetKg,
      activityLevel: activity,
      country: country,
      dietaryPreferences: diets.toList(),
      equipment: gear.toList(),
      dailyMinutes: minutes,
      units: imperial ? 'imperial' : 'metric',
      disclaimerAccepted: true,
      waterReminders: false,
      streakReminders: true,
    );
    final message = await context.read<AppController>().saveProfile(profile);
    if (message != null && mounted) setState(() => error = message);
  }

  @override
  Widget build(BuildContext context) {
    final plan = step == 7 && heightCm != null && weightKg != null && targetKg != null
        ? planCalories(gender: gender, age: int.parse(age.text), heightCm: heightCm!, weightKg: weightKg!, targetKg: targetKg!, activity: activity)
        : null;
    return PaperScaffold(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(24, 16, 24, 24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(children: [for (var i = 0; i < 8; i++) Expanded(child: Container(height: 4, margin: const EdgeInsets.only(right: 4), color: i <= step ? Tone.coral : Tone.mist))]),
            const SizedBox(height: 28),
            Expanded(child: _page(plan)),
            if (error.isNotEmpty) Padding(padding: const EdgeInsets.only(bottom: 8), child: Text(error, style: const TextStyle(color: Tone.coral))),
            EmberButton(label: step == 7 ? 'Start day one' : 'Continue', onPressed: step == 7 ? _finish : _next),
          ],
        ),
      ),
    );
  }

  Widget _page(CaloriePlan? plan) {
    switch (step) {
      case 0:
        return const Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Display('Seven questions.\nThen a plan you can actually repeat.'), SizedBox(height: 16), Text('Short home sessions. Food from where you live. No credit shop.')]);
      case 1:
        return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [const Display('What should we call you?'), const SizedBox(height: 16), TextField(controller: name, decoration: const InputDecoration(labelText: 'Name'))]);
      case 2:
        return ListView(
          children: [
            const Display('The body we are planning for.'),
            const SizedBox(height: 12),
            SegmentedButton<bool>(
              segments: const [ButtonSegment(value: false, label: Text('Metric')), ButtonSegment(value: true, label: Text('Imperial'))],
              selected: {imperial},
              onSelectionChanged: (value) => setState(() => imperial = value.first),
            ),
            const SizedBox(height: 12),
            TextField(controller: age, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'Age')),
            const SizedBox(height: 8),
            SegmentedButton<String>(
              segments: const [ButtonSegment(value: 'female', label: Text('Female')), ButtonSegment(value: 'male', label: Text('Male')), ButtonSegment(value: 'other', label: Text('Other'))],
              selected: {gender},
              onSelectionChanged: (value) => setState(() => gender = value.first),
            ),
            const SizedBox(height: 8),
            TextField(controller: height, keyboardType: TextInputType.number, decoration: InputDecoration(labelText: imperial ? 'Height (in)' : 'Height (cm)')),
            const SizedBox(height: 8),
            TextField(controller: weight, keyboardType: TextInputType.number, decoration: InputDecoration(labelText: imperial ? 'Weight (lb)' : 'Weight (kg)')),
          ],
        );
      case 3:
        return ListView(
          children: [
            const Display('Where is this headed?'),
            const SizedBox(height: 12),
            TextField(controller: target, keyboardType: TextInputType.number, decoration: InputDecoration(labelText: imperial ? 'Target (lb)' : 'Target (kg)')),
            const SizedBox(height: 12),
            Wrap(
              spacing: 8,
              children: [
                for (final item in const ['sedentary', 'light', 'moderate', 'active'])
                  ChoiceChip(label: Text(item), selected: activity == item, onSelected: (_) => setState(() => activity = item)),
              ],
            ),
          ],
        );
      case 4:
        return ListView(
          children: [
            const Display('Food you can actually find.'),
            const SizedBox(height: 12),
            TextField(controller: countryController, onChanged: (value) => country = value, decoration: const InputDecoration(labelText: 'Country')),
            const SizedBox(height: 12),
            Wrap(
              spacing: 8,
              children: [
                for (final item in const ['none', 'vegan', 'vegetarian', 'keto', 'budget'])
                  FilterChip(
                    label: Text(item),
                    selected: diets.contains(item),
                    onSelected: (selected) => setState(() {
                      if (item == 'none') {
                        diets..clear()..add('none');
                      } else {
                        diets.remove('none');
                        selected ? diets.add(item) : diets.remove(item);
                        if (diets.isEmpty) diets.add('none');
                      }
                    }),
                  ),
              ],
            ),
          ],
        );
      case 5:
        return ListView(
          children: [
            const Display('What is already at home?'),
            const SizedBox(height: 12),
            Wrap(
              spacing: 8,
              children: [
                for (final item in const ['none', 'dumbbells', 'bands', 'rope'])
                  FilterChip(label: Text(item), selected: gear.contains(item), onSelected: (selected) => setState(() => selected ? gear.add(item) : gear.remove(item))),
              ],
            ),
            const SizedBox(height: 16),
            SegmentedButton<int>(
              segments: const [ButtonSegment(value: 15, label: Text('15 min')), ButtonSegment(value: 30, label: Text('30')), ButtonSegment(value: 45, label: Text('45'))],
              selected: {minutes},
              onSelectionChanged: (value) => setState(() => minutes = value.first),
            ),
          ],
        );
      case 6:
        return ListView(
          children: [
            const Display('Not medical advice.'),
            const SizedBox(height: 12),
            const Text(healthDisclaimer),
            CheckboxListTile(value: accepted, onChanged: (value) => setState(() => accepted = value ?? false), title: const Text('I understand. I will talk to a clinician if I am pregnant, injured, or unwell.'), contentPadding: EdgeInsets.zero),
          ],
        );
      default:
        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Display(plan == null ? 'Your first day' : '${plan.target} kcal'),
            const SizedBox(height: 8),
            Text(plan?.caution ?? 'A steady deficit, never a crash. The streak starts when you log something real today.'),
            const SizedBox(height: 12),
            const Text('Water reminders stay off until you turn them on.'),
          ],
        );
    }
  }
}

class PaywallScreen extends StatelessWidget {
  const PaywallScreen({super.key});
  @override
  Widget build(BuildContext context) {
    final app = context.watch<AppController>();
    return PaperScaffold(
      child: ListView(
        padding: const EdgeInsets.all(24),
        children: [
          const Display('Plus is a membership.\nNot a coin shop.'),
          const SizedBox(height: 12),
          const Text('Free keeps the daily loop: plans, logging, streaks, and three coach notes a day. Plus is the live coach, meal photos, and plan adjustments. Apple and Google charge you. We only unlock after the server verifies the receipt.'),
          const SizedBox(height: 20),
          for (final offer in app.offers) ...[
            SoftCard(
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(offer.title, style: const TextStyle(fontFamily: 'Syne', fontSize: 24, fontWeight: FontWeight.w700)),
                Text(offer.price, style: const TextStyle(color: Tone.coral, fontWeight: FontWeight.w700)),
                const SizedBox(height: 6),
                Text(offer.description),
                const SizedBox(height: 12),
                EmberButton(
                  label: offer.purchasable ? 'Subscribe' : 'Waiting for the store',
                  onPressed: offer.purchasable ? () async {
                    final message = await context.read<AppController>().buy(offer);
                    if (message != null && context.mounted) _toast(context, message);
                  } : null,
                ),
              ]),
            ),
            const SizedBox(height: 12),
          ],
          const Text('Payment is charged to your Apple ID or Google account. Subscriptions renew until you cancel in the store at least 24 hours before the period ends. Manage or cancel in your store account settings.'),
          TextButton(
            onPressed: () async {
              final message = await context.read<AppController>().restore();
              if (message != null && context.mounted) _toast(context, message);
            },
            child: const Text('Restore purchases'),
          ),
          TextButton(onPressed: () => context.push('/legal/terms'), child: const Text('Terms and privacy')),
          if (app.demo && kDebugMode)
            TextButton(onPressed: () => context.read<AppController>().enablePreviewPlus(), child: const Text('Debug only: preview Plus')),
        ],
      ),
    );
  }

  void _toast(BuildContext context, String message) {
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(message)));
  }
}
