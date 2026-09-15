import type { AuthUser } from "@/types/user";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5016/api/v1/";

const ME_CACHE_TTL_MS = 60_000;

let inflightMeRequest: Promise<AuthUser | null> | null = null;
let cachedMe: { user: AuthUser | null; fetchedAt: number } | null = null;

export function clearAuthUserCache() {
  cachedMe = null;
  inflightMeRequest = null;
}

export async function fetchCurrentUser(options?: {
  force?: boolean;
}): Promise<AuthUser | null> {
  const force = options?.force ?? false;
  const now = Date.now();

  if (!force && cachedMe && now - cachedMe.fetchedAt < ME_CACHE_TTL_MS) {
    return cachedMe.user;
  }

  if (!force && inflightMeRequest) {
    return inflightMeRequest;
  }

  inflightMeRequest = (async () => {
    try {
      const res = await fetch(`${API_BASE_URL}me`, {
        credentials: "include",
        cache: "no-store",
      });
      const user = res.ok ? ((await res.json()) as AuthUser) : null;
      cachedMe = { user, fetchedAt: Date.now() };
      return user;
    } catch {
      return cachedMe?.user ?? null;
    } finally {
      inflightMeRequest = null;
    }
  })();

  return inflightMeRequest;
}

export async function logoutUser(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE_URL}logout`, {
      method: "POST",
      credentials: "include",
    });
    if (res.ok) clearAuthUserCache();
    return res.ok;
  } catch {
    return false;
  }
}

export function getUserInitials(user: AuthUser): string {
  const first = user.firstname?.trim().charAt(0) || "";
  const last = user.lastname?.trim().charAt(0) || "";
  if (first || last) return `${first}${last}`.toUpperCase();
  return user.username?.trim().charAt(0).toUpperCase() || "?";
}
