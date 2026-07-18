import MyCoursesPageClient from "@/components/courses/MyCoursesPageClient";
import {
  fetchCertificateServer,
  fetchMyEnrollmentsServer,
} from "@/lib/coursesServer";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "My Courses",
  description: "Your enrolled courses and learning progress",
};

type Props = { searchParams: Promise<{ certificate?: string }> };

export default async function MyCoursesPage({ searchParams }: Props) {
  const { certificate: certEnrollmentId } = await searchParams;
  const [enrollments, certificate] = await Promise.all([
    fetchMyEnrollmentsServer(),
    certEnrollmentId
      ? fetchCertificateServer(certEnrollmentId)
      : Promise.resolve(null),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          My Courses
        </h1>
        <p className="mt-2 text-slate-500">
          Continue where you left off or explore new skills.
        </p>
      </div>

      <MyCoursesPageClient
        initialEnrollments={enrollments}
        initialCertificate={certificate}
        certificateEnrollmentId={certEnrollmentId}
      />
    </div>
  );
}
