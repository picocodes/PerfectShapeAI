import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_tts/flutter_tts.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../engine/engine.dart';
import '../state/app_controller.dart';
import 'theme.dart';
import 'you.dart';

class AppShell extends StatelessWidget {
  const AppShell({super.key, required this.index, required this.child});
  final int index;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    final banner = context.watch<AppController>().banner;
    return PaperScaffold(
      child: Column(
        children: [
          if (banner != null)
            MaterialBanner(
              content: Text(banner),
              actions: [TextButton(onPressed: context.read<AppController>().clearBanner, child: const Text('OK'))],
            ),
          Expanded(child: child),
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
              decoration: BoxDecoration(color: Tone.ink, borderRadius: BorderRadius.circular(28)),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceAround,
                children: [
                  _tab(context, 0, 'Home', '/home'),
                  _tab(context, 1, 'Move', '/move'),
                  _tab(context, 2, 'Eat', '/eat'),
                  _tab(context, 3, 'Coach', '/coach'),
                  _tab(context, 4, 'You', '/you'),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _tab(BuildContext context, int value, String label, String path) {
    final selected = index == value;
    return GestureDetector(
      onTap: () => context.go(path),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
        child: Text(label, style: TextStyle(color: selected ? Tone.coral : Tone.cream, fontWeight: FontWeight.w700, fontSize: 13)),
      ),
    );
  }
}

class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key});
  @override
  Widget build(BuildContext context) {
    final app = context.watch<AppController>();
    final today = app.today;
    if (today == null || !today.profileComplete || today.day == null || today.game == null || today.daily == null) {
      return const Center(child: Text('Building today…'));
    }
    final name = app.profile?.name ?? 'there';
    final done = [today.daily!.workoutCompleted, today.daily!.caloriesConsumed > 0, today.daily!.waterMl >= waterGoalMl, (today.daily!.mood ?? 0) > 0];
    return ListView(
      padding: const EdgeInsets.fromLTRB(20, 12, 20, 20),
      children: [
        Display('Hello, $name.'),
        const SizedBox(height: 8),
        Text(today.game!.streakAtRisk ? 'Streak is open. One real log keeps it.' : '${today.game!.streakCount}-day streak · ${today.game!.zoneName}'),
        const SizedBox(height: 18),
        SoftCard(
          color: Tone.ink,
          child: Row(
            children: [
              Expanded(
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text(today.day!.name, style: const TextStyle(fontFamily: 'Syne', color: Tone.cream, fontSize: 28, fontWeight: FontWeight.w700, height: 1)),
                  const SizedBox(height: 8),
                  Text('${today.day!.minutes} min · ${today.day!.focus}', style: const TextStyle(color: Tone.sun)),
                  const SizedBox(height: 14),
                  EmberButton(label: today.daily!.workoutCompleted ? 'Done for today' : 'Start session', light: true, onPressed: () => context.push('/workout')),
                ]),
              ),
              const SizedBox(width: 12),
              DayRing(parts: done),
            ],
          ),
        ),
        const SizedBox(height: 12),
        Row(children: [
          _stat('Food', '${today.daily!.caloriesConsumed}/${today.calorieTarget ?? 0}'),
          _stat('Water', '${today.daily!.waterMl}'),
          _stat('Steps', '${today.daily!.steps}'),
        ]),
        const SizedBox(height: 12),
        SoftCard(
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text('Level ${today.game!.level} · ${today.game!.zoneName}', style: const TextStyle(fontWeight: FontWeight.w700)),
            const SizedBox(height: 8),
            ClipRRect(
              borderRadius: BorderRadius.circular(99),
              child: LinearProgressIndicator(minHeight: 10, value: today.game!.xpForLevel == 0 ? 0 : today.game!.xpIntoLevel / today.game!.xpForLevel, color: Tone.teal, backgroundColor: Tone.mist),
            ),
            const SizedBox(height: 6),
            Text(today.game!.nextZoneName == null ? today.game!.zoneLine : '${today.game!.xpForLevel - today.game!.xpIntoLevel} XP to ${today.game!.nextZoneName}'),
          ]),
        ),
        if (today.challenge != null) ...[
          const SizedBox(height: 12),
          SoftCard(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text(today.challenge!.title, style: const TextStyle(fontFamily: 'Syne', fontSize: 22, fontWeight: FontWeight.w700)), Text(today.challenge!.detail), if (today.challenge!.done) const Text('Closed.', style: TextStyle(color: Tone.good))])),
        ],
        if (today.insight != null) ...[
          const SizedBox(height: 12),
          SoftCard(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text(today.insight!.title, style: const TextStyle(fontWeight: FontWeight.w700)), Text(today.insight!.body)])),
        ],
        if (today.caution != null) ...[
          const SizedBox(height: 12),
          Text(today.caution!, style: const TextStyle(color: Tone.inkSoft)),
        ],
        const SizedBox(height: 12),
        TextButton(onPressed: () => context.push('/share'), child: const Text('Share today\'s card')),
      ],
    );
  }

  Widget _stat(String label, String value) => Expanded(child: SoftCard(padding: const EdgeInsets.all(14), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text(label, style: const TextStyle(fontSize: 12)), Text(value, style: const TextStyle(fontFamily: 'Syne', fontSize: 18, fontWeight: FontWeight.w700))])));
}

