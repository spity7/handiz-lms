import type { AuthUser } from "@/types/user";

export function canPreviewLmsContent(
  user: AuthUser | null | undefined,
): boolean {
  if (!user) return false;
  if (user.canPreviewLmsContent === true) return true;
  return user.role === "Admin";
}
