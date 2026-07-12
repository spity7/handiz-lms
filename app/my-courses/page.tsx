import MyCoursesList from "@/components/courses/MyCoursesList";
import CertificateDisplay from "@/components/courses/CertificateDisplay";
import { API_BASE } from "@/lib/courses";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { getMainSiteUrl } from "@/lib/urls";

export const metadata: Metadata = {
  title: "My Courses",
  description: "Your enrolled courses and learning progress",
};

async function getEnrollments() {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");

  const res = await fetch(`${API_BASE}enrollments/me`, {
    headers: { Cookie: cookieHeader },
    cache: "no-store",
  });
  if (!res.ok) return [];
  const data = await res.json();
  return data.enrollments || [];
}

type Props = { searchParams: Promise<{ certificate?: string }> };

export default async function MyCoursesPage({ searchParams }: Props) {
  const enrollments = await getEnrollments();
  const { certificate: certEnrollmentId } = await searchParams;

  let certificate = null;
  if (certEnrollmentId) {
    const cookieStore = await cookies();
    const cookieHeader = cookieStore
      .getAll()
      .map((c) => `${c.name}=${c.value}`)
      .join("; ");
    const res = await fetch(`${API_BASE}certificates/${certEnrollmentId}`, {
      headers: { Cookie: cookieHeader },
      cache: "no-store",
    });
    if (res.ok) {
      const data = await res.json();
      certificate = data.certificate;
    }
  }

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

      {certificate && <CertificateDisplay certificate={certificate} />}
      <MyCoursesList enrollments={enrollments} />

      {enrollments.length === 0 && (
        <p className="mt-6 text-center text-sm text-slate-500">
          <a
            href={getMainSiteUrl("/courses")}
            className="font-medium text-indigo-600 hover:text-indigo-700"
          >
            Explore all courses →
          </a>
        </p>
      )}
    </div>
  );
}
