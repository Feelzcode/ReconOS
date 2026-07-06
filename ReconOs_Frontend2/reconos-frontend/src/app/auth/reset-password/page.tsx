'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { resolvePublicApiUrl } from '@/lib/public-api-url';

const CSS = `
.reconos-reset{min-height:100vh;background:#F3F2EF;display:flex;align-items:center;justify-content:center;padding:24px;
  font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;color:#111827;}
.reconos-reset .card{width:100%;max-width:420px;background:#fff;border-radius:14px;padding:40px 36px;border:1px solid #E5E7EB;}
.reconos-reset .brand{display:flex;align-items:center;gap:10px;justify-content:center;margin-bottom:28px;}
.reconos-reset .mark{width:32px;height:32px;border-radius:8px;background:#2563EB;color:#fff;font-weight:900;font-size:16px;display:flex;align-items:center;justify-content:center;}
.reconos-reset .word{font-size:17px;font-weight:700;}
.reconos-reset .word span{color:#60A5FA;}
.reconos-reset h1{font-size:20px;font-weight:700;margin:0 0 8px;text-align:center;}
.reconos-reset p{font-size:14px;color:#6B7280;text-align:center;margin:0 0 24px;}
.reconos-reset label{display:block;font-size:13px;font-weight:600;color:#374151;margin-bottom:6px;}
.reconos-reset input{width:100%;padding:12px;border:1px solid #E5E7EB;border-radius:8px;font-size:14px;margin-bottom:16px;}
.reconos-reset .btn{width:100%;padding:13px;background:#2563EB;color:#fff;border:none;font-weight:700;font-size:14px;cursor:pointer;}
.reconos-reset .err{color:#DC2626;font-size:13px;margin-bottom:12px;text-align:center;}
.reconos-reset .ok{text-align:center;color:#16A34A;font-weight:600;}
`;

function ResetForm() {
  const params = useSearchParams();
  const token = params.get('token') ?? '';
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${resolvePublicApiUrl()}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Reset failed');
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Reset failed');
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <div className="reconos-reset">
        <style dangerouslySetInnerHTML={{ __html: CSS }} />
        <div className="card">
          <p className="err">Invalid reset link.</p>
          <a href="/auth">Back to sign in</a>
        </div>
      </div>
    );
  }

  return (
    <div className="reconos-reset">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="card">
        <div className="brand">
          <div className="mark">R</div>
          <div className="word">
            Recon<span>Os</span>
          </div>
        </div>
        {done ? (
          <div className="ok">
            <h1>Password updated</h1>
            <p>You can sign in with your new password.</p>
            <a className="btn" href="/auth" style={{ display: 'block', textAlign: 'center', marginTop: 16, textDecoration: 'none' }}>
              Sign in
            </a>
          </div>
        ) : (
          <>
            <h1>Reset your password</h1>
            <p>Choose a new password for your ReconOS account.</p>
            {error && <p className="err">{error}</p>}
            <form onSubmit={handleSubmit}>
              <label htmlFor="pw">New password</label>
              <input
                id="pw"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={8}
                autoComplete="new-password"
              />
              <button type="submit" className="btn" disabled={loading}>
                {loading ? 'Updating…' : 'Update password'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetForm />
    </Suspense>
  );
}
