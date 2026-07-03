'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { NIGERIAN_BANKS, type NigerianBank } from '@/lib/nigerian-banks';

const DEFAULT_LOGO = 'https://nigerianbanks.xyz/logo/default-image.png';

function BankLogo({ bank, size = 'md' }: { bank: NigerianBank; size?: 'sm' | 'md' }) {
  const dim = size === 'sm' ? 'w-5 h-5' : 'w-6 h-6';
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={bank.logo}
      alt=""
      className={`${dim} rounded-full object-contain bg-white shrink-0`}
      onError={(e) => {
        e.currentTarget.src = DEFAULT_LOGO;
      }}
    />
  );
}

export function BankSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (code: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  const selected = NIGERIAN_BANKS.find((b) => b.code === value) ?? NIGERIAN_BANKS[0];
  const filtered = NIGERIAN_BANKS.filter((b) =>
    b.name.toLowerCase().includes(query.trim().toLowerCase()),
  );

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open]);

  const pick = (code: string) => {
    onChange(code);
    setOpen(false);
    setQuery('');
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2.5 px-3 py-2 border border-border rounded-sm bg-input text-sm text-left hover:bg-muted/40 transition-colors"
      >
        <BankLogo bank={selected} />
        <span className="flex-1 truncate font-medium">{selected.name}</span>
        <svg
          className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-sm border border-border bg-white shadow-lg overflow-hidden">
          <div className="p-2 border-b border-border">
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search banks…"
              className="w-full px-2.5 py-1.5 text-sm border border-border rounded-sm bg-input"
            />
          </div>
          <ul
            id={listId}
            role="listbox"
            className="max-h-56 overflow-y-auto py-1"
          >
            {filtered.length === 0 ? (
              <li className="px-3 py-2 text-sm text-muted-foreground">No banks found</li>
            ) : (
              filtered.map((bank) => (
                <li key={`${bank.code}-${bank.name}`} role="option" aria-selected={bank.code === value}>
                  <button
                    type="button"
                    onClick={() => pick(bank.code)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left hover:bg-muted/60 transition-colors ${
                      bank.code === value ? 'bg-muted/80 font-semibold' : ''
                    }`}
                  >
                    <BankLogo bank={bank} size="sm" />
                    <span className="truncate">{bank.name}</span>
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
