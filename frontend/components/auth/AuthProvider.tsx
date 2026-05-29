'use client';

import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { API_BASE_URL } from '@/lib/config';

export type CurrentUser = {
  id: string;
  username: string;
  displayName: string;
  email: string;
  role: 'user' | 'manager' | 'root_manager' | string;
  status: 'active' | 'disabled' | string;
  avatarColor?: string;
  accentColor?: string;
  defaultTodoColor?: string;
};

type AuthContextValue = {
  user: CurrentUser | null;
  authenticated: boolean;
  loading: boolean;
  login: (payload: {
    username: string;
    password: string;
    rememberDevice: boolean;
  }) => Promise<CurrentUser>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<CurrentUser | null>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

async function authRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  });
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(payload?.message || 'Request failed.');
  }

  return payload as T;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    setLoading(true);

    try {
      const payload = await authRequest<{
        authenticated: boolean;
        user?: CurrentUser;
      }>('/auth/me');
      const nextUser = payload.authenticated ? payload.user || null : null;

      setUser(nextUser);
      return nextUser;
    } catch {
      setUser(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshUser();
  }, [refreshUser]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      authenticated: Boolean(user),
      loading,
      async login(payload) {
        const response = await authRequest<{
          authenticated: boolean;
          user: CurrentUser;
        }>('/auth/login', {
          method: 'POST',
          body: JSON.stringify(payload),
        });

        setUser(response.user);
        return response.user;
      },
      async logout() {
        await authRequest('/auth/logout', { method: 'POST' }).catch(() => null);
        setUser(null);
      },
      refreshUser,
    }),
    [loading, refreshUser, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }

  return context;
}
