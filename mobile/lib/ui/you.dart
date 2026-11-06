import 'dart:convert';
import 'dart:io';
import 'dart:ui' as ui;

import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart' hide Badge;
import 'package:flutter/rendering.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import 'package:path_provider/path_provider.dart';
import 'package:provider/provider.dart';
import 'package:share_plus/share_plus.dart';
import 'package:url_launcher/url_launcher.dart';

import '../engine/engine.dart';
import '../models/models.dart';
import '../state/app_controller.dart';
import 'theme.dart';

class YouScreen extends StatelessWidget {
  const YouScreen({super.key});
  @override
  Widget build(BuildContext context) {
    final app = context.watch<AppController>();
    final game = app.today?.game;
    return ListView(
      padding: const EdgeInsets.all(20),
      children: [
        Row(children: [
          AvatarMark(level: game?.level ?? 1),
          const SizedBox(width: 16),
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Display(app.profile?.name ?? 'You', size: 32),
            Text(game == null ? '' : 'Level ${game.level} · ${game.zoneName}'),
            Text(game?.zoneLine ?? ''),
          ])),
        ]),
        const SizedBox(height: 16),
        if (app.today?.estimate != null) Text(app.today!.estimate!.note),
        const SizedBox(height: 12),
        Wrap(spacing: 8, runSpacing: 8, children: [
          for (final badge in app.today?.achievements ?? const <Badge>[])
            Container(
              width: 150,
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(color: badge.unlocked ? Tone.paper : Tone.mist, borderRadius: BorderRadius.circular(18), border: Border.all(color: Tone.line)),
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text(badge.title, style: const TextStyle(fontWeight: FontWeight.w700)), Text(badge.detail, style: const TextStyle(fontSize: 12))]),
            ),
        ]),
        const SizedBox(height: 12),
        _link(context, 'Weight', '/weight'),
        _link(context, 'Progress photos', '/photos'),
        _link(context, 'Share a card', '/share'),
        _link(context, app.premium ? 'Plus is active' : 'See Plus', '/paywall'),
        _link(context, 'Settings', '/settings'),
      ],
    );
  }

  Widget _link(BuildContext context, String label, String path) => Padding(
        padding: const EdgeInsets.only(bottom: 8),
        child: SoftCard(padding: const EdgeInsets.symmetric(horizontal: 8), child: ListTile(title: Text(label), trailing: const Icon(Icons.chevron_right), onTap: () => context.push(path))),
      );
}

class WeightScreen extends StatefulWidget {
  const WeightScreen({super.key});
  @override
  State<WeightScreen> createState() => _WeightScreenState();
}

class _WeightScreenState extends State<WeightScreen> {
  final weight = TextEditingController();
  final waist = TextEditingController();

  @override
  void dispose() {
    weight.dispose();
    waist.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final app = context.watch<AppController>();
    final units = app.profile?.units ?? 'metric';
    final spots = <FlSpot>[
      for (var i = 0; i < app.weightLog.length; i++) FlSpot(i.toDouble(), app.weightLog[i].weightKg),
    ];
    return PaperScaffold(
      child: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          const Display('The line, not the morning.'),
          const SizedBox(height: 12),
          if (spots.length > 1)
            SizedBox(
              height: 180,
              child: LineChart(LineChartData(
                gridData: const FlGridData(show: false),
                titlesData: const FlTitlesData(show: false),
                borderData: FlBorderData(show: false),
                lineBarsData: [LineChartBarData(spots: spots, isCurved: true, color: Tone.coral, barWidth: 3, dotData: const FlDotData(show: false))],
              )),
            ),
          TextField(controller: weight, keyboardType: TextInputType.number, decoration: InputDecoration(labelText: units == 'imperial' ? 'Weight (lb)' : 'Weight (kg)')),
          const SizedBox(height: 8),
          TextField(controller: waist, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'Waist cm, optional')),
          const SizedBox(height: 12),
          EmberButton(
            label: 'Log weight',
            onPressed: () async {
              final value = double.tryParse(weight.text);
              if (value == null) return;
              final kg = units == 'imperial' ? lbToKg(value) : value;
              final waistCm = double.tryParse(waist.text);
              final result = await context.read<AppController>().addWeight(kg, waist: waistCm);
              if (!context.mounted) return;
              if (result.message != null) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(result.message!)));
            },
          ),
          if (app.today?.estimate != null) Padding(padding: const EdgeInsets.only(top: 16), child: Text(app.today!.estimate!.note)),
          const SizedBox(height: 8),
          const Text(healthDisclaimer, style: TextStyle(fontSize: 12)),
        ],
      ),
    );
  }
}

