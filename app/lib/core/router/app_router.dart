import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../features/auth/auth_controller.dart';
import '../../features/auth/device_check_screen.dart';
import '../../features/auth/device_pending_screen.dart';
import '../../features/auth/mobile_entry_screen.dart';
import '../../features/auth/otp_entry_screen.dart';
import '../../features/campaign_select/campaign_select_screen.dart';
import '../../features/execution/activity_detail_screen.dart';
import '../../features/execution/camera_capture_screen.dart';
import '../../features/execution/execution_models.dart';
import '../../features/execution/milestone_form_screen.dart';
import '../../features/home/campaign_home_screen.dart';
import '../../features/map/route_map_screen.dart';

/// Bridges Riverpod auth-state changes into GoRouter's redirect re-evaluation.
class _AuthListenable extends ChangeNotifier {
  _AuthListenable(Ref ref) {
    ref.listen(authControllerProvider, (_, _) => notifyListeners());
  }
}

final appRouterProvider = Provider<GoRouter>((ref) {
  return GoRouter(
    initialLocation: '/login',
    refreshListenable: _AuthListenable(ref),
    redirect: (context, state) {
      final auth = ref.read(authControllerProvider);
      final loggingIn = state.matchedLocation == '/login' || state.matchedLocation == '/otp';
      final deviceFlow = state.matchedLocation == '/device-check' || state.matchedLocation == '/device-pending';

      if (auth.loading) return null;
      if (!auth.authenticated && !loggingIn && !deviceFlow) return '/login';
      if (auth.authenticated && loggingIn) return '/campaign-select';
      return null;
    },
    routes: [
      GoRoute(path: '/login', builder: (context, state) => const MobileEntryScreen()),
      GoRoute(
        path: '/otp',
        builder: (context, state) {
          final extra = state.extra as Map<String, dynamic>;
          return OtpEntryScreen(
            challengeId: extra['challengeId'] as String,
            mobileNumber: extra['mobileNumber'] as String,
            otpProvider: extra['otpProvider'] as String,
            devOtpCode: extra['devOtpCode'] as String?,
          );
        },
      ),
      GoRoute(path: '/device-check', builder: (context, state) => const DeviceCheckScreen()),
      GoRoute(path: '/device-pending', builder: (context, state) => const DevicePendingScreen()),
      GoRoute(path: '/campaign-select', builder: (context, state) => const CampaignSelectScreen()),
      GoRoute(path: '/home', builder: (context, state) => const CampaignHomeScreen()),
      GoRoute(
        path: '/route-map',
        builder: (context, state) {
          final extra = state.extra as Map<String, dynamic>;
          return RouteMapScreen(
            campaignId: extra['campaignId'] as String,
            userId: extra['userId'] as String,
          );
        },
      ),
      GoRoute(
        path: '/activity/:assignmentId',
        builder: (context, state) => ActivityDetailScreen(assignmentId: state.pathParameters['assignmentId']!),
        routes: [
          GoRoute(
            path: 'camera',
            builder: (context, state) {
              final extra = state.extra as Map<String, dynamic>;
              return CameraCaptureScreen(
                activityInstanceId: extra['activityInstanceId'] as String,
                campaignId: extra['campaignId'] as String,
              );
            },
          ),
          GoRoute(
            path: 'form',
            builder: (context, state) {
              final extra = state.extra as Map<String, dynamic>;
              return MilestoneFormScreen(
                activityInstanceId: extra['activityInstanceId'] as String,
                campaignId: extra['campaignId'] as String,
                milestone: extra['milestone'] as Milestone,
              );
            },
          ),
        ],
      ),
    ],
  );
});
