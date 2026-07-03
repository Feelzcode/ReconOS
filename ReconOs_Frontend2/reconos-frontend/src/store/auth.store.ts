// src/store/auth.store.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import Cookies from 'js-cookie';

interface AuthState {
  token: string | null;
  user: any | null;
  org: any | null;
  setAuth: (token: string, user: any, org: any) => void;
  updateOrg: (org: any) => void;
  hydrateFromStorage: () => boolean;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      org: null,
      setAuth: (token, user, org) => {
        Cookies.set('token', token, { expires: 7 });
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
        localStorage.setItem('org', JSON.stringify(org));
        set({ token, user, org });
      },
      updateOrg: (org) => {
        localStorage.setItem('org', JSON.stringify(org));
        try {
          const raw = localStorage.getItem('reconos-auth');
          if (raw) {
            const parsed = JSON.parse(raw);
            parsed.state = { ...parsed.state, org };
            localStorage.setItem('reconos-auth', JSON.stringify(parsed));
          }
        } catch {
          // ignore malformed storage
        }
        set({ org });
      },
      hydrateFromStorage: () => {
        const token = Cookies.get('token') || localStorage.getItem('token');
        if (!token) return false;

        let user = null;
        let org = null;
        try {
          const rawUser = localStorage.getItem('user');
          const rawOrg = localStorage.getItem('org');
          if (rawUser) user = JSON.parse(rawUser);
          if (rawOrg) org = JSON.parse(rawOrg);
        } catch {
          // ignore malformed storage
        }

        Cookies.set('token', token, { expires: 7 });
        set({ token, user, org });
        return true;
      },
      logout: () => {
        Cookies.remove('token');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('org');
        set({ token: null, user: null, org: null });
        window.location.href = '/auth';
      },
    }),
    { name: 'reconos-auth' }
  )
);
