import { formatDuration, flattenLessons } from "@/lib/courses";
import type { CourseModule, Lesson } from "@/types/course";

export function getLessonDurationLabel(lesson: Lesson) {
  const sec = lesson.video?.durationSeconds;
  if (!sec) return null;
  return formatDuration(Math.ceil(sec / 60));
}

export function getLessonPosition(
  curriculum: CourseModule[],
  lessonSlug: string,
) {
  const lessons = flattenLessons(curriculum);
  const index = lessons.findIndex((lesson) => lesson.slug === lessonSlug);
  return {
    index: index >= 0 ? index + 1 : 0,
    total: lessons.length,
    lesson: index >= 0 ? lessons[index] : null,
  };
}

export function getModuleProgress(
  mod: CourseModule,
  progressMap: Record<string, boolean>,
) {
  const lessons = mod.lessons || [];
  if (lessons.length === 0) return { completed: 0, total: 0 };
  const completed = lessons.filter((lesson) => progressMap[lesson._id]).length;
  return { completed, total: lessons.length };
}

export function getLessonTypeLabel(type: Lesson["type"]) {
  switch (type) {
    case "video":
      return "Video";
    case "quiz":
      return "Quiz";
    case "download":
      return "Download";
    default:
      return "Reading";
  }
}

/** True when the title is a placeholder like "Lesson 8" or "Lesson8". */
export function isGenericLessonTitle(title: string): boolean {
  return /^lesson\s*\d+\.?$/i.test(title.trim());
}

export function getLessonDisplayTitle(title: string, lessonNumber: number): string {
  if (isGenericLessonTitle(title)) {
    return `Lesson ${lessonNumber}`;
  }
  return title.trim();
}
