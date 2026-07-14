'use client';

import { api, tokenStore } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';

export default function LoginPage() {
  const router = useRouter();
  const { refresh } = useAuth();

  const [step, setStep] = useState<'mobile' | 'otp'>('mobile');
  const [mobileNumber, setMobileNumber] = useState('');
  const [code, setCode] = useState('');
  const [challengeId, setChallengeId] = useState('');
  const [devOtpCode, setDevOtpCode] = useState<string | null>(null);
  const [otpProvider, setOtpProvider] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submitMobile(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await api.requestOtp(mobileNumber.trim());
      setChallengeId(res.challengeId);
      setDevOtpCode(res.devOtpCode ?? null);
      setOtpProvider(res.otpProvider);
      setStep('otp');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send OTP');
    } finally {
      setBusy(false);
    }
  }

  async function submitOtp(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await api.verifyOtp(challengeId, code.trim());
      tokenStore.set(res);
      await refresh();
      router.replace('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Incorrect OTP');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="centered-page">
      <div className="card">
        <img src="/brand/logo.png" alt="" width={56} height={49} className="brand-mark" />
        <h1>Impact Field Command</h1>
        <p className="subtitle">Admin &amp; supervisor portal</p>

        {error && <div className="error-banner">{error}</div>}

        {step === 'mobile' && (
          <form onSubmit={submitMobile}>
            <div className="field">
              <label htmlFor="mobile">Mobile number</label>
              <input
                id="mobile"
                inputMode="numeric"
                placeholder="10-digit mobile number"
                value={mobileNumber}
                onChange={(e) => setMobileNumber(e.target.value)}
                pattern="[6-9][0-9]{9}"
                maxLength={10}
                required
                autoFocus
              />
            </div>
            <button className="btn-primary" disabled={busy} type="submit">
              {busy ? 'Sending OTP…' : 'Send OTP'}
            </button>
          </form>
        )}

        {step === 'otp' && (
          <form onSubmit={submitOtp}>
            <p className="subtitle" style={{ marginBottom: 12 }}>
              Code sent to {mobileNumber}
              {otpProvider === 'MOCK' && <span className="mock-badge">MOCK — NO SMS SENT</span>}
            </p>
            {devOtpCode && (
              <div className="error-banner" style={{ background: '#fff4d6', color: '#8a5b00', borderColor: '#f0d68a' }}>
                Development mode: your OTP is <strong>{devOtpCode}</strong> (shown here only because
                OTP_PROVIDER=mock — never happens with a real SMS provider).
              </div>
            )}
            <div className="field">
              <label htmlFor="code">OTP code</label>
              <input
                id="code"
                inputMode="numeric"
                placeholder="6-digit code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                maxLength={8}
                required
                autoFocus
              />
            </div>
            <button className="btn-primary" disabled={busy} type="submit">
              {busy ? 'Verifying…' : 'Verify & sign in'}
            </button>
            <button
              type="button"
              className="btn-secondary"
              style={{ width: '100%', marginTop: 10 }}
              onClick={() => setStep('mobile')}
            >
              Use a different number
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
