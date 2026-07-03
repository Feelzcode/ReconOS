export type MarketingTheme = 'dark' | 'light';

const STORAGE_KEY = 'recon-theme';

export function resolveMarketingTheme(): MarketingTheme {
  if (typeof window === 'undefined') return 'dark';
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved === 'light' || saved === 'dark') return saved;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function syncThemeControls(root: HTMLElement, theme: MarketingTheme) {
  const toggleIcon = root.querySelector('#toggleIcon');
  if (toggleIcon) toggleIcon.textContent = theme === 'dark' ? '☀' : '☽';

  const themeToggle = root.querySelector('#themeToggle');
  if (themeToggle instanceof HTMLButtonElement) {
    themeToggle.title = theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';
  }

  const themeBtn = root.querySelector('#themeBtn');
  if (themeBtn) themeBtn.textContent = theme === 'dark' ? '☀' : '☽';
}

export function applyMarketingTheme(theme: MarketingTheme, root: HTMLElement) {
  root.setAttribute('data-theme', theme);
  localStorage.setItem(STORAGE_KEY, theme);
  syncThemeControls(root, theme);
}

export function toggleMarketingTheme(root: HTMLElement): MarketingTheme {
  const current = root.getAttribute('data-theme');
  const next: MarketingTheme = current === 'light' ? 'dark' : 'light';
  applyMarketingTheme(next, root);
  return next;
}