class SettingsScreen extends StatelessWidget {
  const SettingsScreen({super.key});
  @override
  Widget build(BuildContext context) {
    final app = context.watch<AppController>();
    final profile = app.profile;
    return PaperScaffold(
      child: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          const Display('Settings', size: 36),
          SwitchListTile(
            contentPadding: EdgeInsets.zero,
            title: const Text('Streak reminder'),
            subtitle: const Text('One local note in the evening. On by default.'),
            value: profile?.streakReminders ?? true,
            onChanged: (value) => _save(context, profile, streak: value),
          ),
          SwitchListTile(
            contentPadding: EdgeInsets.zero,
            title: const Text('Water reminder'),
            subtitle: const Text('Off unless you want it.'),
            value: profile?.waterReminders ?? false,
            onChanged: (value) => _save(context, profile, water: value),
          ),
          ListTile(contentPadding: EdgeInsets.zero, title: Text(app.premium ? 'Plus is active' : 'Free plan'), subtitle: Text(app.entitlement.productId ?? 'No store product linked')),
          TextButton(onPressed: () => launchUrl(Uri.parse(Platform.isIOS ? 'https://apps.apple.com/account/subscriptions' : 'https://play.google.com/store/account/subscriptions'), mode: LaunchMode.externalApplication), child: const Text('Manage subscription in the store')),
          TextButton(onPressed: () => context.push('/legal/privacy'), child: const Text('Privacy')),
          TextButton(onPressed: () => context.push('/legal/terms'), child: const Text('Terms')),
          TextButton(onPressed: () => context.push('/legal/health'), child: const Text('Health disclaimer')),
          TextButton(onPressed: () => context.read<AppController>().signOut(), child: const Text('Sign out')),
          TextButton(
            onPressed: () async {
              final confirmed = await showDialog<bool>(
                context: context,
                builder: (context) => AlertDialog(
                  title: const Text('Delete the account?'),
                  content: const Text('This removes the profile, logs, and coach history from PerfectShape. Store subscriptions must still be canceled with Apple or Google.'),
                  actions: [
                    TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Keep')),
                    TextButton(onPressed: () => Navigator.pop(context, true), child: const Text('Delete')),
                  ],
                ),
              );
              if (confirmed == true && context.mounted) {
                final message = await context.read<AppController>().deleteAccount();
                if (message != null && context.mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(message)));
              }
            },
            child: const Text('Delete account'),
          ),
        ],
      ),
    );
  }

  Future<void> _save(BuildContext context, UserProfile? profile, {bool? streak, bool? water}) async {
    if (profile == null) return;
    profile.streakReminders = streak ?? profile.streakReminders;
    profile.waterReminders = water ?? profile.waterReminders;
    await context.read<AppController>().saveProfile(profile);
  }
}

class ShareScreen extends StatefulWidget {
  const ShareScreen({super.key});
  @override
  State<ShareScreen> createState() => _ShareScreenState();
}

class _ShareScreenState extends State<ShareScreen> {
  final key = GlobalKey();
  var theme = 'dawn';

