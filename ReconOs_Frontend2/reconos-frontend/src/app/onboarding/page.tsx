'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import { api } from '@/lib/api';
import { INDUSTRY_TEMPLATES, type IndustryTemplateKey } from '@/lib/merchant-labels';
import { needsOnboarding } from '@/lib/onboarding';
import { cn } from '@/lib/utils';

const TEMPLATE_ICONS: Record<IndustryTemplateKey, string> = {
  education: '🎓',
  property: '🏢',
  healthcare: '🏥',
  logistics: '🚚',
  custom: '✦',
};

type Phase = 'loading' | 'ready' | 'submitting' | 'done';

export default function OnboardingPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">
          Loading…
        </div>
      }
    >
      <OnboardingContent />
    </Suspense>
  );
}

function OnboardingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const changeMode = searchParams.get('change') === '1';
  const { token, org, hydrateFromStorage, updateOrg } = useAuthStore();
  const [authChecked, setAuthChecked] = useState(false);
  const [phase, setPhase] = useState<Phase>('loading');
  const [selected, setSelected] = useState<IndustryTemplateKey>(
    (org?.industryTemplate as IndustryTemplateKey) || 'education',
  );
  const [customCustomer, setCustomCustomer] = useState('');
  const [customInvoice, setCustomInvoice] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!useAuthStore.getState().token) hydrateFromStorage();
    setAuthChecked(true);
  }, [hydrateFromStorage]);

  useEffect(() => {
    if (!authChecked) return;
    if (!useAuthStore.getState().token) {
      router.replace('/auth');
      return;
    }
    if (!needsOnboarding(useAuthStore.getState().org) && !changeMode) {
      router.replace('/dashboard');
      return;
    }
    const t = setTimeout(() => setPhase('ready'), 700);
    return () => clearTimeout(t);
  }, [authChecked, router, changeMode]);

  async function handleContinue() {
    setError('');
    if (selected === 'custom' && (!customCustomer.trim() || !customInvoice.trim())) {
      setError('Enter both labels for a custom setup.');
      return;
    }

    setPhase('submitting');
    try {
      const payload: Record<string, string> = { industryTemplate: selected };
      if (selected === 'custom') {
        payload.customerLabel = customCustomer.trim();
        payload.invoiceLabel = customInvoice.trim();
      }

      const { data: updatedOrg } = await api.patch('/auth/organization/setup', payload);
      updateOrg(updatedOrg);
      setPhase('done');
      setTimeout(() => router.replace('/dashboard'), 900);
    } catch (err: any) {
      setPhase('ready');
      setError(err?.response?.data?.message || 'Could not save your setup. Try again.');
    }
  }

  if (!authChecked || !token) {
    return (
      <div className="min-h-screen bg-[#03050A] flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-2 border-blue-500/30 border-t-blue-500 animate-spin" />
      </div>
    );
  }

  const preset = INDUSTRY_TEMPLATES.find((t) => t.key === selected)!;

  return (
    <div className="min-h-screen bg-[#03050A] text-white overflow-hidden relative">
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes onboardingFadeUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .onboarding-card-in { animation: onboardingFadeUp 0.5s ease forwards; }
      `}} />
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-[-10%] left-[20%] w-[600px] h-[600px] rounded-full bg-blue-600/10 blur-3xl" />
        <div className="absolute bottom-[-10%] right-[10%] w-[500px] h-[500px] rounded-full bg-emerald-500/8 blur-3xl" />
      </div>

      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4 py-12">
        <div
          className={cn(
            'w-full max-w-2xl transition-all duration-700 ease-out',
            phase === 'loading' && 'opacity-0 translate-y-4',
            phase !== 'loading' && 'opacity-100 translate-y-0',
          )}
        >
          {/* Header */}
          <div
            className={cn(
              'text-center mb-10 transition-all duration-500 delay-100',
              phase === 'ready' || phase === 'submitting' ? 'opacity-100 translate-y-0' : phase === 'done' ? 'opacity-0 -translate-y-2' : '',
            )}
          >
            <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/25 text-blue-300 text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-full mb-5">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
              Workspace setup
            </div>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight mb-3">
              What kind of business?
            </h1>
          </div>

          {/* Template grid */}
          <div
            className={cn(
              'grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6 transition-all duration-500 delay-200',
              phase === 'done' && 'opacity-0 scale-[0.98] pointer-events-none',
            )}
          >
            {INDUSTRY_TEMPLATES.map((template, i) => {
              const active = selected === template.key;
              return (
                <button
                  key={template.key}
                  type="button"
                  disabled={phase === 'submitting' || phase === 'done'}
                  onClick={() => setSelected(template.key)}
                  className={cn(
                    'group text-left p-4 rounded-xl border transition-all duration-300',
                    'hover:border-blue-400/50 hover:bg-white/[0.04]',
                    active
                      ? 'border-blue-500 bg-blue-500/10 shadow-[0_0_0_1px_rgba(37,99,235,0.3)]'
                      : 'border-white/10 bg-white/[0.02]',
                    phase === 'ready' && 'onboarding-card-in opacity-0',
                  )}
                  style={{ animationDelay: `${200 + i * 60}ms` }}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-2xl leading-none mt-0.5">{TEMPLATE_ICONS[template.key]}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-[15px]">{template.name}</span>
                        {active && (
                          <span className="text-[10px] font-bold uppercase tracking-wide text-blue-300 bg-blue-500/20 px-2 py-0.5 rounded-full">
                            Selected
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-[#6B7FA3] mt-1">
                        {template.customerLabel} · {template.invoiceLabel}
                      </p>
                      {template.key === 'custom' && (
                        <p className="text-xs text-[#3D4F6B] mt-1">Set your own labels</p>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Custom fields */}
          <div
            className={cn(
              'overflow-hidden transition-all duration-400 mb-6',
              selected === 'custom' ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0',
            )}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-xl border border-white/10 bg-white/[0.02]">
              <div>
                <label className="block text-[11px] font-bold text-[#6B7FA3] uppercase tracking-wide mb-1.5">
                  People label
                </label>
                <input
                  value={customCustomer}
                  onChange={(e) => setCustomCustomer(e.target.value)}
                  placeholder="e.g. Members"
                  className="w-full px-3 py-2.5 rounded-lg bg-white/5 border border-white/10 text-sm outline-none focus:border-blue-500/60 transition-colors"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-[#6B7FA3] uppercase tracking-wide mb-1.5">
                  Billing label
                </label>
                <input
                  value={customInvoice}
                  onChange={(e) => setCustomInvoice(e.target.value)}
                  placeholder="e.g. Dues"
                  className="w-full px-3 py-2.5 rounded-lg bg-white/5 border border-white/10 text-sm outline-none focus:border-blue-500/60 transition-colors"
                />
              </div>
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-400 text-center mb-4">{error}</p>
          )}

          {/* CTA */}
          <div className={cn('transition-all duration-300', phase === 'done' && 'opacity-0')}>
            <button
              type="button"
              onClick={handleContinue}
              disabled={phase === 'submitting' || phase === 'done'}
              className={cn(
                'w-full py-3.5 rounded-xl font-bold text-sm transition-all duration-200',
                'bg-blue-600 hover:bg-blue-500 text-white',
                'disabled:opacity-70 disabled:cursor-not-allowed',
                'shadow-lg shadow-blue-600/25 hover:shadow-blue-500/30 hover:-translate-y-0.5',
              )}
            >
              {phase === 'submitting' ? (
                <span className="inline-flex items-center gap-2">
                  <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  Setting up your workspace…
                </span>
              ) : changeMode ? (
                <>Save changes →</>
              ) : (
                <>Continue to dashboard →</>
              )}
            </button>
            <p className="text-center text-xs text-[#3D4F6B] mt-3">
              Sidebar uses <span className="text-[#6B7FA3]">{preset.customerLabel}</span> and{' '}
              <span className="text-[#6B7FA3]">Invoices</span>. You name each bill when you create it.
            </p>
          </div>

          {/* Success overlay */}
          {phase === 'done' && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#03050A]/90 backdrop-blur-sm transition-opacity duration-300">
              <div className="text-center scale-100 transition-transform duration-400">
                <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-3xl mx-auto mb-4">
                  ✓
                </div>
                <h2 className="text-xl font-bold mb-1">You&apos;re all set</h2>
                <p className="text-sm text-[#6B7FA3]">Opening your dashboard…</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
