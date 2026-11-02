import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class AppColors {
  // Primary palette — deep navy
  static const navy      = Color(0xFF1E3A8A);
  static const navyMid   = Color(0xFF2563EB);
  static const navyLight = Color(0xFFDBEAFE);

  // Accent — emerald
  static const emerald      = Color(0xFF10B981);
  static const emeraldDark  = Color(0xFF059669);
  static const emeraldLight = Color(0xFFD1FAE5);

  // Surface
  static const white      = Color(0xFFFFFFFF);
  static const bg         = Color(0xFFF1F5F9);
  static const surface    = Color(0xFFFFFFFF);
  static const surfaceAlt = Color(0xFFF8FAFC);

  // Border & divider
  static const border  = Color(0xFFE2E8F0);
  static const divider = Color(0xFFF1F5F9);

  // Text
  static const textPrimary   = Color(0xFF0F172A);
  static const textSecondary = Color(0xFF64748B);
  static const textMuted     = Color(0xFF94A3B8);

  // Status
  static const success = Color(0xFF10B981);
  static const danger  = Color(0xFFEF4444);
  static const warning = Color(0xFFF59E0B);
  static const primary = navy;

  // Module colors
  static const rdColor     = Color(0xFF1E3A8A);
  static const savingColor = Color(0xFF10B981);
  static const loanColor   = Color(0xFFD97706);

  // Module gradients
  static LinearGradient get rdGradient => const LinearGradient(
    colors: [Color(0xFF1E3A8A), Color(0xFF2563EB)],
    begin: Alignment.topLeft, end: Alignment.bottomRight,
  );
  static LinearGradient get savingGradient => const LinearGradient(
    colors: [Color(0xFF059669), Color(0xFF10B981)],
    begin: Alignment.topLeft, end: Alignment.bottomRight,
  );
  static LinearGradient get loanGradient => const LinearGradient(
    colors: [Color(0xFFB45309), Color(0xFFD97706)],
    begin: Alignment.topLeft, end: Alignment.bottomRight,
  );
  static LinearGradient get primaryGradient => const LinearGradient(
    colors: [Color(0xFF1E3A8A), Color(0xFF2563EB)],
    begin: Alignment.topLeft, end: Alignment.bottomRight,
  );
  static LinearGradient get heroGradient => const LinearGradient(
    colors: [Color(0xFF1E3A8A), Color(0xFF1D4ED8), Color(0xFF2563EB)],
    begin: Alignment.topLeft, end: Alignment.bottomRight,
  );

  // Card decoration
  static BoxDecoration card({double radius = 16, Color? borderColor, Color? color}) => BoxDecoration(
    color: color ?? white,
    borderRadius: BorderRadius.circular(radius),
    border: Border.all(color: borderColor ?? border, width: 1),
    boxShadow: const [
      BoxShadow(color: Color(0x0A000000), blurRadius: 8, offset: Offset(0, 2)),
      BoxShadow(color: Color(0x05000000), blurRadius: 2, offset: Offset(0, 1)),
    ],
  );

  // Alias used by widgets that relied on glassCard
  static BoxDecoration glassCard({double radius = 16, Color? borderColor}) =>
      card(radius: radius, borderColor: borderColor);
}

class AppTheme {
  static ThemeData light() => ThemeData(
    useMaterial3: true,
    brightness: Brightness.light,
    scaffoldBackgroundColor: AppColors.bg,
    colorScheme: ColorScheme.fromSeed(
      seedColor: AppColors.navy,
      brightness: Brightness.light,
      primary: AppColors.navy,
      secondary: AppColors.emerald,
      surface: AppColors.surface,
    ),
    textTheme: GoogleFonts.dmSansTextTheme().copyWith(
      displayLarge:  GoogleFonts.dmSans(fontSize: 28, fontWeight: FontWeight.w700, color: AppColors.textPrimary),
      displayMedium: GoogleFonts.dmSans(fontSize: 22, fontWeight: FontWeight.w700, color: AppColors.textPrimary),
      headlineLarge: GoogleFonts.dmSans(fontSize: 20, fontWeight: FontWeight.w600, color: AppColors.textPrimary),
      headlineMedium:GoogleFonts.dmSans(fontSize: 17, fontWeight: FontWeight.w600, color: AppColors.textPrimary),
      titleLarge:    GoogleFonts.dmSans(fontSize: 15, fontWeight: FontWeight.w600, color: AppColors.textPrimary),
      titleMedium:   GoogleFonts.dmSans(fontSize: 14, fontWeight: FontWeight.w500, color: AppColors.textPrimary),
      bodyLarge:     GoogleFonts.dmSans(fontSize: 14, color: AppColors.textSecondary),
      bodyMedium:    GoogleFonts.dmSans(fontSize: 13, color: AppColors.textSecondary),
      bodySmall:     GoogleFonts.dmSans(fontSize: 11, color: AppColors.textMuted),
      labelLarge:    GoogleFonts.dmSans(fontSize: 13, fontWeight: FontWeight.w600),
      labelSmall:    GoogleFonts.dmSans(fontSize: 10, letterSpacing: 0.5, color: AppColors.textMuted),
    ),
    appBarTheme: AppBarTheme(
      backgroundColor: AppColors.navy,
      foregroundColor: Colors.white,
      elevation: 0,
      centerTitle: false,
      titleTextStyle: GoogleFonts.dmSans(fontSize: 16, fontWeight: FontWeight.w600, color: Colors.white),
    ),
    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        backgroundColor: AppColors.navy,
        foregroundColor: Colors.white,
        minimumSize: const Size(double.infinity, 52),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        elevation: 0,
        textStyle: GoogleFonts.dmSans(fontSize: 15, fontWeight: FontWeight.w600),
      ),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: AppColors.surfaceAlt,
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AppColors.border)),
      enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AppColors.border)),
      focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AppColors.navy, width: 1.5)),
      errorBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AppColors.danger)),
      hintStyle: GoogleFonts.dmSans(fontSize: 13, color: AppColors.textMuted),
      labelStyle: GoogleFonts.dmSans(fontSize: 13, color: AppColors.textSecondary),
    ),
    bottomSheetTheme: const BottomSheetThemeData(
      backgroundColor: AppColors.white,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
    ),
    snackBarTheme: SnackBarThemeData(
      backgroundColor: AppColors.textPrimary,
      contentTextStyle: GoogleFonts.dmSans(color: Colors.white, fontSize: 13),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      behavior: SnackBarBehavior.floating,
    ),
  );
}
