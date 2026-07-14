import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'core/router/app_router.dart';
import 'core/theme/app_theme.dart';

void main() {
  runApp(const ProviderScope(child: FieldCommandApp()));
}

class FieldCommandApp extends ConsumerWidget {
  const FieldCommandApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final router = ref.watch(appRouterProvider);
    return MaterialApp.router(
      title: 'Impact Field Command',
      debugShowCheckedModeBanner: false,
      theme: buildBaseTheme(),
      routerConfig: router,
    );
  }
}
