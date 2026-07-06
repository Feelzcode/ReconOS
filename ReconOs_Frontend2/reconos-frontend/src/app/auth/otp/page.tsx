'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { resolvePublicApiUrl } from '@/lib/public-api-url';
import { postAuthPath } from '@/lib/onboarding';

const OTP_CSS = `
.reconos-otp *,.reconos-otp *::before,.reconos-otp *::after{box-sizing:border-box;margin:0;padding:0}
.reconos-otp{
  --blue:#2563EB; --blue-light:#60A5FA; --blue-bg:#EFF6FF;
  --ink:#111827; --gray-700:#374151; --gray-500:#6B7280; --gray-400:#9CA3AF;
  --border-soft:#F0F1F3; --canvas:#F3F2EF; --danger:#DC2626; --danger-bg:#FEE2E2;
  min-height:100vh;background:var(--canvas);
  font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;
  color:var(--ink);display:flex;align-items:center;justify-content:center;padding:24px;
}
.reconos-otp .card{width:100%;max-width:420px;background:#fff;border-radius:14px;padding:40px 36px 36px;}
.reconos-otp .brand{display:flex;align-items:center;gap:10px;justify-content:center;margin-bottom:32px;}
.reconos-otp .mark{width:32px;height:32px;border-radius:8px;background:var(--blue);color:#fff;font-weight:900;
  font-size:16px;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
.reconos-otp .word{font-size:17px;font-weight:700;color:var(--ink);}
.reconos-otp .word span{color:var(--blue-light);}
.reconos-otp h1{margin:0 0 8px;font-size:20px;font-weight:700;text-align:center;}
.reconos-otp .sub{margin:0 0 32px;font-size:14px;line-height:21px;color:var(--gray-500);text-align:center;}
.reconos-otp .sub b{color:var(--gray-700);font-weight:600;}
.reconos-otp .otp-row{display:flex;gap:10px;justify-content:center;margin-bottom:10px;}
.reconos-otp .otp-digit{
  width:48px;height:56px;text-align:center;font-size:22px;font-weight:700;
  font-family:'SFMono-Regular',Consolas,Menlo,monospace;color:var(--ink);
  border:none;border-bottom:2.5px solid #D9DBDF;background:#FAFAFA;
  outline:none;transition:border-color .15s,background .15s;
}
.reconos-otp .otp-digit:focus{border-bottom-color:var(--blue);background:var(--blue-bg);}
.reconos-otp .otp-row.error .otp-digit{border-bottom-color:var(--danger);background:var(--danger-bg);}
.reconos-otp .error-msg{display:none;align-items:center;gap:6px;justify-content:center;color:var(--danger);
  font-size:13px;font-weight:600;margin:0 0 22px;}
.reconos-otp .error-msg.show{display:flex;}
.reconos-otp .spacer{height:22px;}
.reconos-otp .btn{
  width:100%;padding:13px;font-size:14.5px;font-weight:700;color:#fff;background:var(--blue);
  border:none;cursor:pointer;margin-bottom:18px;border-radius:0;
}
.reconos-otp .btn:disabled{background:#BFDBFE;cursor:not-allowed;}
.reconos-otp .btn:hover:not(:disabled){background:#1D4ED8;}
.reconos-otp .btn.success{background:#16A34A;}
.reconos-otp .resend{text-align:center;font-size:13px;color:var(--gray-500);}
.reconos-otp .resend button{
  background:none;border:none;color:var(--blue);font-weight:600;font-size:13px;cursor:pointer;padding:0;
}
.reconos-otp .resend button:disabled{color:var(--gray-400);cursor:not-allowed;}
.reconos-otp .footer-note{margin-top:28px;padding-top:20px;border-top:1px solid var(--border-soft);
  font-size:12px;line-height:18px;color:var(--gray-400);text-align:center;}
@media (max-width:400px){
  .reconos-otp .otp-digit{width:40px;height:50px;font-size:19px;}
  .reconos-otp .otp-row{gap:7px;}
}
`;

function persistAuth(data: {
  token: string;
  refreshToken?: string;
  user: unknown;
  org: unknown;
}) {
  localStorage.setItem('token', data.token);
  if (data.refreshToken) localStorage.setItem('refreshToken', data.refreshToken);
  localStorage.setItem('user', JSON.stringify(data.user));
  localStorage.setItem('org', JSON.stringify(data.org));
  document.cookie = `token=${encodeURIComponent(data.token)}; path=/; max-age=604800; SameSite=Lax`;
  try {
    localStorage.setItem(
      'reconos-auth',
      JSON.stringify({
        state: { token: data.token, user: data.user, org: data.org },
        version: 0,
      }),
    );
  } catch {
    /* ignore */
  }
}

