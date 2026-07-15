import 'dart:async';

import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'core/offline/background_sync.dart';
import 'core/providers.dart';
import 'core/router/app_router.dart';
import 'core/theme/app_theme.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  // Best-effort — Android/iOS only (see registerBackgroundSync's platform guard); a field worker
  // can always sync manually from the activity screen regardless of whether this succeeds.
  unawaited(registerBackgroundSync());
  runApp(const ProviderScope(child: FieldCommandApp()));
}

class FieldCommandApp extends ConsumerStatefulWidget {
  const FieldCommandApp({super.key});

  @override
  ConsumerState<FieldCommandApp> createState() => _FieldCommandAppState();
}

class _FieldCommandAppState extends ConsumerState<FieldCommandApp> {
  StreamSubscription<List<ConnectivityResult>>? _connectivitySub;

  @override
  void initState() {
    super.initState();
    // Tries a sync the moment connectivity returns, rather than waiting for WorkManager's
    // ~15-minute floor — offline items still queue safely either way, this just makes the
    // common case (a brief signal drop) feel instant instead of stalled.
    _connectivitySub = Connectivity().onConnectivityChanged.listen((results) {
      if (results.any((r) => r != ConnectivityResult.none)) {
        ref.read(syncServiceProvider).syncPending().catchError((_) {});
      }
    });
  }

  @override
  void dispose() {
    _connectivitySub?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final router = ref.watch(appRouterProvider);
    return MaterialApp.router(
      title: 'Impact Field Command',
      debugShowCheckedModeBanner: false,
      theme: buildBaseTheme(),
      routerConfig: router,
    );
  }
}