class MoveScreen extends StatelessWidget {
  const MoveScreen({super.key});
  @override
  Widget build(BuildContext context) {
    final today = context.watch<AppController>().today;
    final day = today?.day;
    if (day == null) return const Center(child: Text('No session yet.'));
    return ListView(
      padding: const EdgeInsets.all(20),
      children: [
        Display(day.name),
        Text(day.habit),
        const SizedBox(height: 12),
        for (final exercise in day.exercises)
          Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: SoftCard(padding: const EdgeInsets.all(16), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text(exercise.name, style: const TextStyle(fontWeight: FontWeight.w700)), Text(exercise.cue), Text('${exercise.seconds}s work · ${exercise.restSeconds}s rest', style: const TextStyle(color: Tone.inkSoft))])),
          ),
        EmberButton(label: 'Make today gentler', light: true, onPressed: () async {
          final message = await context.read<AppController>().gentler();
          if (message != null && context.mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(message)));
        }),
        const SizedBox(height: 8),
        EmberButton(label: 'Start the timer', onPressed: () => context.push('/workout')),
        TextButton(
          onPressed: () async {
            final steps = await context.read<AppController>().importSteps();
            if (!context.mounted) return;
            ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(steps == null ? 'Steps stay optional. You can type them on Eat.' : '$steps steps from Health.')));
          },
          child: const Text('Read steps from Health'),
        ),
      ],
    );
  }
}

class WorkoutScreen extends StatefulWidget {
  const WorkoutScreen({super.key});
  @override
  State<WorkoutScreen> createState() => _WorkoutScreenState();
}

class _WorkoutScreenState extends State<WorkoutScreen> {
  final voice = FlutterTts();
  Timer? timer;
  var index = 0;
  var resting = false;
  var left = 0;
  var elapsed = 0;
  var running = false;
  var speak = true;

  DayPlan? get day => context.read<AppController>().today?.day;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final plan = day;
      if (plan != null && plan.exercises.isNotEmpty) setState(() => left = plan.exercises.first.seconds);
    });
  }

  @override
  void dispose() {
    timer?.cancel();
    voice.stop();
    super.dispose();
  }

  void _start() {
    final plan = day;
    if (plan == null || running) return;
    setState(() => running = true);
    _cue();
    timer = Timer.periodic(const Duration(seconds: 1), (_) => _tick());
  }

  void _tick() {
    final plan = day;
    if (plan == null) return;
    setState(() {
      elapsed += 1;
      left -= 1;
    });
    if (left > 0) return;
    final exercise = plan.exercises[index];
    if (!resting) {
      setState(() {
        resting = true;
        left = exercise.restSeconds;
      });
      if (speak) voice.speak('Rest.');
      return;
    }
    if (index >= plan.exercises.length - 1) {
      timer?.cancel();
      _finish();
      return;
    }
    setState(() {
      index += 1;
      resting = false;
      left = plan.exercises[index].seconds;
    });
    _cue();
  }

  void _cue() {
    final plan = day;
    if (plan == null || !speak) return;
    voice.speak(plan.exercises[index].cue);
  }

  Future<void> _finish() async {
    final plan = day;
    if (plan == null) return;
    HapticFeedback.mediumImpact();
    final result = await context.read<AppController>().completeWorkout(plan.id, elapsed);
    if (!mounted) return;
    if (result.paywall) context.push('/paywall');
    await showDialog<void>(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: Tone.paper,
        title: Text(result.celebration?.title ?? 'Logged'),
        content: Text(result.celebration?.detail ?? result.message ?? 'That session counts.'),
        actions: [TextButton(onPressed: () => Navigator.pop(context), child: const Text('Back home'))],
      ),
    );
    if (mounted) context.go('/home');
  }

  @override
  Widget build(BuildContext context) {
    final plan = context.watch<AppController>().today?.day;
    if (plan == null || plan.exercises.isEmpty) return const Scaffold(body: Center(child: Text('No session')));
    final exercise = plan.exercises[index.clamp(0, plan.exercises.length - 1)];
    return PaperScaffold(
      dark: true,
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('${index + 1} / ${plan.exercises.length}', style: const TextStyle(color: Tone.sun)),
            const Spacer(),
            Display(resting ? 'Rest' : exercise.name, color: Tone.cream, size: 48),
            const SizedBox(height: 8),
            Text(resting ? 'Shake out. Next one is coming.' : exercise.cue, style: const TextStyle(color: Tone.cream, fontSize: 18)),
            const SizedBox(height: 18),
            Text('$left', style: const TextStyle(fontFamily: 'Syne', fontSize: 96, color: Tone.coral, height: 0.9)),
            const Spacer(),
            Row(children: [
              TextButton(onPressed: () => setState(() => speak = !speak), child: Text(speak ? 'Voice on' : 'Voice off', style: const TextStyle(color: Tone.cream))),
              const Spacer(),
              TextButton(onPressed: elapsed < 15 ? null : _finish, child: const Text('End early', style: TextStyle(color: Tone.cream))),
            ]),
            EmberButton(label: running ? 'Running' : 'Begin', light: true, onPressed: running ? null : _start),
          ],
        ),
      ),
    );
  }
}