function OtpForm() {
  const router = useRouter();
  const params = useSearchParams();
  const otpSession = params.get('session') ?? '';
  const maskedEmail = params.get('email') ?? 'your email';

  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);
  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState(false);
  const [errorMsg, setErrorMsg] = useState('That code didn’t match. Try again.');
  const [submitting, setSubmitting] = useState(false);
  const [verified, setVerified] = useState(false);
  const [seconds, setSeconds] = useState(30);
  const [resendEnabled, setResendEnabled] = useState(false);

  useEffect(() => {
    if (!otpSession) {
      router.replace('/auth');
    }
  }, [otpSession, router]);

  useEffect(() => {
    if (seconds <= 0) {
      setResendEnabled(true);
      return;
    }
    const t = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [seconds]);

  const codeComplete = digits.every((d) => d.length === 1);

  function updateDigit(index: number, value: string) {
    const ch = value.replace(/[^0-9]/g, '').slice(0, 1);
    setDigits((prev) => {
      const next = [...prev];
      next[index] = ch;
      return next;
    });
    setError(false);
    if (ch && index < 5) inputsRef.current[index + 1]?.focus();
  }

  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault();
    const text = (e.clipboardData.getData('text') || '').replace(/[^0-9]/g, '').slice(0, 6);
    if (!text) return;
    const next = text.split('').concat(Array(6).fill('')).slice(0, 6);
    setDigits(next);
    const focusIdx = Math.min(text.length, 5);
    inputsRef.current[focusIdx]?.focus();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!codeComplete || submitting) return;

    setSubmitting(true);
    try {
      const res = await fetch(`${resolvePublicApiUrl()}/auth/otp/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ otpSession, code: digits.join('') }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || 'That code didn’t match. Try again.');
      }
      const data = await res.json();
      persistAuth(data);
      setVerified(true);
      setTimeout(() => {
        router.replace(postAuthPath(data.org));
      }, 900);
    } catch (err) {
      setError(true);
      setErrorMsg(err instanceof Error ? err.message : 'That code didn’t match. Try again.');
      setDigits(['', '', '', '', '', '']);
      inputsRef.current[0]?.focus();
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResend() {
    if (!resendEnabled) return;
    setResendEnabled(false);
    setSeconds(30);
    setDigits(['', '', '', '', '', '']);
    setError(false);
    inputsRef.current[0]?.focus();
    try {
      const res = await fetch(`${resolvePublicApiUrl()}/auth/otp/resend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ otpSession }),
      });
      const data = await res.json().catch(() => ({}));
      if (data.otpSession) {
        const q = new URLSearchParams({
          session: data.otpSession,
          email: data.maskedEmail || maskedEmail,
        });
        router.replace('/auth/otp?' + q.toString());
      }
    } catch {
      /* ignore — user can retry */
    }
  }

  return (
    <div className="reconos-otp">
      <style dangerouslySetInnerHTML={{ __html: OTP_CSS }} />
      <div className="card">
        <div className="brand">
          <div className="mark">R</div>
          <div className="word">
            Recon<span>Os</span>
          </div>
        </div>

        <h1>Verify your identity</h1>
        <p className="sub">
          Enter the 6-digit code sent to
          <br />
          <b>{maskedEmail}</b>
        </p>

        <form onSubmit={handleSubmit} noValidate>
          <div className={`otp-row${error ? ' error' : ''}`}>
            {digits.map((digit, i) => (
              <input
                key={i}
                ref={(el) => {
                  inputsRef.current[i] = el;
                }}
                className="otp-digit"
                inputMode="numeric"
                maxLength={1}
                autoComplete={i === 0 ? 'one-time-code' : 'off'}
                aria-label={`Digit ${i + 1}`}
                value={digit}
                onChange={(e) => updateDigit(i, e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Backspace' && !digit && i > 0) {
                    inputsRef.current[i - 1]?.focus();
                  }
                }}
                onPaste={handlePaste}
              />
            ))}
          </div>
          <p className={`error-msg${error ? ' show' : ''}`}>{errorMsg}</p>
          <div className="spacer" />
          <button
            type="submit"
            className={`btn${verified ? ' success' : ''}`}
            disabled={!codeComplete || submitting || verified}
          >
            {verified ? 'Verified ✓' : submitting ? 'Verifying…' : 'Verify code'}
          </button>
        </form>

        <p className="resend">
          Didn’t get a code?{' '}
          {resendEnabled ? (
            <button type="button" onClick={handleResend}>
              Resend code
            </button>
          ) : (
            <button type="button" disabled>
              Resend in {seconds}s
            </button>
          )}
        </p>

        <p className="footer-note">
          This code expires in 10 minutes. Never share it with anyone —
          <br />
          ReconOS will never ask you for this code.
        </p>
      </div>
    </div>
  );
}

export default function OtpPage() {
  return (
    <Suspense fallback={null}>
      <OtpForm />
    </Suspense>
  );
}
