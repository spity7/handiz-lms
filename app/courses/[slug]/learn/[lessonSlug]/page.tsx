import { fetchCourseBySlugServer } from "@/lib/coursesServer";
import type { Metadata } from "next";

type Props = { params: Promise<{ slug: string; lessonSlug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, lessonSlug } = await params;
  const data = await fetchCourseBySlugServer(slug);
  const lesson = data?.curriculum
    .flatMap((m) => m.lessons)
    .find((l) => l.slug === lessonSlug);
  return {
    title: lesson ? `${lesson.title} — ${data?.course.title}` : "Lesson",
  };
}

/** Lesson UI lives in the parent learn layout so course data is not refetched per lesson. */
export default function LessonPlayerPage() {
  return null;
}
