import CourseDetailClient from "@/components/courses/CourseDetailClient";
import { fetchCourseBySlug } from "@/lib/courses";
import {
  fetchCourseBySlugServer,
  fetchCourseProgressServer,
} from "@/lib/coursesServer";
import { buildLessonProgressMap } from "@/lib/courses";
import { getCourseSalePrice } from "@/lib/coursePricing";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

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
  const data = await fetchCourseBySlug(slug);
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
  const data = await fetchCourseBySlugServer(slug);

  if (!data) notFound();

  const { progress: progressList } = await fetchCourseProgressServer(
    data.course._id,
  );
  const lessonProgress = buildLessonProgressMap(progressList);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Course",
    name: data.course.title,
    description: data.course.excerpt || data.course.description,
    provider: {
      "@type": "Organization",
      name: "Handiz Architecture Academy",
      url: "https://handiz.org",
    },
    offers: {
      "@type": "Offer",
      price: getCourseSalePrice(data.course.pricing),
      priceCurrency: "USD",
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <CourseDetailClient
        course={data.course}
        curriculum={data.curriculum}
        enrollment={data.enrollment}
        isEnrolled={data.isEnrolled}
        isStaff={data.isStaff}
        enrolledQuery={query.enrolled}
        paymentQuery={query.payment}
        enrollContactQuery={query.enrollContact}
        lessonIntentQuery={query.lesson}
        lessonProgress={lessonProgress}
      />
    </>
  );
}
