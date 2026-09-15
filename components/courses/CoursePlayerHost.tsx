"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import CoursePlayer from "@/components/courses/CoursePlayer";
import { useAuthUser } from "@/hooks/useAuthUser";
import {
  buildInitialLessonProgressMap,
  fetchCourseBySlug,
  fetchCourseProgress,
  type CourseBySlugPayload,
} from "@/lib/courses";
import { canPreviewLmsContent } from "@/lib/lmsCourseAccess";
import type { CourseModule } from "@/types/course";

type CourseShell = {
  courseSlug: string;
  courseTitle: string;
  courseId: string;
  curriculum: CourseModule[];
  initialProgress: Record<string, { completed: boolean; lastPosition: number }>;
  initialEnrollmentProgress: number;
  isStaff?: boolean;
};

const courseShellCache = new Map<string, CourseShell>();

function buildShellFromCourse(
  courseSlug: string,
  data: CourseBySlugPayload,
  initialProgress: CourseShell["initialProgress"],
  initialEnrollmentProgress: number,
): CourseShell {
  const visibleCurriculum = data.isStaff
    ? data.curriculum
    : data.curriculum.filter((mod) => (mod.lessons || []).length > 0);

  return {
    courseSlug,
    courseTitle: data.course.title,
    courseId: data.course._id,
    curriculum: visibleCurriculum,
    initialProgress,
    initialEnrollmentProgress,
    isStaff: Boolean(data.isStaff),
  };
}

function LearnPlayerSkeleton() {
  return (
    <div className="mx-auto max-w-7xl animate-pulse px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6 h-10 rounded-xl bg-slate-200" />
      <div className="aspect-video rounded-2xl bg-slate-200" />
    </div>
  );
}

export default function CoursePlayerHost() {
  const params = useParams();
  const courseSlug = typeof params?.slug === "string" ? params.slug : "";
  const lessonSlug =
    typeof params?.lessonSlug === "string" ? params.lessonSlug : "";
  const { user, loading: authLoading } = useAuthUser();

  const [shell, setShell] = useState<CourseShell | null>(null);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    if (!courseSlug) return;

    let cancelled = false;

    const load = async () => {
      // Always refetch: session cache may still have pre-enrollment locked lessons.
      const data = await fetchCourseBySlug(courseSlug, true);
      if (cancelled) return;
      if (!data) {
        setLoadError(true);
        setShell(null);
        return;
      }

      const { progress: progressList, enrollment: progressEnrollment } =
        await fetchCourseProgress(data.course._id);
      if (cancelled) return;

      const initialProgress = buildInitialLessonProgressMap(progressList);
      const nextShell = buildShellFromCourse(
        courseSlug,
        data,
        initialProgress,
        progressEnrollment?.progressPercent ??
          data.enrollment?.progressPercent ??
          0,
      );

      courseShellCache.set(courseSlug, nextShell);
      setShell(nextShell);
      setLoadError(false);
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [courseSlug]);

  useEffect(() => {
    if (!courseSlug || authLoading || !canPreviewLmsContent(user)) return;

    let cancelled = false;

    const refreshForAdmin = async () => {
      const data = await fetchCourseBySlug(courseSlug, true);
      if (cancelled || !data) return;

      const { progress: progressList, enrollment: progressEnrollment } =
        await fetchCourseProgress(data.course._id);
      if (cancelled) return;

      const initialProgress = buildInitialLessonProgressMap(progressList);
      const nextShell = buildShellFromCourse(
        courseSlug,
        data,
        initialProgress,
        progressEnrollment?.progressPercent ??
          data.enrollment?.progressPercent ??
          0,
      );

      courseShellCache.set(courseSlug, nextShell);
      setShell(nextShell);
      setLoadError(false);
    };

    void refreshForAdmin();

    return () => {
      cancelled = true;
    };
  }, [
    courseSlug,
    user?._id,
    user?.canPreviewLmsContent,
    user?.role,
    authLoading,
  ]);

  if (loadError) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <p className="text-sm text-slate-600">
          Course not found or unavailable.
        </p>
      </div>
    );
  }

  if (!shell || !lessonSlug) {
    return <LearnPlayerSkeleton />;
  }

  return (
    <CoursePlayer
      courseSlug={shell.courseSlug}
      courseTitle={shell.courseTitle}
      courseId={shell.courseId}
      lessonSlug={lessonSlug}
      curriculum={shell.curriculum}
      initialProgress={shell.initialProgress}
      initialEnrollmentProgress={shell.initialEnrollmentProgress}
      isStaff={shell.isStaff}
    />
  );
}
