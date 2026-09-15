"use client";

import { useEffect, useState } from "react";
import MyCoursesList from "@/components/courses/MyCoursesList";
import MyCoursesListSkeleton from "@/components/courses/MyCoursesListSkeleton";
import CertificateDisplay from "@/components/courses/CertificateDisplay";
import {
  fetchAdminPreviewCourses,
  fetchCertificate,
  fetchMyEnrollments,
  getCachedMyEnrollments,
} from "@/lib/courses";
import { useAuthUser } from "@/hooks/useAuthUser";
import { canPreviewLmsContent } from "@/lib/lmsCourseAccess";
import { getSignInUrl } from "@/lib/urls";
import AdminCoursePreviewList from "@/components/courses/AdminCoursePreviewList";
import type { Certificate, Course, Enrollment } from "@/types/course";

type Props = {
  certificateEnrollmentId?: string;
};

export default function MyCoursesPageClient({
  certificateEnrollmentId,
}: Props) {
  const { user, isAuthenticated, loading: authLoading } = useAuthUser();
  const previewStaff = canPreviewLmsContent(user);
  const [enrollments, setEnrollments] = useState<Enrollment[] | null>(null);
  const [adminCourses, setAdminCourses] = useState<Course[] | null>(
    previewStaff ? null : [],
  );
  const [certificate, setCertificate] = useState<
    | (Certificate & {
        courseId?: { title?: string; slug?: string };
        userId?: { firstname?: string; lastname?: string; username?: string };
      })
    | null
  >(null);

  useEffect(() => {
    let cancelled = false;

    const cached = getCachedMyEnrollments();
    if (cached) {
      setEnrollments(cached);
    }

    const load = async () => {
      try {
        const [freshEnrollments, cert] = await Promise.all([
          fetchMyEnrollments(),
          certificateEnrollmentId
            ? fetchCertificate(certificateEnrollmentId)
            : Promise.resolve(null),
        ]);
        if (cancelled) return;
        setEnrollments(freshEnrollments);
        if (cert) setCertificate(cert);
      } catch {
        if (!cancelled) setEnrollments((prev) => prev ?? []);
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [certificateEnrollmentId]);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      window.location.href = getSignInUrl("/my-courses");
    }
  }, [authLoading, isAuthenticated]);

  useEffect(() => {
    if (authLoading || !previewStaff) {
      if (!previewStaff) setAdminCourses([]);
      return;
    }

    let cancelled = false;

    const loadAdminCourses = async () => {
      const courses = await fetchAdminPreviewCourses();
      if (!cancelled) setAdminCourses(courses);
    };

    void loadAdminCourses();

    return () => {
      cancelled = true;
    };
  }, [authLoading, previewStaff, user?._id]);

  const loadingAdminCatalog = previewStaff && adminCourses === null;

  if (enrollments === null || loadingAdminCatalog) {
    return <MyCoursesListSkeleton />;
  }

  const adminCatalog: Course[] = adminCourses ?? [];

  const showAdminPreview = previewStaff && adminCatalog.length > 0;

  return (
    <>
      {certificate && <CertificateDisplay certificate={certificate} />}

      {enrollments.length > 0 ? (
        <MyCoursesList enrollments={enrollments} />
      ) : previewStaff ? (
        <div className="space-y-6">
          <div className="rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm text-indigo-900">
            <p className="font-medium">Admin preview</p>
            <p className="mt-1 text-indigo-800/90">
              You are not enrolled as a student. Open any course below to
              preview the full LMS experience, including draft and unpublished
              lessons.
            </p>
          </div>
          <AdminCoursePreviewList courses={adminCatalog} />
        </div>
      ) : (
        <MyCoursesList enrollments={enrollments} />
      )}

      {showAdminPreview && enrollments.length > 0 ? (
        <section className="mt-12 space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Preview all courses
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Admin access — includes drafts and unpublished content.
            </p>
          </div>
          <AdminCoursePreviewList courses={adminCatalog} />
        </section>
      ) : null}
    </>
  );
}
