'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { resolvePublicApiUrl } from '@/lib/public-api-url';
import { postAuthPath } from '@/lib/onboarding';

const CSS = `
.reconos-verify-email *,.reconos-verify-email *::before,.reconos-verify-email *::after{box-sizing:border-box;margin:0;padding:0}
.reconos-verify-email{
  --blue:#2563EB; --blue-light:#60A5FA; --blue-bg:#EFF6FF;
  --ink:#111827; --gray-700:#374151; --gray-500:#6B7280; --gray-400:#9CA3AF;
  --border-soft:#F0F1F3; --canvas:#F3F2EF; --danger:#DC2626; --danger-bg:#FEE2E2;
  --success:#16A34A; --success-bg:#DCFCE7;
  min-height:100vh;background:var(--canvas);
  font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;
  color:var(--ink);display:flex;align-items:center;justify-content:center;padding:24px;
}
.reconos-verify-email .card{width:100%;max-width:420px;background:#fff;border-radius:14px;padding:44px 36px 36px;text-align:center;}
.reconos-verify-email .brand{display:flex;align-items:center;gap:10px;justify-content:center;margin-bottom:32px;}
.reconos-verify-email .mark{width:32px;height:32px;border-radius:8px;background:var(--blue);color:#fff;font-weight:900;
  font-size:16px;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
.reconos-verify-email .word{font-size:17px;font-weight:700;color:var(--ink);}
.reconos-verify-email .word span{color:var(--blue-light);}
.reconos-verify-email .state{display:none;}
.reconos-verify-email .state.show{display:block;}
.reconos-verify-email .spinner{width:40px;height:40px;border-radius:50%;border:3px solid var(--blue-bg);border-top-color:var(--blue);
  margin:0 auto 22px;animation:verifySpin .8s linear infinite;}
@keyframes verifySpin{to{transform:rotate(360deg);}}
.reconos-verify-email .icon{width:56px;height:56px;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 22px;}
.reconos-verify-email .icon.success{background:var(--success-bg);}
.reconos-verify-email .icon.danger{background:var(--danger-bg);}
.reconos-verify-email h1{margin:0 0 8px;font-size:20px;font-weight:700;}
.reconos-verify-email .sub{margin:0 0 28px;font-size:14px;line-height:21px;color:var(--gray-500);}
.reconos-verify-email .sub b{color:var(--gray-700);font-weight:600;}
.reconos-verify-email .btn{
  display:inline-block;width:100%;padding:13px;font-size:14.5px;font-weight:700;color:#fff;background:var(--blue);
  border:none;cursor:pointer;text-decoration:none;box-sizing:border-box;margin-bottom:14px;
}
.reconos-verify-email .btn:hover{background:#1D4ED8;}
.reconos-verify-email .btn.secondary{background:var(--blue-light);}
.reconos-verify-email .btn.secondary:hover{background:#4A90E8;}
.reconos-verify-email .btn:disabled{opacity:.7;cursor:not-allowed;}
.reconos-verify-email .back{display:inline-flex;align-items:center;justify-content:center;gap:6px;font-size:13.5px;color:var(--gray-500);text-decoration:none;}
.reconos-verify-email .back:hover{color:var(--gray-700);}
.reconos-verify-email .footer-note{margin-top:24px;padding-top:20px;border-top:1px solid var(--border-soft);
  font-size:12px;line-height:18px;color:var(--gray-400);}
`;

type View = 'verifying' | 'success' | 'expired';

function dashboardHref(): string {
  try {
    const raw = localStorage.getItem('org');
    if (raw) return postAuthPath(JSON.parse(raw));
  } catch {
    /* ignore */
  }
  return localStorage.getItem('token') ? '/dashboard' : '/auth';
}

function VerifyForm() {
  const params = useSearchParams();
  const token = params.get('token') ?? '';
  const email = params.get('email') ?? '';
  const [view, setView] = useState<View>('verifying');
  const [resendBusy, setResendBusy] = useState(false);

  const resend = useCallback(async () => {
    if (!email || resendBusy) return;
    setResendBusy(true);
    try {
      await fetch(`${resolvePublicApiUrl()}/auth/verify-email/resend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
    } catch {
      /* best-effort */
    } finally {
      setTimeout(() => setResendBusy(false), 3000);
    }
  }, [email, resendBusy]);

  useEffect(() => {
    if (!token) {
      setView('expired');
      return;
    }

    fetch(`${resolvePublicApiUrl()}/auth/verify-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.message || 'Verification failed');
        }
        setView('success');
      })
      .catch(() => setView('expired'));
  }, [token]);

  return (
    <div className="reconos-verify-email">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="card">
        <div className="brand">
          <div className="mark">R</div>
          <div className="word">
            Recon<span>Os</span>
          </div>
        </div>

        <div className={`state${view === 'verifying' ? ' show' : ''}`}>
          <div className="spinner" />
          <h1>Verifying your email…</h1>
          <p className="sub">This will only take a moment.</p>
        </div>

        <div className={`state${view === 'success' ? ' show' : ''}`}>
          <div className="icon success">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1>Email verified</h1>
          <p className="sub">
            Your email address has been confirmed.
            <br />
            Your ReconOS account is now fully active.
          </p>
          <a href={dashboardHref()} className="btn">
            Go to dashboard
          </a>
        </div>

        <div className={`state${view === 'expired' ? ' show' : ''}`}>
          <div className="icon danger">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1>This link has expired</h1>
          <p className="sub">
            Verification links are only valid for 24 hours.
            <br />
            Request a new one to continue.
          </p>
          <button
            type="button"
            className="btn secondary"
            disabled={resendBusy || !email}
            onClick={resend}
          >
            {resendBusy ? 'Sent ✓' : 'Resend verification email'}
          </button>
          <a href="/auth" className="back">
            ← Back to sign in
          </a>
        </div>

        <p className="footer-note">If you didn&apos;t create a ReconOS account, you can safely ignore this.</p>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={null}>
      <VerifyForm />
    </Suspense>
  );
}