  @override
  Widget build(BuildContext context) {
    final app = context.watch<AppController>();
    final game = app.today?.game;
    return PaperScaffold(
      child: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          const Display('A card, not a confession.', size: 34),
          const SizedBox(height: 12),
          Center(
            child: RepaintBoundary(
              key: key,
              child: _Card(theme: theme, name: app.profile?.name ?? 'You', streak: game?.streakCount ?? 0, zone: game?.zoneName ?? 'Foundation', delta: app.today?.estimate?.deltaKg),
            ),
          ),
          const SizedBox(height: 12),
          Wrap(spacing: 8, children: [
            for (final item in const ['dawn', 'midnight', 'summit'])
              ChoiceChip(
                label: Text(item),
                selected: theme == item,
                onSelected: (_) {
                  if (!themeAllowed(item, app.premium)) {
                    context.push('/paywall');
                    return;
                  }
                  setState(() => theme = item);
                },
              ),
          ]),
          const SizedBox(height: 12),
          EmberButton(label: 'Share', onPressed: _share),
        ],
      ),
    );
  }

  Future<void> _share() async {
    final boundary = key.currentContext?.findRenderObject() as RenderRepaintBoundary?;
    if (boundary == null) return;
    final image = await boundary.toImage(pixelRatio: 3);
    final bytes = await image.toByteData(format: ui.ImageByteFormat.png);
    if (bytes == null) return;
    final file = File('${(await getTemporaryDirectory()).path}/perfectshape-card.png');
    await file.writeAsBytes(bytes.buffer.asUint8List());
    await SharePlus.instance.share(ShareParams(files: [XFile(file.path)], text: 'A quiet streak with PerfectShape.'));
  }
}

class _Card extends StatelessWidget {
  const _Card({required this.theme, required this.name, required this.streak, required this.zone, this.delta});
  final String theme;
  final String name;
  final int streak;
  final String zone;
  final double? delta;
  @override
  Widget build(BuildContext context) {
    final dark = theme != 'dawn';
    final bg = theme == 'summit' ? Tone.teal : dark ? Tone.ink : Tone.paper;
    final fg = dark ? Tone.cream : Tone.ink;
    return Container(
      width: 320,
      height: 460,
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(32)),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text('PERFECTSHAPE', style: TextStyle(color: fg, letterSpacing: 2, fontSize: 12, fontWeight: FontWeight.w700)),
        const Spacer(),
        Text('$streak', style: TextStyle(fontFamily: 'Syne', fontSize: 92, height: 0.85, color: theme == 'dawn' ? Tone.coral : Tone.sun, fontWeight: FontWeight.w700)),
        Text('day streak', style: TextStyle(color: fg, fontSize: 22)),
        const SizedBox(height: 12),
        Text('$name · $zone', style: TextStyle(color: fg)),
        if (delta != null) Text('${delta! <= 0 ? '' : '+'}${delta!.toStringAsFixed(1)} kg on the scale', style: TextStyle(color: fg)),
        const Spacer(),
        Text('Home. No gym. Not medical advice.', style: TextStyle(color: fg.withValues(alpha: 0.7), fontSize: 12)),
      ]),
    );
  }
}

class PhotosScreen extends StatefulWidget {
  const PhotosScreen({super.key});
  @override
  State<PhotosScreen> createState() => _PhotosScreenState();
}

class _PhotosScreenState extends State<PhotosScreen> {
  List<File> files = const [];

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<Directory> _dir() async {
    final root = await getApplicationDocumentsDirectory();
    final folder = Directory('${root.path}/progress');
    if (!folder.existsSync()) folder.createSync();
    return folder;
  }

  Future<void> _load() async {
    final folder = await _dir();
    final found = folder.listSync().whereType<File>().where((file) => file.path.endsWith('.jpg')).toList()..sort((a, b) => b.path.compareTo(a.path));
    if (mounted) setState(() => files = found);
  }

  Future<void> _add(ImageSource source) async {
    final shot = await ImagePicker().pickImage(source: source, imageQuality: 70, maxWidth: 1600);
    if (shot == null) return;
    final folder = await _dir();
    final dest = File('${folder.path}/${DateTime.now().millisecondsSinceEpoch}.jpg');
    await File(shot.path).copy(dest.path);
    await _load();
  }

