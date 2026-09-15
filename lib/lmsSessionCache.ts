import type { Enrollment } from "@/types/course";

const ENROLLMENTS_KEY = "handiz-lms:enrollments:v1";
const TTL_MS = 10 * 60 * 1000;

type CacheEntry<T> = { data: T; fetchedAt: number };

function readEntry<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CacheEntry<T>;
    if (Date.now() - parsed.fetchedAt > TTL_MS) return null;
    return parsed.data;
  } catch {
    return null;
  }
}

function writeEntry<T>(key: string, data: T) {
  if (typeof window === "undefined") return;
  try {
    const payload: CacheEntry<T> = { data, fetchedAt: Date.now() };
    sessionStorage.setItem(key, JSON.stringify(payload));
  } catch {
    /* quota / private mode */
  }
}

export function readCachedEnrollments(): Enrollment[] | null {
  return readEntry<Enrollment[]>(ENROLLMENTS_KEY);
}

export function writeCachedEnrollments(enrollments: Enrollment[]) {
  writeEntry(ENROLLMENTS_KEY, enrollments);
}

export function courseCacheKey(slug: string) {
  return `handiz-lms:course:${slug}:v1`;
}

export function readCachedCoursePayload<T>(slug: string): T | null {
  return readEntry<T>(courseCacheKey(slug));
}

export function writeCachedCoursePayload<T>(slug: string, data: T) {
  writeEntry(courseCacheKey(slug), data);
}
