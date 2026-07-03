'use client';

import { useEffect } from 'react';
import { applyMarketingTheme, resolveMarketingTheme, toggleMarketingTheme } from './marketing-theme';

/** Reliable dark/light toggle for marketing pages (home + auth). */
export function useMarketingTheme(rootSelector: string) {
  useEffect(() => {
    let root: HTMLElement | null = null;
    let raf = 0;

    const onClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (!target.closest('#themeToggle, #themeBtn')) return;
      event.preventDefault();
      if (root) toggleMarketingTheme(root);
    };

    const bind = () => {
      const el = document.querySelector(rootSelector);
      if (!(el instanceof HTMLElement)) {
        raf = requestAnimationFrame(bind);
        return;
      }
      root = el;
      applyMarketingTheme(resolveMarketingTheme(), root);
      root.addEventListener('click', onClick);
    };

    bind();

    return () => {
      cancelAnimationFrame(raf);
      root?.removeEventListener('click', onClick);
    };
  }, [rootSelector]);
}
