import CourseDetailLoader from "@/components/courses/CourseDetailLoader";
import { fetchCourseBySlugServer } from "@/lib/coursesServer";
import type { Metadata } from "next";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{
    enrolled?: string;
    payment?: string;
    enrollContact?: string;
    lesson?: string;
  }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const data = await fetchCourseBySlugServer(slug);
  if (!data) return { title: "Course Not Found" };

  return {
    title: data.course.title,
    description: data.course.excerpt || data.course.description?.slice(0, 160),
    openGraph: {
      title: data.course.title,
      description: data.course.excerpt,
      images: data.course.thumbnailUrl ? [data.course.thumbnailUrl] : [],
    },
  };
}

export default async function CourseDetailPage({
  params,
  searchParams,
}: Props) {
  const { slug } = await params;
  const query = await searchParams;

  return (
    <>
      <CourseDetailLoader
        slug={slug}
        enrolledQuery={query.enrolled}
        paymentQuery={query.payment}
        enrollContactQuery={query.enrollContact}
        lessonIntentQuery={query.lesson}
      />
    </>
  );
}
