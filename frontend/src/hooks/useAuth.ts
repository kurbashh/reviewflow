import { useState, useEffect, useCallback } from "react";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://167-233-118-175.sslip.io";

interface Business {
  id: string;
  name: string;
  plan: string;
  status: string;
}

interface AuthUser {
  id: string;
  email: string;
  full_name: string;
  is_active: boolean;
  businesses: Business[];
}

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    token: localStorage.getItem("rf_token"),
    loading: true,
  });

  const setToken = useCallback((token: string | null) => {
    if (token) {
      localStorage.setItem("rf_token", token);
    } else {
      localStorage.removeItem("rf_token");
    }
    setState((prev) => ({ ...prev, token }));
  }, []);

  // Fetch current user on mount or token change
  useEffect(() => {
    if (!state.token) {
      setState({ user: null, token: null, loading: false });
      return;
    }

    let cancelled = false;
    fetch(`${API_BASE}/api/auth/me`, {
      headers: { Authorization: `Bearer ${state.token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error("unauthorized");
        return res.json();
      })
      .then((user) => {
        if (!cancelled) setState({ user, token: state.token, loading: false });
      })
      .catch(() => {
        if (!cancelled) {
          localStorage.removeItem("rf_token");
          setState({ user: null, token: null, loading: false });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [state.token]);

  const refreshUser = useCallback(async () => {
    if (!state.token) return;
    try {
      const res = await fetch(`${API_BASE}/api/auth/me`, {
        headers: { Authorization: `Bearer ${state.token}` },
      });
      if (res.ok) {
        const user = await res.json();
        setState(prev => ({ ...prev, user }));
      }
    } catch (err) {
      console.error("Failed to refresh user", err);
    }
  }, [state.token]);

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Ошибка входа");
      }

      const data = await res.json();
      setToken(data.access_token);
    },
    [setToken]
  );

  const register = useCallback(
    async (email: string, password: string, full_name: string) => {
      const res = await fetch(`${API_BASE}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, full_name }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Ошибка регистрации");
      }

      const data = await res.json();
      setToken(data.access_token);
    },
    [setToken]
  );

  const logout = useCallback(() => {
    setToken(null);
    setState({ user: null, token: null, loading: false });
  }, [setToken]);

  return {
    user: state.user,
    token: state.token,
    loading: state.loading,
    isAuthenticated: !!state.user,
    login,
    register,
    logout,
    refreshUser,
  };
}
