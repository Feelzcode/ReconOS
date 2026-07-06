'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { resolvePublicApiUrl } from '@/lib/public-api-url';

const CSS = `
.reconos-verify{min-height:100vh;background:#F3F2EF;display:flex;align-items:center;justify-content:center;padding:24px;
  font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;color:#111827;}
.reconos-verify .card{width:100%;max-width:420px;background:#fff;border-radius:14px;padding:40px 36px;text-align:center;border:1px solid #E5E7EB;}
.reconos-verify .brand{display:flex;align-items:center;gap:10px;justify-content:center;margin-bottom:28px;}
.reconos-verify .mark{width:32px;height:32px;border-radius:8px;background:#2563EB;color:#fff;font-weight:900;font-size:16px;display:flex;align-items:center;justify-content:center;}
.reconos-verify .word{font-size:17px;font-weight:700;}
.reconos-verify .word span{color:#60A5FA;}
.reconos-verify h1{font-size:20px;font-weight:700;margin:0 0 10px;}
.reconos-verify p{font-size:14px;line-height:21px;color:#6B7280;margin:0 0 24px;}
.reconos-verify .btn{display:inline-block;padding:12px 24px;background:#2563EB;color:#fff;font-weight:700;text-decoration:none;font-size:14px;}
.reconos-verify .ok{color:#16A34A;font-size:40px;margin-bottom:12px;}
.reconos-verify .err{color:#DC2626;font-size:14px;font-weight:600;}
`;

function VerifyForm() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get('token') ?? '';
  const [state, setState] = useState<'loading' | 'ok' | 'err'>('loading');
  const [message, setMessage] = useState('Verifying your email…');

  useEffect(() => {
    if (!token) {
      setState('err');
      setMessage('Missing verification link.');
      return;
    }
    fetch(`${resolvePublicApiUrl()}/auth/verify-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.message || 'Verification failed');
        setState('ok');
        setMessage(`Email confirmed for ${data.email ?? 'your account'}.`);
      })
      .catch((err) => {
        setState('err');
        setMessage(err instanceof Error ? err.message : 'Verification failed');
      });
  }, [token]);

  return (
    <div className="reconos-verify">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="card">
        <div className="brand">
          <div className="mark">R</div>
          <div className="word">
            Recon<span>Os</span>
          </div>
        </div>
        {state === 'loading' && (
          <>
            <h1>Verify your email</h1>
            <p>{message}</p>
          </>
        )}
        {state === 'ok' && (
          <>
            <div className="ok">✓</div>
            <h1>Email verified</h1>
            <p>{message}</p>
            <a className="btn" href="/auth">
              Continue to sign in
            </a>
          </>
        )}
        {state === 'err' && (
          <>
            <h1>Couldn&apos;t verify</h1>
            <p className="err">{message}</p>
            <a className="btn" href="/auth" style={{ marginTop: 16 }}>
              Back to sign in
            </a>
          </>
        )}
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
