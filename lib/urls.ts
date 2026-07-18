const LMS_URL = process.env.NEXT_PUBLIC_LMS_URL || "https://learn.handiz.org";
const MAIN_SITE_URL =
  process.env.NEXT_PUBLIC_MAIN_SITE_URL || "https://handiz.org";
const DASHBOARD_URL = process.env.NEXT_PUBLIC_DASHBOARD_URL || "";

function joinUrl(base: string, path: string) {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${base.replace(/\/$/, "")}${normalized}`;
}

export function getLmsUrl(path: string) {
  return joinUrl(LMS_URL, path);
}

export function getMainSiteUrl(path: string) {
  return joinUrl(MAIN_SITE_URL, path);
}

export function getSignInUrl(returnPath: string) {
  if (!DASHBOARD_URL) {
    console.error(
      "NEXT_PUBLIC_DASHBOARD_URL is not set; cannot build sign-in URL.",
    );
    return getLmsUrl(returnPath);
  }

  const fullReturn = returnPath.startsWith("http")
    ? returnPath
    : getLmsUrl(returnPath);
  return `${DASHBOARD_URL.replace(/\/$/, "")}/auth/sign-in?redirectTo=${encodeURIComponent(fullReturn)}`;
}

export function getDashboardUrl(path: string) {
  return joinUrl(DASHBOARD_URL, path);
}
