import type { Course, CourseModule, Enrollment, Lesson } from "@/types/course";
import { getSignInUrl } from "@/lib/urls";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5016/api/v1/";

const fetchOpts = (credentials = false): RequestInit => ({
  cache: "no-store",
  ...(credentials ? { credentials: "include" as RequestCredentials } : {}),
});

export async function fetchCourses(params?: {
  tag?: string;
  level?: string;
  free?: string;
  search?: string;
}): Promise<Course[]> {
  const searchParams = new URLSearchParams();
  if (params?.tag) searchParams.set("tag", params.tag);
  if (params?.level) searchParams.set("level", params.level);
  if (params?.free) searchParams.set("free", params.free);
  if (params?.search) searchParams.set("search", params.search);

  const qs = searchParams.toString();
  const res = await fetch(
    `${API_BASE_URL}courses${qs ? `?${qs}` : ""}`,
    fetchOpts(),
  );
  if (!res.ok) return [];
  const data = await res.json();
  return data.courses || [];
}

export async function fetchCourseBySlug(slug: string, withAuth = false) {
  const res = await fetch(
    `${API_BASE_URL}courses/slug/${slug}`,
    fetchOpts(withAuth),
  );
  if (!res.ok) return null;
  return res.json() as Promise<{
    course: Course;
    curriculum: CourseModule[];
    enrollment: Enrollment | null;
    isEnrolled: boolean;
    isStaff?: boolean;
  }>;
}

export type LessonFetchSuccess = {
  course: { _id: string; title: string; slug: string };
  lesson: Lesson;
  playback: { otp: string; playbackInfo: string } | null;
  quiz: {
    _id: string;
    passingScore: number;
    questions: { prompt: string; options: string[] }[];
  } | null;
  enrollment: Enrollment | null;
};

export type LessonDeviceErrorCode =
  | "DEVICE_REGISTERED_ELSEWHERE"
  | "LESSON_ACCESS_BLOCKED";

export type LessonFetchError = {
  error: string;
  errorcode?: LessonDeviceErrorCode;
  encodingStatus?: string;
};

export type LessonFetchResult = LessonFetchSuccess | LessonFetchError | null;

export async function fetchLesson(
  slug: string,
  lessonSlug: string,
): Promise<LessonFetchResult> {
  const res = await fetch(
    `${API_BASE_URL}courses/${slug}/lessons/${lessonSlug}`,
    fetchOpts(true),
  );
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const payload = data as {
      message?: string;
      errorcode?: LessonDeviceErrorCode;
      encodingStatus?: string;
    };
    return {
      error:
        payload.message ||
        (res.status === 403
          ? "You do not have access to this lesson."
          : "Lesson unavailable."),
      errorcode: payload.errorcode,
      encodingStatus: payload.encodingStatus,
    };
  }
  return res.json() as Promise<LessonFetchSuccess>;
}

export async function enrollFree(courseId: string) {
  const res = await fetch(`${API_BASE_URL}courses/${courseId}/enroll`, {
    method: "POST",
    credentials: "include",
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Enrollment failed");
  return data;
}

export async function createCheckout(courseId: string) {
  const res = await fetch(`${API_BASE_URL}courses/${courseId}/checkout`, {
    method: "POST",
    credentials: "include",
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Checkout failed");
  return data as { url: string; externalId?: string };
}

export async function fetchMyEnrollments(): Promise<Enrollment[]> {
  const res = await fetch(`${API_BASE_URL}enrollments/me`, fetchOpts(true));
  if (!res.ok) return [];
  const data = await res.json();
  return data.enrollments || [];
}

export async function fetchCourseProgress(courseId: string) {
  const res = await fetch(
    `${API_BASE_URL}progress/courses/${courseId}`,
    fetchOpts(true),
  );
  if (!res.ok)
    return { progress: [] as { lessonId: string; completed: boolean }[] };
  const data = await res.json();
  return {
    progress: (data.progress || []) as {
      lessonId: string;
      completed: boolean;
    }[],
  };
}

export function buildLessonProgressMap(
  progressList: { lessonId: string; completed: boolean }[],
): Record<string, boolean> {
  const map: Record<string, boolean> = {};
  for (const p of progressList) {
    if (p.completed) map[String(p.lessonId)] = true;
  }
  return map;
}

export async function updateLessonProgress(
  lessonId: string,
  payload: {
    watchedSeconds?: number;
    lastPosition?: number;
    markComplete?: boolean;
  },
) {
  const res = await fetch(`${API_BASE_URL}progress/lessons/${lessonId}`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) return null;
  return res.json();
}

export async function submitQuizAttempt(
  quizId: string,
  answers: { questionIndex: number; selectedIndex: number }[],
) {
  const res = await fetch(`${API_BASE_URL}quizzes/${quizId}/attempt`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ answers }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Quiz submission failed");
  return data;
}

export async function fetchCertificate(enrollmentId: string) {
  const res = await fetch(
    `${API_BASE_URL}certificates/${enrollmentId}`,
    fetchOpts(true),
  );
  if (!res.ok) return null;
  const data = await res.json();
  return data.certificate;
}

export { getSignInUrl };

export function formatDuration(minutes?: number) {
  if (!minutes) return "";
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export function getContinueLesson(
  curriculum: CourseModule[],
  enrollment?: Pick<Enrollment, "continueLessonSlug" | "lastLessonId"> | null,
): Lesson | null {
  if (enrollment?.continueLessonSlug) {
    const lesson = flattenLessons(curriculum).find(
      (item) => item.slug === enrollment.continueLessonSlug,
    );
    if (lesson) return lesson;
  }

  if (enrollment?.lastLessonId?.slug) {
    const lesson = flattenLessons(curriculum).find(
      (item) => item.slug === enrollment.lastLessonId?.slug,
    );
    if (lesson) return lesson;
  }

  return getFirstLesson(curriculum);
}

export function getFirstLesson(curriculum: CourseModule[]): Lesson | null {
  for (const mod of curriculum) {
    const lesson = mod.lessons?.find((l) => l.isPublished !== false);
    if (lesson) return lesson;
  }
  return null;
}

export function flattenLessons(curriculum: CourseModule[]): Lesson[] {
  return curriculum.flatMap((m) => m.lessons || []);
}

export function filterVisibleCurriculum(
  curriculum: CourseModule[],
): CourseModule[] {
  return curriculum
    .map((mod) => ({
      ...mod,
      lessons: (mod.lessons || []).filter((l) => l.isPublished !== false),
    }))
    .filter((mod) => (mod.lessons || []).length > 0);
}

export function getAdjacentLessons(
  curriculum: CourseModule[],
  currentSlug: string,
) {
  const lessons = flattenLessons(curriculum);
  const idx = lessons.findIndex((l) => l.slug === currentSlug);
  return {
    prev: idx > 0 ? lessons[idx - 1] : null,
    next: idx >= 0 && idx < lessons.length - 1 ? lessons[idx + 1] : null,
  };
}

export const API_BASE = API_BASE_URL;
