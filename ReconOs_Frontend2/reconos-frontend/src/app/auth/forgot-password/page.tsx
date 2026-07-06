'use client';

import { FormEvent, useState } from 'react';
import { resolvePublicApiUrl } from '@/lib/public-api-url';

const CSS = `
.reconos-forgot *,.reconos-forgot *::before,.reconos-forgot *::after{box-sizing:border-box;margin:0;padding:0}
.reconos-forgot{
  --blue:#2563EB; --blue-light:#60A5FA; --blue-bg:#EFF6FF;
  --ink:#111827; --gray-700:#374151; --gray-500:#6B7280; --gray-400:#9CA3AF;
  --border-soft:#F0F1F3; --canvas:#F3F2EF; --danger:#DC2626; --success:#16A34A; --success-bg:#DCFCE7;
  min-height:100vh;background:var(--canvas);
  font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;
  color:var(--ink);display:flex;align-items:center;justify-content:center;padding:24px;
}
.reconos-forgot .card{width:100%;max-width:420px;background:#fff;border-radius:14px;padding:40px 36px 36px;}
.reconos-forgot .brand{display:flex;align-items:center;gap:10px;justify-content:center;margin-bottom:32px;}
.reconos-forgot .mark{width:32px;height:32px;border-radius:8px;background:var(--blue);color:#fff;font-weight:900;
  font-size:16px;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
.reconos-forgot .word{font-size:17px;font-weight:700;color:var(--ink);}
.reconos-forgot .word span{color:var(--blue-light);}
.reconos-forgot h1{margin:0 0 8px;font-size:20px;font-weight:700;text-align:center;}
.reconos-forgot .sub{margin:0 0 28px;font-size:14px;line-height:21px;color:var(--gray-500);text-align:center;}
.reconos-forgot label{display:block;font-size:13px;font-weight:600;color:var(--gray-700);margin-bottom:6px;}
.reconos-forgot .field{margin-bottom:8px;}
.reconos-forgot input[type="email"]{
  width:100%;padding:12px 14px;font-size:14.5px;color:var(--ink);
  border:none;border-bottom:2.5px solid #D9DBDF;background:#FAFAFA;outline:none;
  transition:border-color .15s,background .15s;font-family:inherit;
}
.reconos-forgot input[type="email"]:focus{border-bottom-color:var(--blue);background:var(--blue-bg);}
.reconos-forgot input[type="email"].error{border-bottom-color:var(--danger);}
.reconos-forgot .field-error{display:none;color:var(--danger);font-size:12.5px;font-weight:600;margin:6px 0 0;}
.reconos-forgot .field-error.show{display:block;}
.reconos-forgot .btn{
  width:100%;padding:13px;font-size:14.5px;font-weight:700;color:#fff;background:var(--blue);
  border:none;cursor:pointer;margin-top:22px;margin-bottom:20px;
}
.reconos-forgot .btn:hover{background:#1D4ED8;}
.reconos-forgot .btn:disabled{opacity:.7;cursor:not-allowed;}
.reconos-forgot .back{display:flex;align-items:center;justify-content:center;gap:6px;font-size:13.5px;color:var(--gray-500);text-decoration:none;}
.reconos-forgot .back:hover{color:var(--gray-700);}
.reconos-forgot .footer-note{margin-top:28px;padding-top:20px;border-top:1px solid var(--border-soft);
  font-size:12px;line-height:18px;color:var(--gray-400);text-align:center;}
.reconos-forgot .overlay{
  display:none;position:fixed;inset:0;background:rgba(17,24,39,.45);
  align-items:center;justify-content:center;padding:24px;z-index:10;
}
.reconos-forgot .overlay.show{display:flex;}
.reconos-forgot .modal{
  width:100%;max-width:380px;background:#fff;border-radius:14px;padding:32px 30px 28px;
  text-align:center;position:relative;animation:modalIn .18s ease-out;
}
@keyframes modalIn{from{opacity:0;transform:translateY(6px) scale(.98);}to{opacity:1;transform:none;}}
.reconos-forgot .modal-close{
  position:absolute;top:14px;right:14px;width:28px;height:28px;border:none;background:none;
  color:var(--gray-400);cursor:pointer;font-size:18px;line-height:1;
}
.reconos-forgot .modal-close:hover{color:var(--gray-700);}
.reconos-forgot .modal-icon{width:52px;height:52px;border-radius:50%;background:var(--success-bg);display:flex;align-items:center;
  justify-content:center;margin:0 auto 18px;}
.reconos-forgot .modal h2{margin:0 0 8px;font-size:18px;font-weight:700;}
.reconos-forgot .modal p{margin:0 0 24px;font-size:14px;line-height:21px;color:var(--gray-500);}
.reconos-forgot .modal p b{color:var(--gray-700);font-weight:600;}
.reconos-forgot .modal .btn{margin-top:0;margin-bottom:14px;}
.reconos-forgot .resend-line{font-size:13px;color:var(--gray-500);margin-top:4px;}
.reconos-forgot .resend-line button{background:none;border:none;color:var(--blue);font-weight:600;font-size:13px;cursor:pointer;padding:0;}
.reconos-forgot .resend-line button:disabled{color:var(--gray-400);cursor:not-allowed;}
`;

function isValidEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [sentTo, setSentTo] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [resendBusy, setResendBusy] = useState(false);

  async function sendReset(target: string) {
    await fetch(`${resolvePublicApiUrl()}/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: target }),
    });
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const value = email.trim();
    if (!isValidEmail(value)) {
      setEmailError(true);
      return;
    }
    setEmailError(false);
    setSubmitting(true);
    try {
      await sendReset(value);
      setSentTo(value);
      setModalOpen(true);
    } catch {
      setSentTo(value);
      setModalOpen(true);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResend() {
    if (!sentTo || resendBusy) return;
    setResendBusy(true);
    try {
      await sendReset(sentTo);
    } catch {
      /* ignore */
    } finally {
      setTimeout(() => setResendBusy(false), 3000);
    }
  }

  return (
    <div className="reconos-forgot">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="card">
        <div className="brand">
          <div className="mark">R</div>
          <div className="word">
            Recon<span>Os</span>
          </div>
        </div>

        <h1>Forgot your password?</h1>
        <p className="sub">
          Enter the email associated with your account and
          <br />
          we&apos;ll send you a link to reset your password.
        </p>

        <form onSubmit={handleSubmit} noValidate>
          <div className="field">
            <label htmlFor="email">Email address</label>
            <input
              type="email"
              id="email"
              placeholder="you@company.com"
              autoComplete="email"
              value={email}
              className={emailError ? 'error' : ''}
              onChange={(e) => {
                setEmail(e.target.value);
                setEmailError(false);
              }}
            />
            <p className={`field-error${emailError ? ' show' : ''}`}>Enter a valid email address.</p>
          </div>
          <button type="submit" className="btn" disabled={submitting}>
            {submitting ? 'Sending…' : 'Send reset link'}
          </button>
        </form>

        <a href="/auth" className="back">
          ← Back to sign in
        </a>

        <p className="footer-note">
          This link expires in 30 minutes. If you don&apos;t see the email, check
          <br />
          your spam folder or try again with a different address.
        </p>
      </div>

      <div
        className={`overlay${modalOpen ? ' show' : ''}`}
        onClick={(e) => {
          if (e.target === e.currentTarget) setModalOpen(false);
        }}
      >
        <div className="modal">
          <button type="button" className="modal-close" aria-label="Close" onClick={() => setModalOpen(false)}>
            ✕
          </button>
          <div className="modal-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2>Check your email</h2>
          <p>
            We&apos;ve sent a password reset link to
            <br />
            <b>{sentTo}</b>. It expires in 30 minutes — if you don&apos;t see it, check your spam folder.
          </p>
          <button type="button" className="btn" onClick={() => setModalOpen(false)}>
            Done
          </button>
          <p className="resend-line">
            Didn&apos;t get it?{' '}
            <button type="button" disabled={resendBusy} onClick={handleResend}>
              {resendBusy ? 'Sent again ✓' : 'Resend link'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
