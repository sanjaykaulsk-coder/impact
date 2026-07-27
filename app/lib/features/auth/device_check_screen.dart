import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../l10n/app_localizations.dart';
import 'auth_controller.dart';

/// The explicit "device check" step of the login flow (spec §7/§15). By the time this screen
/// shows, /auth/otp/verify has already confirmed the device is ACTIVE (a PENDING_APPROVAL device
/// never reaches this screen — the OTP screen routes those to /device-pending instead). This
/// screen surfaces that outcome to the user rather than silently skipping it, and doubles as the
/// moment the app pulls the campaign list before campaign selection.
class DeviceCheckScreen extends ConsumerStatefulWidget {
  const DeviceCheckScreen({super.key});

  @override
  ConsumerState<DeviceCheckScreen> createState() => _DeviceCheckScreenState();
}

class _DeviceCheckScreenState extends ConsumerState<DeviceCheckScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _proceed());
  }

  Future<void> _proceed() async {
    await Future.delayed(const Duration(milliseconds: 700));
    if (!mounted) return;
    final state = ref.read(authControllerProvider);
    if (state.campaigns.length == 1) {
      context.go('/home');
    } else {
      context.go('/campaign-select');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.verified_user_outlined, size: 40, color: Color(0xFF1B5E3C)),
            const SizedBox(height: 16),
            const CircularProgressIndicator(),
            const SizedBox(height: 16),
            Text(AppLocalizations.of(context)!.deviceVerifiedLoading),
          ],
        ),
      ),
    );
  }
}
