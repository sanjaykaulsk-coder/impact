import 'package:flutter/material.dart';

/// Parses a "#RRGGBB" string from a campaign's branding theme document (spec §6). Falls back to
/// the neutral Impact green when a colour is missing — never a hard-coded per-client colour in
/// app code, only ever a fallback for the absence of one.
Color colorFromHex(String? hex, {Color fallback = const Color(0xFF1B5E3C)}) {
  if (hex == null) return fallback;
  final cleaned = hex.replaceFirst('#', '');
  final value = int.tryParse(cleaned, radix: 16);
  if (value == null) return fallback;
  return Color(0xFF000000 | value);
}

ThemeData buildBaseTheme() {
  return ThemeData(
    useMaterial3: true,
    colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xFF1B5E3C)),
    scaffoldBackgroundColor: const Color(0xFFF6F7F9),
    inputDecorationTheme: const InputDecorationTheme(
      border: OutlineInputBorder(borderRadius: BorderRadius.all(Radius.circular(10))),
      contentPadding: EdgeInsets.symmetric(horizontal: 14, vertical: 14),
    ),
    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        padding: const EdgeInsets.symmetric(vertical: 16),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
        textStyle: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
      ),
    ),
  );
}
