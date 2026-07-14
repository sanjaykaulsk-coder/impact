// Widget test for the Phase C shell: verifies the app boots to the mobile-entry login screen and
// that client-side validation rejects an invalid mobile number before any network call is made.
import 'package:field_command/main.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  setUp(() {
    // flutter_secure_storage talks to the platform over a MethodChannel that doesn't exist in
    // the widget-test host — stub it to behave like empty storage (no saved tokens), so the app
    // deterministically boots to the logged-out /login route without touching a real plugin.
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

  testWidgets('boots to the mobile-entry login screen', (tester) async {
    await tester.pumpWidget(const ProviderScope(child: FieldCommandApp()));
    await tester.pumpAndSettle();

    expect(find.text('Impact Field Command'), findsOneWidget);
    expect(find.text('Send OTP'), findsOneWidget);
  });

  testWidgets('rejects an invalid mobile number before calling the API', (tester) async {
    await tester.pumpWidget(const ProviderScope(child: FieldCommandApp()));
    await tester.pumpAndSettle();

    await tester.enterText(find.byType(TextFormField), '123');
    await tester.tap(find.text('Send OTP'));
    await tester.pumpAndSettle();

    expect(find.text('Enter a valid 10-digit mobile number'), findsOneWidget);
  });
}
