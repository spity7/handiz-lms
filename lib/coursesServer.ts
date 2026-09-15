import { cache } from "react";
import type { Course, CourseModule, Enrollment } from "@/types/course";
import { serverApiFetch } from "@/lib/serverApi";

export const fetchCourseBySlugServer = cache(async (slug: string) => {
  const res = await serverApiFetch(`courses/slug/${slug}`);
  if (!res.ok) return null;
  return res.json() as Promise<{
    course: Course;
    curriculum: CourseModule[];
    enrollment: Enrollment | null;
    isEnrolled: boolean;
    isStaff?: boolean;
  }>;
});

export const fetchMyEnrollmentsServer = cache(async () => {
  const res = await serverApiFetch("enrollments/me");
  if (!res.ok) return [];
  const data = await res.json();
  return (data.enrollments || []) as Enrollment[];
});

export const fetchCertificateServer = cache(async (enrollmentId: string) => {
  const res = await serverApiFetch(`certificates/${enrollmentId}`);
  if (!res.ok) return null;
  const data = await res.json();
  return data.certificate;
});

export const fetchCourseProgressServer = cache(async (courseId: string) => {
  const res = await serverApiFetch(`progress/courses/${courseId}`);
  if (!res.ok) return { progress: [], enrollment: null };
  const data = await res.json();
  return {
    progress: data.progress || [],
    enrollment: data.enrollment || null,
  };
});

export const fetchCurrentUserServer = cache(async () => {
  const res = await serverApiFetch("me");
  if (!res.ok) return null;
  return res.json();
});
