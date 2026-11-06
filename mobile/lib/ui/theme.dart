import 'package:flutter/material.dart';

class Tone {
  static const ink = Color(0xFF161311);
  static const inkSoft = Color(0xFF2A2420);
  static const cream = Color(0xFFF3EEE6);
  static const paper = Color(0xFFFFFBF6);
  static const coral = Color(0xFFFF5A3C);
  static const teal = Color(0xFF0E8F86);
  static const sun = Color(0xFFFFB15A);
  static const mist = Color(0xFFE7DDD2);
  static const line = Color(0xFFE3D8CC);
  static const good = Color(0xFF1E7A45);
}

ThemeData perfectTheme() {
  final base = ThemeData(useMaterial3: true, brightness: Brightness.light, scaffoldBackgroundColor: Tone.cream);
  return base.copyWith(
    colorScheme: const ColorScheme.light(primary: Tone.ink, secondary: Tone.coral, surface: Tone.paper, onSurface: Tone.ink),
    textTheme: base.textTheme.apply(fontFamily: 'PlusJakartaSans', bodyColor: Tone.ink, displayColor: Tone.ink),
    splashFactory: NoSplash.splashFactory,
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: Tone.paper,
      contentPadding: const EdgeInsets.symmetric(horizontal: 18, vertical: 18),
      border: OutlineInputBorder(borderRadius: BorderRadius.circular(18), borderSide: const BorderSide(color: Tone.line)),
      enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(18), borderSide: const BorderSide(color: Tone.line)),
      focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(18), borderSide: const BorderSide(color: Tone.ink, width: 1.4)),
    ),
  );
}

class Display extends StatelessWidget {
  const Display(this.text, {super.key, this.size = 40, this.color = Tone.ink, this.height = 0.95});
  final String text;
  final double size;
  final Color color;
  final double height;
  @override
  Widget build(BuildContext context) => Text(text, style: TextStyle(fontFamily: 'Syne', fontSize: size, height: height, fontWeight: FontWeight.w700, color: color, letterSpacing: -1.2));
}

class PaperScaffold extends StatelessWidget {
  const PaperScaffold({super.key, required this.child, this.dark = false});
  final Widget child;
  final bool dark;
  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: BoxDecoration(
        color: dark ? Tone.ink : Tone.cream,
        gradient: dark
            ? const RadialGradient(center: Alignment(-0.8, -0.9), radius: 1.2, colors: [Color(0xFF3A221C), Tone.ink])
            : const LinearGradient(begin: Alignment.topCenter, end: Alignment.bottomCenter, colors: [Color(0xFFF7F1E8), Tone.cream]),
      ),
      child: Material(
        type: MaterialType.transparency,
        child: Stack(
          children: [
            if (!dark) const Positioned(right: -80, top: -40, child: _Orb(color: Color(0x55FF5A3C), size: 240)),
            if (!dark) const Positioned(left: -90, bottom: 80, child: _Orb(color: Color(0x330E8F86), size: 220)),
            SafeArea(child: child),
          ],
        ),
      ),
    );
  }
}

class _Orb extends StatelessWidget {
  const _Orb({required this.color, required this.size});
  final Color color;
  final double size;
  @override
  Widget build(BuildContext context) => Container(width: size, height: size, decoration: BoxDecoration(shape: BoxShape.circle, color: color));
}

class EmberButton extends StatelessWidget {
  const EmberButton({super.key, required this.label, required this.onPressed, this.light = false});
  final String label;
  final VoidCallback? onPressed;
  final bool light;
  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: double.infinity,
      height: 58,
      child: FilledButton(
        onPressed: onPressed,
        style: FilledButton.styleFrom(
          backgroundColor: light ? Tone.paper : Tone.ink,
          foregroundColor: light ? Tone.ink : Tone.cream,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
          textStyle: const TextStyle(fontFamily: 'PlusJakartaSans', fontWeight: FontWeight.w700, fontSize: 16),
        ),
        child: Text(label),
      ),
    );
  }
}

class SoftCard extends StatelessWidget {
  const SoftCard({super.key, required this.child, this.color = Tone.paper, this.padding = const EdgeInsets.all(20)});
  final Widget child;
  final Color color;
  final EdgeInsets padding;
  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: padding,
      decoration: BoxDecoration(color: color, borderRadius: BorderRadius.circular(28), border: Border.all(color: color == Tone.ink ? Tone.inkSoft : Tone.line)),
      child: child,
    );
  }
}

class AvatarMark extends StatelessWidget {
  const AvatarMark({super.key, required this.level, this.size = 92});
  final int level;
  final double size;
  @override
  Widget build(BuildContext context) => CustomPaint(size: Size.square(size), painter: _AvatarPainter(level));
}

class _AvatarPainter extends CustomPainter {
  _AvatarPainter(this.level);
  final int level;
  @override
  void paint(Canvas canvas, Size size) {
    final body = Paint()..color = Tone.ink;
    final accent = Paint()..color = level >= 5 ? Tone.teal : Tone.coral;
    final center = Offset(size.width / 2, size.height / 2);
    canvas.drawCircle(center, size.width * 0.48, Paint()..color = Tone.paper);
    canvas.drawCircle(center, size.width * 0.48, Paint()..style = PaintingStyle.stroke..strokeWidth = 3..color = Tone.ink);
    canvas.drawCircle(Offset(size.width / 2, size.height * 0.34), size.width * (0.08 + (level.clamp(1, 12) * 0.004)), body);
    final shoulder = RRect.fromRectAndRadius(Rect.fromCenter(center: Offset(size.width / 2, size.height * 0.68), width: size.width * (0.28 + level.clamp(1, 12) * 0.02), height: size.height * 0.28), const Radius.circular(18));
    canvas.drawRRect(shoulder, accent);
    if (level >= 8) {
      final arc = Path()..addArc(Rect.fromCircle(center: center, radius: size.width * 0.4), -2.4, 1.4);
      canvas.drawPath(arc, Paint()..style = PaintingStyle.stroke..strokeWidth = 6..strokeCap = StrokeCap.round..color = Tone.sun);
    }
  }

  @override
  bool shouldRepaint(covariant _AvatarPainter oldDelegate) => oldDelegate.level != level;
}

class DayRing extends StatelessWidget {
  const DayRing({super.key, required this.parts});
  final List<bool> parts;
  @override
  Widget build(BuildContext context) {
    return CustomPaint(size: const Size.square(86), painter: _RingPainter(parts));
  }
}

class _RingPainter extends CustomPainter {
  _RingPainter(this.parts);
  final List<bool> parts;
  @override
  void paint(Canvas canvas, Size size) {
    final rect = Offset.zero & size;
    final paint = Paint()..style = PaintingStyle.stroke..strokeWidth = 8..strokeCap = StrokeCap.round;
    final sweep = 6.0;
    final gap = 0.35;
    var start = -1.5708;
    for (final done in parts) {
      paint.color = done ? Tone.coral : Tone.mist;
      canvas.drawArc(rect.deflate(6), start, sweep / parts.length - gap, false, paint);
      start += sweep / parts.length;
    }
  }

  @override
  bool shouldRepaint(covariant _RingPainter oldDelegate) => oldDelegate.parts != parts;
}
