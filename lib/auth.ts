import type { AuthUser } from "@/types/user";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5016/api/v1/";

export async function logoutUser(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE_URL}logout`, {
      method: "POST",
      credentials: "include",
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function fetchCurrentUser(): Promise<AuthUser | null> {
  try {
    const res = await fetch(`${API_BASE_URL}me`, {
      credentials: "include",
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as AuthUser;
  } catch {
    return null;
  }
}

export function getUserInitials(user: AuthUser): string {
  const first = user.firstname?.trim().charAt(0) || "";
  const last = user.lastname?.trim().charAt(0) || "";
  if (first || last) return `${first}${last}`.toUpperCase();
  return user.username?.trim().charAt(0).toUpperCase() || "?";
}
