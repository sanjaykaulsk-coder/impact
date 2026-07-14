import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'auth_controller.dart';

class OtpEntryScreen extends ConsumerStatefulWidget {
  final String challengeId;
  final String mobileNumber;
  final String otpProvider;
  final String? devOtpCode;

  const OtpEntryScreen({
    super.key,
    required this.challengeId,
    required this.mobileNumber,
    required this.otpProvider,
    this.devOtpCode,
  });

  @override
  ConsumerState<OtpEntryScreen> createState() => _OtpEntryScreenState();
}

class _OtpEntryScreenState extends ConsumerState<OtpEntryScreen> {
  final _formKey = GlobalKey<FormState>();
  final _codeController = TextEditingController();
  bool _busy = false;
  String? _error;

  @override
  void dispose() {
    _codeController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final ok =
          await ref.read(authControllerProvider.notifier).verifyOtp(widget.challengeId, _codeController.text.trim());
      if (!mounted) return;
      if (ok) {
        context.go('/device-check');
      } else {
        context.go('/device-pending');
      }
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Verify OTP')),
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
                      children: [
                        Flexible(child: Text('Code sent to ${widget.mobileNumber}')),
                        if (widget.otpProvider == 'MOCK') ...[
                          const SizedBox(width: 6),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                            decoration: BoxDecoration(
                              color: const Color(0xFFFFF4D6),
                              borderRadius: BorderRadius.circular(999),
                            ),
                            child: const Text(
                              'MOCK — NO SMS SENT',
                              style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Color(0xFF8A5B00)),
                            ),
                          ),
                        ],
                      ],
                    ),
                    if (widget.devOtpCode != null) ...[
                      const SizedBox(height: 12),
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: const Color(0xFFFFF4D6),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Text(
                          'Development mode: your OTP is ${widget.devOtpCode} '
                          '(shown here only because OTP_PROVIDER=mock).',
                          style: const TextStyle(color: Color(0xFF8A5B00)),
                        ),
                      ),
                    ],
                    const SizedBox(height: 16),
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
                      controller: _codeController,
                      keyboardType: TextInputType.number,
                      maxLength: 8,
                      decoration: const InputDecoration(labelText: 'OTP code', counterText: ''),
                      validator: (value) =>
                          (value == null || value.trim().length < 4) ? 'Enter the OTP code' : null,
                    ),
                    const SizedBox(height: 16),
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton(
                        onPressed: _busy ? null : _submit,
                        child: Text(_busy ? 'Verifying…' : 'Verify & sign in'),
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
