"use client";

import { useEffect, useState } from "react";
import MyCoursesList from "@/components/courses/MyCoursesList";
import CertificateDisplay from "@/components/courses/CertificateDisplay";
import { fetchCertificate, fetchMyEnrollments } from "@/lib/courses";
import { useAuthUser } from "@/hooks/useAuthUser";
import { getSignInUrl } from "@/lib/urls";
import type { Certificate, Enrollment } from "@/types/course";
import { Spinner } from "@/components/ui";

type Props = {
  initialEnrollments: Enrollment[];
  initialCertificate:
    | (Certificate & {
        courseId?: { title?: string; slug?: string };
        userId?: { firstname?: string; lastname?: string; username?: string };
      })
    | null;
  certificateEnrollmentId?: string;
};

export default function MyCoursesPageClient({
  initialEnrollments,
  initialCertificate,
  certificateEnrollmentId,
}: Props) {
  const { isAuthenticated, loading: authLoading } = useAuthUser();
  const [enrollments, setEnrollments] = useState(initialEnrollments);
  const [certificate, setCertificate] = useState(initialCertificate);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (authLoading) return;

    if (!isAuthenticated) {
      window.location.href = getSignInUrl("/my-courses");
      return;
    }

    let cancelled = false;

    const hydrate = async () => {
      setLoading(true);
      try {
        const freshEnrollments = await fetchMyEnrollments();
        if (!cancelled) {
          setEnrollments(freshEnrollments);
        }

        if (certificateEnrollmentId) {
          const cert = await fetchCertificate(certificateEnrollmentId);
          if (!cancelled && cert) {
            setCertificate(cert);
          }
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    hydrate();

    return () => {
      cancelled = true;
    };
  }, [authLoading, isAuthenticated, certificateEnrollmentId]);

  if (authLoading || (!isAuthenticated && !authLoading)) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Spinner />
      </div>
    );
  }

  return (
    <>
      {loading && enrollments.length === 0 ? (
        <div className="flex min-h-[30vh] items-center justify-center">
          <Spinner />
        </div>
      ) : (
        <>
          {certificate && <CertificateDisplay certificate={certificate} />}
          <MyCoursesList enrollments={enrollments} />
        </>
      )}
    </>
  );
}
