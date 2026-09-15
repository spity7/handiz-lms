"use client";

import { useEffect, useState } from "react";
import CourseDetailClient from "@/components/courses/CourseDetailClient";
import { useAuthUser } from "@/hooks/useAuthUser";
import {
  buildLessonProgressMap,
  fetchCourseBySlug,
  fetchCourseProgress,
  getCachedCourseBySlug,
  type CourseBySlugPayload,
} from "@/lib/courses";
import { canPreviewLmsContent } from "@/lib/lmsCourseAccess";
import type { Course, CourseModule, Enrollment } from "@/types/course";

type Props = {
  slug: string;
  enrolledQuery?: string;
  paymentQuery?: string;
  enrollContactQuery?: string;
  lessonIntentQuery?: string;
};

type Payload = {
  course: Course;
  curriculum: CourseModule[];
  enrollment: Enrollment | null;
  isEnrolled: boolean;
  isStaff?: boolean;
  lessonProgress: Record<string, boolean>;
};

function CourseDetailSkeleton() {
  return (
    <div className="mx-auto max-w-7xl animate-pulse px-4 py-8 sm:px-6 lg:px-8">
      <div className="grid gap-10 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <div className="aspect-video rounded-2xl bg-slate-200" />
          <div className="h-8 w-2/3 rounded-lg bg-slate-200" />
          <div className="space-y-2">
            <div className="h-4 w-full rounded bg-slate-100" />
            <div className="h-4 w-full rounded bg-slate-100" />
            <div className="h-4 w-4/5 rounded bg-slate-100" />
          </div>
        </div>
        <div className="h-80 rounded-2xl border border-slate-200 bg-slate-50" />
      </div>
    </div>
  );
}

function payloadFromCourse(data: CourseBySlugPayload): Payload {
  return {
    course: data.course,
    curriculum: data.curriculum,
    enrollment: data.enrollment,
    isEnrolled: data.isEnrolled,
    isStaff: data.isStaff,
    lessonProgress: {},
  };
}

export default function CourseDetailLoader({
  slug,
  enrolledQuery,
  paymentQuery,
  enrollContactQuery,
  lessonIntentQuery,
}: Props) {
  const { user, loading: authLoading } = useAuthUser();
  const [payload, setPayload] = useState<Payload | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setNotFound(false);

    const cached = getCachedCourseBySlug(slug);
    if (cached) {
      setPayload(payloadFromCourse(cached));
    } else {
      setPayload(null);
    }

    const load = async () => {
      const data = await fetchCourseBySlug(slug, true);
      if (cancelled) return;
      if (!data) {
        setNotFound(true);
        setPayload(null);
        return;
      }

      setNotFound(false);
      setPayload(payloadFromCourse(data));

      if (!data.isEnrolled && !data.isStaff) return;

      const { progress: progressList } = await fetchCourseProgress(
        data.course._id,
      );
      if (cancelled) return;

      setPayload((prev) =>
        prev
          ? {
              ...prev,
              lessonProgress: buildLessonProgressMap(progressList),
            }
          : prev,
      );
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [slug]);

  useEffect(() => {
    if (!slug || authLoading || !canPreviewLmsContent(user)) return;

    let cancelled = false;

    const refreshForAdmin = async () => {
      const data = await fetchCourseBySlug(slug, true);
      if (cancelled || !data) return;

      setNotFound(false);
      setPayload(payloadFromCourse(data));
    };

    void refreshForAdmin();

    return () => {
      cancelled = true;
    };
  }, [slug, user?._id, user?.canPreviewLmsContent, user?.role, authLoading]);

  if (notFound) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <h1 className="text-xl font-semibold text-slate-900">
          Course not found
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          This course may have been removed or the link is incorrect.
        </p>
      </div>
    );
  }

  if (!payload) {
    return <CourseDetailSkeleton />;
  }

  return (
    <CourseDetailClient
      course={payload.course}
      curriculum={payload.curriculum}
      enrollment={payload.enrollment}
      isEnrolled={payload.isEnrolled}
      isStaff={payload.isStaff}
      enrolledQuery={enrolledQuery}
      paymentQuery={paymentQuery}
      enrollContactQuery={enrollContactQuery}
      lessonIntentQuery={lessonIntentQuery}
      lessonProgress={payload.lessonProgress}
    />
  );
}
