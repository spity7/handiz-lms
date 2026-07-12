"use client";

import Link from "next/link";
import Image from "next/image";
import { Award, Play } from "lucide-react";
import type { Enrollment } from "@/types/course";
import { formatDuration } from "@/lib/courses";
import { Button, Card, ProgressBar } from "@/components/ui";
import { getLmsUrl, getMainSiteUrl } from "@/lib/urls";

export default function MyCoursesList({
  enrollments,
}: {
  enrollments: Enrollment[];
}) {
  if (enrollments.length === 0) {
    return (
      <Card className="py-16 text-center">
        <p className="mb-6 text-slate-500">
          You are not enrolled in any courses yet.
        </p>
        <a href={getMainSiteUrl("/courses")}>
          <Button size="lg">Browse Courses</Button>
        </a>
      </Card>
    );
  }

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {enrollments.map((enrollment) => {
        const course =
          typeof enrollment.courseId === "object" ? enrollment.courseId : null;
        if (!course) return null;

        const continueSlug = enrollment.lastLessonId?.slug;
        const isCompleted = enrollment.status === "completed";

        return (
          <Card
            key={enrollment._id}
            className="flex flex-col p-0 overflow-hidden"
          >
            {course.thumbnailUrl && (
              <div className="relative aspect-[16/10] bg-slate-100">
                <Image
                  src={course.thumbnailUrl}
                  alt={course.title}
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 100vw, 33vw"
                />
                {isCompleted && (
                  <span className="absolute right-3 top-3 rounded-full bg-emerald-500 px-2.5 py-0.5 text-xs font-medium text-white">
                    Completed
                  </span>
                )}
              </div>
            )}

            <div className="flex flex-1 flex-col p-5">
              <h3 className="mb-3 font-semibold text-slate-900 line-clamp-2">
                {course.title}
              </h3>

              <div className="mb-3">
                <div className="mb-1.5 flex justify-between text-xs">
                  <span className="text-slate-500">Progress</span>
                  <span className="font-medium text-indigo-600">
                    {enrollment.progressPercent}%
                  </span>
                </div>
                <ProgressBar value={enrollment.progressPercent} />
              </div>

              {course.totalDurationMinutes ? (
                <p className="mb-4 text-xs text-slate-500">
                  {formatDuration(course.totalDurationMinutes)}
                </p>
              ) : null}

              <div className="mt-auto flex gap-2">
                <Link
                  href={
                    continueSlug
                      ? getLmsUrl(
                          `/courses/${course.slug}/learn/${continueSlug}`,
                        )
                      : getLmsUrl(`/courses/${course.slug}`)
                  }
                  className="flex-1"
                >
                  <Button className="w-full" size="sm">
                    <Play className="h-3.5 w-3.5" />
                    {isCompleted ? "Review" : "Continue"}
                  </Button>
                </Link>
                {isCompleted && (
                  <Link
                    href={getLmsUrl(
                      `/my-courses?certificate=${enrollment._id}`,
                    )}
                    title="Certificate"
                  >
                    <Button variant="outline" size="sm">
                      <Award className="h-4 w-4" />
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
