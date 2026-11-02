import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'theme.dart';

// ── Screen header bar ─────────────────────────────────────────────────────────

class ScreenHeader extends StatelessWidget {
  final String title, subtitle;
  final LinearGradient gradient;
  final IconData icon;
  final int collected, total;
  const ScreenHeader({super.key, required this.title, required this.subtitle, required this.gradient, required this.icon, required this.collected, required this.total});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(16, 16, 20, 16),
      decoration: BoxDecoration(
        gradient: gradient,
        boxShadow: const [BoxShadow(color: Color(0x1A000000), blurRadius: 8, offset: Offset(0, 2))],
      ),
      child: SafeArea(
        bottom: false,
        child: Row(
          children: [
            GestureDetector(
              onTap: () => Navigator.pop(context),
              child: Container(
                width: 38, height: 38,
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.2),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: const Icon(Icons.arrow_back_ios_rounded, color: Colors.white, size: 16),
              ),
            ),
            const SizedBox(width: 12),
            Container(
              width: 40, height: 40,
              decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.2), borderRadius: BorderRadius.circular(12)),
              child: Icon(icon, color: Colors.white, size: 20),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(title,    style: GoogleFonts.dmSans(fontSize: 16, fontWeight: FontWeight.w700, color: Colors.white)),
                Text(subtitle, style: GoogleFonts.dmSans(fontSize: 11, color: Colors.white.withValues(alpha: 0.8))),
              ]),
            ),
            Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
              Text('$collected/$total', style: GoogleFonts.dmSans(fontSize: 17, fontWeight: FontWeight.w700, color: Colors.white)),
              Text('collected', style: GoogleFonts.dmSans(fontSize: 10, color: Colors.white.withValues(alpha: 0.8))),
            ]),
          ],
        ),
      ),
    );
  }
}

// ── Avatar ────────────────────────────────────────────────────────────────────

class AccountAvatar extends StatelessWidget {
  final String name;
  final Color color;
  const AccountAvatar({super.key, required this.name, required this.color});

  @override
  Widget build(BuildContext context) {
    final initials = name.trim().split(' ').where((p) => p.isNotEmpty).take(2).map((p) => p[0].toUpperCase()).join();
    return Container(
      width: 42, height: 42,
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        shape: BoxShape.circle,
        border: Border.all(color: color.withValues(alpha: 0.3)),
      ),
      child: Center(child: Text(initials, style: GoogleFonts.dmSans(fontSize: 14, fontWeight: FontWeight.w700, color: color))),
    );
  }
}

// ── Info chip ─────────────────────────────────────────────────────────────────

class InfoChip extends StatelessWidget {
  final String label;
  final Color  color;
  const InfoChip(this.label, this.color, {super.key});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 3),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: color.withValues(alpha: 0.3)),
      ),
      child: Text(label, style: GoogleFonts.dmSans(fontSize: 10, color: color, fontWeight: FontWeight.w600)),
    );
  }
}

// ── Utility ───────────────────────────────────────────────────────────────────

String fmtAmount(double v) => v >= 1000 ? '${(v / 1000).toStringAsFixed(1)}K' : v.toStringAsFixed(0);
