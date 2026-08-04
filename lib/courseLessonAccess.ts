import { getSignInUrl } from "@/lib/urls";

const LESSON_INTENT_KEY = "handiz-lesson-intent";

type StoredLessonIntent = {
  courseSlug: string;
  lessonSlug: string;
};

function readStoredLessonIntent(): StoredLessonIntent | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(LESSON_INTENT_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as StoredLessonIntent;
    if (!parsed.courseSlug || !parsed.lessonSlug) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function storeLessonIntent(courseSlug: string, lessonSlug: string) {
  if (typeof window === "undefined") return;
  const payload: StoredLessonIntent = { courseSlug, lessonSlug };
  sessionStorage.setItem(LESSON_INTENT_KEY, JSON.stringify(payload));
}

export function clearLessonIntent() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(LESSON_INTENT_KEY);
}

export function peekLessonIntent(courseSlug: string): string | null {
  const stored = readStoredLessonIntent();
  if (!stored || stored.courseSlug !== courseSlug) return null;
  return stored.lessonSlug;
}

export function resolveLessonIntent(
  courseSlug: string,
  queryLesson?: string,
): string | undefined {
  const fromQuery = queryLesson?.trim();
  if (fromQuery) {
    clearLessonIntent();
    return fromQuery;
  }

  const fromStorage = peekLessonIntent(courseSlug);
  if (fromStorage) {
    clearLessonIntent();
    return fromStorage;
  }

  return undefined;
}

export function hasPendingLessonIntent(
  courseSlug: string,
  enrollContactQuery?: string,
): boolean {
  if (enrollContactQuery === "1") return true;
  return Boolean(peekLessonIntent(courseSlug));
}

export function buildCourseLessonReturnPath(
  courseSlug: string,
  lessonSlug: string,
) {
  const params = new URLSearchParams({
    enrollContact: "1",
    lesson: lessonSlug,
  });
  return `/courses/${courseSlug}?${params.toString()}`;
}

export function redirectToSignInForLesson(
  courseSlug: string,
  lessonSlug: string,
) {
  storeLessonIntent(courseSlug, lessonSlug);
  const returnPath = buildCourseLessonReturnPath(courseSlug, lessonSlug);
  window.location.href = getSignInUrl(returnPath);
}

export function openCourseContactWhatsApp(whatsAppHref: string) {
  window.location.assign(whatsAppHref);
}
