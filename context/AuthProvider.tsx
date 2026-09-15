"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { fetchCurrentUser } from "@/lib/auth";
import { prefetchMyEnrollments } from "@/lib/courses";
import type { AuthUser } from "@/types/user";

type AuthContextValue = {
  user: AuthUser | null;
  isAuthenticated: boolean;
  loading: boolean;
  refresh: (options?: { force?: boolean }) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async (options?: { force?: boolean }) => {
    const force = options?.force ?? false;
    if (!force) setLoading(true);
    try {
      const currentUser = await fetchCurrentUser({ force });
      setUser(currentUser);
      if (currentUser) prefetchMyEnrollments();
    } finally {
      if (!force) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const handleFocus = () => {
      void fetchCurrentUser({ force: true }).then(setUser);
    };
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, []);

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      loading,
      refresh,
    }),
    [user, loading, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthUser() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuthUser must be used within AuthProvider");
  }
  return ctx;
}
