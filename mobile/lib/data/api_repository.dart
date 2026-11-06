import 'dart:convert';

import 'package:firebase_auth/firebase_auth.dart';
import 'package:http/http.dart' as http;

import '../engine/engine.dart';
import '../models/models.dart';
import 'repository.dart';

class ApiRepository implements ShapeRepository {
  ApiRepository({required this.baseUrl, FirebaseAuth? auth, http.Client? client})
      : _auth = auth ?? FirebaseAuth.instance,
        _client = client ?? http.Client();

  final String baseUrl;
  final FirebaseAuth _auth;
  final http.Client _client;

  @override
  bool get remote => true;

  @override
  bool get signedIn => _auth.currentUser != null;

  @override
  String? get email => _auth.currentUser?.email;

  @override
  Future<void> signUp(String email, String password) => _auth.createUserWithEmailAndPassword(email: email.trim(), password: password);

  @override
  Future<void> signIn(String email, String password) => _auth.signInWithEmailAndPassword(email: email.trim(), password: password);

  @override
  Future<void> sendReset(String email) => _auth.sendPasswordResetEmail(email: email.trim());

  @override
  Future<void> signOut() => _auth.signOut();

  @override
  Future<void> deleteAccount() async {
    await _send('DELETE', '/v1/me', body: {'confirm': 'DELETE'});
    await _auth.currentUser?.delete();
  }

  @override
  Future<UserProfile> loadProfile() async {
    await _send('POST', '/v1/session');
    final body = await _send('GET', '/v1/me');
    return UserProfile.fromJson(_map(body['user']));
  }

  @override
  Future<UserProfile> saveProfile(UserProfile profile, String localDate) async {
    final body = await _send('PUT', '/v1/me', body: {...profile.toJson(), 'local_date': localDate});
    return UserProfile.fromJson(_map(body['user']));
  }

  @override
  Future<TodayBundle> today(String date) async => TodayBundle.fromJson(await _send('GET', '/v1/today?date=$date'));

  @override
  Future<ActionResult> completeWorkout({required String date, required String workoutId, required int durationSec}) async {
    final body = await _send('POST', '/v1/workouts/complete', body: {'local_date': date, 'workout_id': workoutId, 'duration_sec': durationSec});
    return _celebrate(body, fallback: 'Session logged');
  }

  @override
  Future<ActionResult> addMeal({required String date, required String name, required int calories, required bool noSugar, String source = 'manual'}) async {
    final body = await _send('POST', '/v1/meals', body: {'local_date': date, 'name': name, 'calories': calories, 'no_sugar': noSugar, 'source': source});
    return _celebrate(body, fallback: 'Meal logged');
  }

  @override
  Future<ActionResult> addWater({required String date, required int ml}) async {
    final body = await _send('POST', '/v1/water', body: {'local_date': date, 'ml': ml});
    return ActionResult(message: body['xp_gained'] == 0 ? null : 'Water goal. +${body['xp_gained']} XP');
  }

  @override
  Future<ActionResult> setMood({required String date, required int mood}) async {
    await _send('POST', '/v1/mood', body: {'local_date': date, 'mood': mood});
    return const ActionResult(message: 'Mood noted.');
  }

  @override
  Future<ActionResult> setSteps({required String date, required int steps}) async {
    final body = await _send('POST', '/v1/steps', body: {'local_date': date, 'steps': steps});
    return _celebrate(body, fallback: 'Steps logged');
  }

  @override
  Future<List<WeightEntry>> weights() async {
    final body = await _send('GET', '/v1/weight');
    return ((body['weights'] as List?) ?? const []).map((item) => WeightEntry.fromJson(_map(item))).toList();
  }

  @override
  Future<ActionResult> addWeight({required String date, required double weightKg, double? waistCm}) async {
    await _send('POST', '/v1/weight', body: {'local_date': date, 'weight_kg': weightKg, 'waist_cm': ?waistCm});
    return const ActionResult(message: 'Weight logged.');
  }

  @override
  Future<DayPlan> gentler(String date) async {
    final body = await _send('POST', '/v1/plan/gentler', body: {'local_date': date});
    return DayPlan.fromJson(_map(body['day']));
  }