class EatScreen extends StatefulWidget {
  const EatScreen({super.key});
  @override
  State<EatScreen> createState() => _EatScreenState();
}

class _EatScreenState extends State<EatScreen> {
  final name = TextEditingController();
  final calories = TextEditingController();
  final steps = TextEditingController();
  var noSugar = true;

  @override
  void dispose() {
    name.dispose();
    calories.dispose();
    steps.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final today = context.watch<AppController>().today;
    return ListView(
      padding: const EdgeInsets.all(20),
      children: [
        const Display('Eat like you live there.'),
        const SizedBox(height: 8),
        Text('${today?.daily?.caloriesConsumed ?? 0} of ${today?.calorieTarget ?? 0} kcal logged'),
        const SizedBox(height: 12),
        for (final idea in today?.suggestions ?? const <MealIdea>[])
          Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: SoftCard(
              padding: const EdgeInsets.all(16),
              child: ListTile(
                contentPadding: EdgeInsets.zero,
                title: Text(idea.name),
                subtitle: Text('${idea.detail} · ${idea.calories} kcal'),
                onTap: () => context.read<AppController>().addMeal(name: idea.name, calories: idea.calories, noSugar: noSugar),
              ),
            ),
          ),
        TextField(controller: name, decoration: const InputDecoration(labelText: 'Custom meal')),
        const SizedBox(height: 8),
        TextField(controller: calories, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'Calories')),
        SwitchListTile(contentPadding: EdgeInsets.zero, value: noSugar, onChanged: (value) => setState(() => noSugar = value), title: const Text('No added sugar')),
        EmberButton(
          label: 'Log meal',
          onPressed: () {
            final kcal = int.tryParse(calories.text);
            if (name.text.trim().isEmpty || kcal == null) return;
            context.read<AppController>().addMeal(name: name.text.trim(), calories: kcal, noSugar: noSugar);
          },
        ),
        const SizedBox(height: 16),
        Text('Water ${today?.daily?.waterMl ?? 0} / $waterGoalMl ml'),
        const SizedBox(height: 8),
        EmberButton(label: 'Add 250 ml', light: true, onPressed: () => context.read<AppController>().addWater(250)),
        const SizedBox(height: 16),
        const Text('Mood, if you want it.'),
        Row(children: [
          for (var mood = 1; mood <= 5; mood++)
            IconButton(onPressed: () => context.read<AppController>().setMood(mood), icon: Text('$mood', style: TextStyle(fontWeight: today?.daily?.mood == mood ? FontWeight.w800 : FontWeight.w400))),
        ]),
        TextField(controller: steps, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'Steps today')),
        const SizedBox(height: 8),
        EmberButton(
          label: 'Save steps',
          light: true,
          onPressed: () {
            final count = int.tryParse(steps.text);
            if (count != null) context.read<AppController>().setSteps(count);
          },
        ),
        const MealPhotoButton(),
      ],
    );
  }
}

class CoachScreen extends StatefulWidget {
  const CoachScreen({super.key});
  @override
  State<CoachScreen> createState() => _CoachScreenState();
}

class _CoachScreenState extends State<CoachScreen> {
  final input = TextEditingController();

  @override
  void dispose() {
    input.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final app = context.watch<AppController>();
    return Column(
      children: [
        Expanded(
          child: ListView(
            padding: const EdgeInsets.all(20),
            children: [
              const Display('Coach', size: 36),
              Text(app.premium ? 'Plus · live coach when the server is configured.' : '${app.entitlement.coachRemaining} free notes left today.'),
              const SizedBox(height: 12),
              for (final message in app.messages)
                Align(
                  alignment: message.role == 'user' ? Alignment.centerRight : Alignment.centerLeft,
                  child: Container(
                    margin: const EdgeInsets.only(bottom: 8),
                    padding: const EdgeInsets.all(14),
                    constraints: const BoxConstraints(maxWidth: 320),
                    decoration: BoxDecoration(color: message.role == 'user' ? Tone.ink : Tone.paper, borderRadius: BorderRadius.circular(18)),
                    child: Text(message.text, style: TextStyle(color: message.role == 'user' ? Tone.cream : Tone.ink)),
                  ),
                ),
            ],
          ),
        ),
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
          child: Row(children: [
            Expanded(child: TextField(controller: input, decoration: const InputDecoration(hintText: 'Ask for a smaller day'))),
            IconButton(
              onPressed: () async {
                final text = input.text.trim();
                if (text.isEmpty) return;
                input.clear();
                final reply = await context.read<AppController>().askCoach(text);
                if (reply?.paywall == true && context.mounted) context.push('/paywall');
              },
              icon: const Icon(Icons.arrow_upward),
            ),
          ]),
        ),
      ],
    );
  }
}
