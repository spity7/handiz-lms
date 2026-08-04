import CoursePlayer from "@/components/courses/CoursePlayer";
import {
  fetchCourseBySlugServer,
  fetchCourseProgressServer,
} from "@/lib/coursesServer";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

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

export default async function LessonPlayerPage({ params }: Props) {
  const { slug, lessonSlug } = await params;
  const data = await fetchCourseBySlugServer(slug);
  if (!data) notFound();

  const lesson = data.curriculum
    .flatMap((m) => m.lessons)
    .find((l) => l.slug === lessonSlug);

  if (!lesson) notFound();

  const visibleCurriculum = data.isStaff
    ? data.curriculum
    : data.curriculum.filter((mod) => (mod.lessons || []).length > 0);

  const { progress: progressList, enrollment: progressEnrollment } =
    await fetchCourseProgressServer(data.course._id);
  const initialProgress: Record<
    string,
    { completed: boolean; lastPosition: number }
  > = {};
  progressList.forEach(
    (p: { lessonId: string; completed: boolean; lastPosition: number }) => {
      initialProgress[String(p.lessonId)] = {
        completed: p.completed,
        lastPosition: p.lastPosition,
      };
    },
  );

  return (
    <CoursePlayer
      courseSlug={slug}
      courseTitle={data.course.title}
      courseId={data.course._id}
      lessonSlug={lessonSlug}
      curriculum={visibleCurriculum}
      initialProgress={initialProgress}
      initialEnrollmentProgress={progressEnrollment?.progressPercent ?? 0}
      isStaff={data.isStaff}
    />
  );
}
