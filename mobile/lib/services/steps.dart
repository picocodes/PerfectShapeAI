import 'package:health/health.dart';

class StepReader {
  final Health _health = Health();
  var _configured = false;

  Future<int?> today() async {
    try {
      if (!_configured) {
        await _health.configure();
        _configured = true;
      }
      final granted = await _health.requestAuthorization(const [HealthDataType.STEPS]);
      if (!granted) return null;
      final now = DateTime.now();
      final start = DateTime(now.year, now.month, now.day);
      return await _health.getTotalStepsInInterval(start, now);
    } catch (_) {
      return null;
    }
  }
}
