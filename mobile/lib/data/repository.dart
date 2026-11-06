import '../engine/engine.dart';
import '../models/models.dart';

abstract class ShapeRepository {
  bool get remote;
  bool get signedIn;
  String? get email;
  Future<void> signUp(String email, String password);
  Future<void> signIn(String email, String password);
  Future<void> sendReset(String email);
  Future<void> signOut();
  Future<void> deleteAccount();
  Future<UserProfile> loadProfile();
  Future<UserProfile> saveProfile(UserProfile profile, String localDate);
  Future<TodayBundle> today(String date);
  Future<ActionResult> completeWorkout({required String date, required String workoutId, required int durationSec});
  Future<ActionResult> addMeal({required String date, required String name, required int calories, required bool noSugar, String source = 'manual'});
  Future<ActionResult> addWater({required String date, required int ml});
  Future<ActionResult> setMood({required String date, required int mood});
  Future<ActionResult> setSteps({required String date, required int steps});
  Future<List<WeightEntry>> weights();
  Future<ActionResult> addWeight({required String date, required double weightKg, double? waistCm});
  Future<DayPlan> gentler(String date);
  Future<CoachReply> coach({required String date, required String message, required String installId});
  Future<AdjustReply> adjust({required String date, required String feedback, required String installId});
  Future<PhotoReply> photo({required String date, required String base64, required String mediaType, required String installId});
  Future<List<ChatMessage>> history();
  Future<Entitlement> subscription(String date);
  Future<Entitlement> verifyApple(String signedTransaction);
  Future<Entitlement> verifyGoogle({required String token, required String productId});
}

class CoachReply {
  const CoachReply({required this.reply, required this.source, required this.entitlement, this.paywall = false});
  final String reply;
  final String source;
  final Entitlement entitlement;
  final bool paywall;
}

class AdjustReply {
  const AdjustReply({required this.summary, required this.calorieTarget, required this.source});
  final String summary;
  final int calorieTarget;
  final String source;
}

class PhotoReply {
  const PhotoReply({required this.isFood, required this.name, required this.calories, required this.note});
  final bool isFood;
  final String name;
  final int calories;
  final String note;
}

class ApiException implements Exception {
  ApiException(this.status, this.code, this.message);
  final int status;
  final String code;
  final String message;
  bool get paywall => status == 402;
  @override
  String toString() => message;
}
