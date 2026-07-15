// Renders the real CampaignHomeScreen widget tree with a fake repository (no network, no platform
// secure storage — both already proven separately: the network/auth layer end-to-end via the live
// Linux GUI run and the web admin shell's Playwright tests against this same backend; this test's
// job is narrower — prove the screen actually binds and paints the branding data it's given).
import 'package:field_command/core/api/api_client.dart';
import 'package:field_command/core/api/device_identity.dart';
import 'package:field_command/core/api/models.dart';
import 'package:field_command/core/api/token_store.dart';
import 'package:field_command/core/providers.dart';
import 'package:field_command/core/theme/app_theme.dart';
import 'package:field_command/features/auth/auth_controller.dart';
import 'package:field_command/features/auth/auth_repository.dart';
import 'package:field_command/features/auth/auth_state.dart';
import 'package:field_command/features/execution/execution_models.dart';
import 'package:field_command/features/execution/execution_repository.dart';
import 'package:field_command/features/home/campaign_home_screen.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_test/flutter_test.dart';

// Never actually invoked (campaignBranding is overridden below, and nothing else on the
// repository is called during this render-only test) — just needs to exist to satisfy
// AuthRepository's constructor without touching a real platform plugin.
const _unusedStorage = FlutterSecureStorage();

class _FixedAuthController extends AuthController {
  _FixedAuthController(super.repository, AuthState fixedState) {
    state = fixedState;
  }
}

class _FakeAuthRepository extends AuthRepository {
  _FakeAuthRepository()
      : super(
          api: ApiClient(tokenStore: TokenStore(_unusedStorage)),
          tokenStore: TokenStore(_unusedStorage),
          deviceIdentity: DeviceIdentity(_unusedStorage),
        );

  @override
  Future<CampaignBrandingResponse> campaignBranding(String campaignId) async {
    return CampaignBrandingResponse(
      campaignId: campaignId,
      campaignName: 'Bihar Rural Van Outreach',
      clientName: 'Shakti Consumer Products',
      theme: CampaignBrandingTheme(primaryColor: '#1B5E3C', secondaryColor: '#F2A71B'),
      instructionsText: 'Report every van stop with an opening photo before starting demonstrations.',
      escalationContactName: 'Karan Malhotra',
      escalationContactPhone: '9000099999',
    );
  }
}

// No assignments queued for this render-only test — CampaignHomeScreen's assignment list simply
// renders its empty-state text, which isn't asserted on here.
class _FakeExecutionRepository extends ExecutionRepository {
  _FakeExecutionRepository() : super(api: ApiClient(tokenStore: TokenStore(_unusedStorage)));

  @override
  Future<List<MyAssignment>> myAssignments() async => const [];
}

void main() {
  setUp(() {
    // _FixedAuthController still runs through AuthController's real constructor, which fires
    // _restore() and touches secure storage once before this test's fixed state takes over —
    // stub the channel so that doesn't hang waiting for a platform response (see widget_test.dart
    // for the same pattern).
    const channel = MethodChannel('plugins.it_nomads.com/flutter_secure_storage');
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger.setMockMethodCallHandler(
      channel,
      (call) async {
        if (call.method == 'read') return null;
        if (call.method == 'readAll') return <String, String>{};
        return null;
      },
    );
  });

  testWidgets('campaign home screen binds and paints branding from the backend', (tester) async {
    final fakeRepo = _FakeAuthRepository();
    final fixedState = AuthState(
      loading: false,
      authenticated: true,
      user: MeResponse(id: 'u1', fullName: 'Rahul Kumar', preferredLanguage: 'HI', mobileNumber: '+919000000009'),
      campaigns: [
        MyCampaignSummary(
          campaignId: 'c1',
          campaignName: 'Bihar Rural Van Outreach',
          campaignStatus: 'LIVE',
          clientId: 'cl1',
          clientName: 'Shakti Consumer Products',
          roleId: 'r1',
          roleName: 'Promoter',
          roleCode: 'promoter',
        ),
      ],
      selectedCampaignId: 'c1',
    );

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          authRepositoryProvider.overrideWithValue(fakeRepo),
          authControllerProvider.overrideWith((ref) => _FixedAuthController(fakeRepo, fixedState)),
          executionRepositoryProvider.overrideWithValue(_FakeExecutionRepository()),
        ],
        child: MaterialApp(
          theme: buildBaseTheme(),
          home: const CampaignHomeScreen(),
        ),
      ),
    );
    // Bounded pumps rather than pumpAndSettle(): the CircularProgressIndicator shown while the
    // FutureBuilder is still waiting animates indefinitely, which makes pumpAndSettle() hang.
    for (var i = 0; i < 5; i++) {
      await tester.pump(const Duration(milliseconds: 100));
    }

    expect(find.text('Bihar Rural Van Outreach'), findsWidgets);
    expect(find.text('Shakti Consumer Products'), findsOneWidget);
    expect(find.text('Rahul Kumar'), findsOneWidget);
    expect(find.text('Karan Malhotra'), findsOneWidget);
    expect(
      find.text('Report every van stop with an opening photo before starting demonstrations.'),
      findsOneWidget,
    );
  });
}
