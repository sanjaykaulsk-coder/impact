import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/locale/language_toggle.dart';
import '../../l10n/app_localizations.dart';
import 'auth_controller.dart';

class MobileEntryScreen extends ConsumerStatefulWidget {
  const MobileEntryScreen({super.key});

  @override
  ConsumerState<MobileEntryScreen> createState() => _MobileEntryScreenState();
}

class _MobileEntryScreenState extends ConsumerState<MobileEntryScreen> {
  final _formKey = GlobalKey<FormState>();
  final _mobileController = TextEditingController();
  bool _busy = false;
  String? _error;

  @override
  void dispose() {
    _mobileController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final res = await ref.read(authControllerProvider.notifier).requestOtp(_mobileController.text.trim());
      if (!mounted) return;
      context.push('/otp', extra: {
        'challengeId': res.challengeId,
        'mobileNumber': _mobileController.text.trim(),
        'otpProvider': res.otpProvider,
        'devOtpCode': res.devOtpCode,
      });
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final t = AppLocalizations.of(context)!;
    return Scaffold(
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 400),
              child: Form(
                key: _formKey,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Image.asset('assets/brand/logo.png', height: 48, semanticLabel: ''),
                        const LanguageToggle(),
                      ],
                    ),
                    const SizedBox(height: 14),
                    Text(
                      t.appTitle,
                      style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(height: 4),
                    Text(t.fieldApplicationTagline, style: TextStyle(color: Colors.grey.shade600)),
                    const SizedBox(height: 28),
                    if (_error != null) ...[
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: const Color(0xFFFDECEA),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Text(_error!, style: const TextStyle(color: Color(0xFFB3261E))),
                      ),
                      const SizedBox(height: 16),
                    ],
                    TextFormField(
                      controller: _mobileController,
                      keyboardType: TextInputType.phone,
                      maxLength: 10,
                      decoration: InputDecoration(
                        labelText: t.mobileNumberLabel,
                        hintText: t.mobileNumberHint,
                        counterText: '',
                      ),
                      validator: (value) {
                        if (value == null || !RegExp(r'^[6-9]\d{9}$').hasMatch(value)) {
                          return t.mobileNumberValidationError;
                        }
                        return null;
                      },
                    ),
                    const SizedBox(height: 20),
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton(
                        onPressed: _busy ? null : _submit,
                        child: Text(_busy ? t.sendingOtp : t.sendOtp),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
