"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchCurrentUser } from "@/lib/auth";
import type { AuthUser } from "@/types/user";

export function useAuthUser() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const currentUser = await fetchCurrentUser();
    setUser(currentUser);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const handleFocus = () => refresh();
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [refresh]);

  return {
    user,
    isAuthenticated: !!user,
    loading,
    refresh,
  };
}
