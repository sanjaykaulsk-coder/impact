import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'auth_controller.dart';

/// Shown when device binding refuses this device (spec §7: "device-change approval" — the account
/// already has MAX_ACTIVE_DEVICES_PER_USER active devices). This state is real, not decorative:
/// the backend has already registered the device as PENDING_APPROVAL; an administrator approving
/// it is a feature module beyond Phase C's foundation scope (see docs/STATE.md).
class DevicePendingScreen extends ConsumerWidget {
  const DevicePendingScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final message = ref.watch(authControllerProvider).devicePendingMessage ??
        'This device needs approval before it can be used.';
    return Scaffold(
      body: SafeArea(
        child: Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 420),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(Icons.pending_actions, size: 48, color: Color(0xFF8A5B00)),
                  const SizedBox(height: 16),
                  const Text(
                    'Device pending approval',
                    style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 12),
                  Text(message, textAlign: TextAlign.center, style: TextStyle(color: Colors.grey.shade700)),
                  const SizedBox(height: 24),
                  ElevatedButton(
                    onPressed: () {
                      ref.read(authControllerProvider.notifier).clearDevicePending();
                      context.go('/login');
                    },
                    child: const Text('Back to login'),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
