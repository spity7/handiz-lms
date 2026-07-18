import { cookies } from "next/headers";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5016/api/v1/";

export async function getServerCookieHeader(): Promise<string> {
  const cookieStore = await cookies();
  return cookieStore
    .getAll()
    .map((cookie) => `${cookie.name}=${cookie.value}`)
    .join("; ");
}

export async function serverApiFetch(
  path: string,
  init?: RequestInit,
): Promise<Response> {
  const cookieHeader = await getServerCookieHeader();
  const url = path.startsWith("http")
    ? path
    : `${API_BASE_URL}${path.replace(/^\//, "")}`;

  return fetch(url, {
    ...init,
    cache: "no-store",
    headers: {
      ...(init?.headers || {}),
      ...(cookieHeader ? { Cookie: cookieHeader } : {}),
    },
  });
}

export { API_BASE_URL as SERVER_API_BASE };
