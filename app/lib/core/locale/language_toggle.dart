import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../l10n/app_localizations.dart';
import 'locale_controller.dart';

/// Compact English/Hindi toggle — used inline on the mobile-entry screen (before login, so it
/// must work without any auth state) and, wrapped in a dialog, from the campaign home screen's
/// AppBar. Language names aren't translated (a language's own name is conventionally shown in
/// its own script regardless of the app's current locale).
class LanguageToggle extends ConsumerWidget {
  const LanguageToggle({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final locale = ref.watch(localeControllerProvider);
    final t = AppLocalizations.of(context)!;
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        _pill(ref, label: t.languageEnglish, code: 'en', selected: locale.languageCode == 'en'),
        const SizedBox(width: 8),
        _pill(ref, label: t.languageHindi, code: 'hi', selected: locale.languageCode == 'hi'),
      ],
    );
  }

  Widget _pill(WidgetRef ref, {required String label, required String code, required bool selected}) {
    return ChoiceChip(
      label: Text(label),
      selected: selected,
      onSelected: (_) => ref.read(localeControllerProvider.notifier).setLanguage(code),
    );
  }
}

Future<void> showLanguagePickerDialog(BuildContext context) {
  final t = AppLocalizations.of(context)!;
  return showDialog<void>(
    context: context,
    builder: (context) => AlertDialog(
      title: Text(t.languageSettingTitle),
      content: const LanguageToggle(),
    ),
  );
}