  @override
  Future<CoachReply> coach({required String date, required String message, required String installId}) async {
    final body = await _send('POST', '/v1/ai/coach', body: {'local_date': date, 'message': message}, installId: installId);
    return CoachReply(reply: body['reply'] as String? ?? '', source: body['source'] as String? ?? 'fallback', entitlement: Entitlement.fromJson(_map(body['entitlement'])));
  }

  @override
  Future<AdjustReply> adjust({required String date, required String feedback, required String installId}) async {
    final body = await _send('POST', '/v1/ai/adjust-plan', body: {'local_date': date, 'feedback': feedback}, installId: installId);
    return AdjustReply(summary: body['summary'] as String? ?? '', calorieTarget: (body['calorie_target'] as num).toInt(), source: body['source'] as String? ?? 'fallback');
  }

  @override
  Future<PhotoReply> photo({required String date, required String base64, required String mediaType, required String installId}) async {
    final body = await _send('POST', '/v1/ai/meal-photo', body: {'local_date': date, 'image_base64': base64, 'media_type': mediaType}, installId: installId);
    return PhotoReply(isFood: body['is_food'] as bool? ?? false, name: body['name'] as String? ?? 'Meal', calories: (body['calories'] as num?)?.toInt() ?? 0, note: body['note'] as String? ?? '');
  }

  @override
  Future<List<ChatMessage>> history() async {
    final body = await _send('GET', '/v1/coach/history');
    return ((body['messages'] as List?) ?? const []).map((item) => ChatMessage.fromJson(_map(item))).toList();
  }

  @override
  Future<Entitlement> subscription(String date) async => Entitlement.fromJson(await _send('GET', '/v1/subscription?date=$date'));

  @override
  Future<Entitlement> verifyApple(String signedTransaction) async => Entitlement.fromJson(await _send('POST', '/v1/subscription/apple', body: {'signed_transaction': signedTransaction}));

  @override
  Future<Entitlement> verifyGoogle({required String token, required String productId}) async {
    return Entitlement.fromJson(await _send('POST', '/v1/subscription/google', body: {'purchase_token': token, 'product_id': productId}));
  }

  ActionResult _celebrate(Map<String, dynamic> body, {required String fallback}) {
    final gained = (body['xp_gained'] as num?)?.toInt() ?? 0;
    final badges = ((body['achievements_unlocked'] as List?) ?? const []).map((item) => _map(item)['title'] as String? ?? '').where((item) => item.isNotEmpty).toList();
    final game = body['gamification'] == null ? null : GameView.fromJson(_map(body['gamification']));
    if (gained <= 0 && badges.isEmpty) return const ActionResult();
    return ActionResult(
      celebration: Celebration(
        title: gained > 0 ? '+$gained XP' : fallback,
        detail: game == null ? fallback : 'Level ${game.level} · ${game.zoneName} · ${game.streakCount}-day streak',
        badges: badges,
      ),
    );
  }

  Future<Map<String, dynamic>> _send(String method, String path, {Map<String, dynamic>? body, String? installId}) async {
    final token = await _auth.currentUser?.getIdToken();
    if (token == null) throw ApiException(401, 'missing_auth', 'Sign in again.');
    final uri = Uri.parse('$baseUrl$path');
    final headers = {'Authorization': 'Bearer $token', 'Content-Type': 'application/json', 'X-Install-Id': ?installId};
    late http.Response response;
    try {
      response = await switch (method) {
        'POST' => _client.post(uri, headers: headers, body: jsonEncode(body ?? {})),
        'PUT' => _client.put(uri, headers: headers, body: jsonEncode(body ?? {})),
        'DELETE' => _client.delete(uri, headers: headers, body: jsonEncode(body ?? {})),
        _ => _client.get(uri, headers: headers),
      };
    } catch (_) {
      throw ApiException(0, 'network', 'Can\'t reach PerfectShape right now.');
    }
    final decoded = response.body.isEmpty ? <String, dynamic>{} : jsonDecode(response.body);
    final map = decoded is Map ? Map<String, dynamic>.from(decoded) : <String, dynamic>{};
    if (response.statusCode >= 400) {
      throw ApiException(response.statusCode, map['error'] as String? ?? 'error', map['message'] as String? ?? 'Something went wrong.');
    }
    return map;
  }
}

Map<String, dynamic> _map(dynamic value) => Map<String, dynamic>.from(value as Map);
