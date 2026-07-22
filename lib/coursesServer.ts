import type { Course, CourseModule, Enrollment } from "@/types/course";
import { serverApiFetch } from "@/lib/serverApi";

export async function fetchCourseBySlugServer(slug: string) {
  const res = await serverApiFetch(`courses/slug/${slug}`);
  if (!res.ok) return null;
  return res.json() as Promise<{
    course: Course;
    curriculum: CourseModule[];
    enrollment: Enrollment | null;
    isEnrolled: boolean;
    isStaff?: boolean;
  }>;
}

export async function fetchMyEnrollmentsServer() {
  const res = await serverApiFetch("enrollments/me");
  if (!res.ok) return [];
  const data = await res.json();
  return (data.enrollments || []) as Enrollment[];
}

export async function fetchCertificateServer(enrollmentId: string) {
  const res = await serverApiFetch(`certificates/${enrollmentId}`);
  if (!res.ok) return null;
  const data = await res.json();
  return data.certificate;
}

export async function fetchCourseProgressServer(courseId: string) {
  const res = await serverApiFetch(`progress/courses/${courseId}`);
  if (!res.ok) return { progress: [], enrollment: null };
  const data = await res.json();
  return {
    progress: data.progress || [],
    enrollment: data.enrollment || null,
  };
}

export async function fetchCurrentUserServer() {
  const res = await serverApiFetch("me");
  if (!res.ok) return null;
  return res.json();
}