  @override
  Widget build(BuildContext context) {
    return PaperScaffold(
      child: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          const Display('Mirror, optional.', size: 34),
          const Text('Photos stay on this phone. They are not uploaded with meals or the coach.'),
          const SizedBox(height: 12),
          EmberButton(label: 'Take a photo', onPressed: () => _add(ImageSource.camera)),
          const SizedBox(height: 8),
          EmberButton(label: 'Choose one', light: true, onPressed: () => _add(ImageSource.gallery)),
          const SizedBox(height: 12),
          for (final file in files)
            Padding(padding: const EdgeInsets.only(bottom: 8), child: ClipRRect(borderRadius: BorderRadius.circular(20), child: Image.file(file, height: 220, width: double.infinity, fit: BoxFit.cover))),
        ],
      ),
    );
  }
}

class LegalScreen extends StatelessWidget {
  const LegalScreen({super.key, required this.doc});
  final String doc;
  @override
  Widget build(BuildContext context) {
    final text = switch (doc) {
      'privacy' => _privacy,
      'terms' => _terms,
      _ => healthDisclaimer,
    };
    final title = switch (doc) {
      'privacy' => 'Privacy',
      'terms' => 'Terms',
      _ => 'Health',
    };
    return PaperScaffold(child: ListView(padding: const EdgeInsets.all(24), children: [Display(title, size: 36), const SizedBox(height: 12), Text(text)]));
  }
}

class MealPhotoButton extends StatelessWidget {
  const MealPhotoButton({super.key});
  @override
  Widget build(BuildContext context) {
    return TextButton(
      onPressed: () async {
        final app = context.read<AppController>();
        if (!app.premium) {
          context.push('/paywall');
          return;
        }
        final shot = await ImagePicker().pickImage(source: ImageSource.camera, imageQuality: 60, maxWidth: 1280);
        if (shot == null) return;
        final bytes = await File(shot.path).readAsBytes();
        final reply = await app.analyzePhoto(base64Encode(bytes), 'image/jpeg');
        if (!context.mounted || reply == null) return;
        final save = await showDialog<bool>(
          context: context,
          builder: (context) => AlertDialog(
            title: Text(reply.isFood ? reply.name : 'Not a meal'),
            content: Text('${reply.note}\n\n${reply.isFood ? 'About ${reply.calories} kcal. This is an estimate.' : ''}'),
            actions: [
              TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Dismiss')),
              if (reply.isFood) TextButton(onPressed: () => Navigator.pop(context, true), child: const Text('Log it')),
            ],
          ),
        );
        if (save == true) await app.addMeal(name: reply.name, calories: reply.calories, noSugar: false, source: 'photo');
      },
      child: const Text('Photograph a meal'),
    );
  }
}

const _privacy = '''
PerfectShape stores your account, body metrics, workouts, meals, weight, mood, water, and steps so the plan can follow you. Progress photos stay on the device and are not uploaded.

Meal photos are sent to the server only when you tap analyze. The image is used to estimate the meal and is not kept as a photo library. Coach messages include a small snapshot of your recent progress so replies stay relevant. That text goes through Cloudflare AI Gateway to the configured model provider. API keys never ship in the app.

Purchases are processed by Apple or Google. We store the product, expiry, platform, and the token needed to re-check the subscription. We do not sell health data.

You can delete the account in Settings. Cancel any store subscription separately. Host this same text at a public URL before you submit the app.
''';

const _terms = '''
PerfectShape Plus is an auto-renewing subscription sold by Apple on iOS and Google Play on Android. The price shown on the paywall comes from the store for your region. It renews until you cancel in your store account settings at least 24 hours before the period ends.

Free features include home plans, logging, streaks, and a small daily coach allowance. Plus adds the live coach, meal photo estimates, and calorie adjustments. Those adjustments never exceed 150 kcal and never drop below a safety floor.

The app is not medical care. See the health disclaimer. Product ids: perfectshape_plus_monthly and perfectshape_plus_yearly.
''';
