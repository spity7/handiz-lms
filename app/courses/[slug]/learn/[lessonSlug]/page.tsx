import CoursePlayer from "@/components/courses/CoursePlayer";
import { API_BASE, fetchCourseBySlug } from "@/lib/courses";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { cookies } from "next/headers";

type Props = { params: Promise<{ slug: string; lessonSlug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, lessonSlug } = await params;
  const data = await fetchCourseBySlug(slug);
  const lesson = data?.curriculum
    .flatMap((m) => m.lessons)
    .find((l) => l.slug === lessonSlug);
  return {
    title: lesson ? `${lesson.title} — ${data?.course.title}` : "Lesson",
  };
}

async function fetchProgress(courseId: string, cookieHeader: string) {
  try {
    const res = await fetch(`${API_BASE}progress/courses/${courseId}`, {
      headers: { Cookie: cookieHeader },
      cache: "no-store",
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.progress || [];
  } catch {
    return [];
  }
}

export default async function LessonPlayerPage({ params }: Props) {
  const { slug, lessonSlug } = await params;
  const data = await fetchCourseBySlug(slug, true);
  if (!data) notFound();

  const lesson = data.curriculum
    .flatMap((m) => m.lessons)
    .find((l) => l.slug === lessonSlug);

  if (!lesson) notFound();

  const canAccess =
    lesson.isPreview || data.isEnrolled || data.isStaff || !lesson.locked;
  if (!canAccess) {
    redirect(`/courses/${slug}`);
  }

  const visibleCurriculum = data.isStaff
    ? data.curriculum
    : data.curriculum.filter((mod) => (mod.lessons || []).length > 0);

  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");

  const progressList = await fetchProgress(data.course._id, cookieHeader);
  const initialProgress: Record<
    string,
    { completed: boolean; lastPosition: number }
  > = {};
  progressList.forEach(
    (p: { lessonId: string; completed: boolean; lastPosition: number }) => {
      initialProgress[p.lessonId] = {
        completed: p.completed,
        lastPosition: p.lastPosition,
      };
    },
  );

  return (
    <CoursePlayer
      courseSlug={slug}
      lessonSlug={lessonSlug}
      curriculum={visibleCurriculum}
      initialProgress={initialProgress}
    />
  );
}
