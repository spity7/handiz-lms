"use client";

import Link from "next/link";
import Image from "next/image";
import { Eye } from "lucide-react";
import type { Course } from "@/types/course";
import { Button, Card } from "@/components/ui";
import { getLmsUrl } from "@/lib/urls";

function statusBadgeClass(status: string) {
  switch (status) {
    case "Published":
      return "bg-emerald-100 text-emerald-800";
    case "Draft":
      return "bg-slate-200 text-slate-700";
    case "Coming Soon":
      return "bg-amber-100 text-amber-900";
    case "Archived":
    case "Removed":
      return "bg-slate-100 text-slate-600";
    default:
      return "bg-indigo-100 text-indigo-800";
  }
}

export default function AdminCoursePreviewList({
  courses,
}: {
  courses: Course[];
}) {
  if (courses.length === 0) {
    return (
      <Card className="py-12 text-center">
        <p className="text-sm text-slate-600">
          No courses in the catalog yet. Create one in the admin dashboard.
        </p>
      </Card>
    );
  }

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {courses.map((course) => (
        <Card key={course._id} className="flex flex-col overflow-hidden p-0">
          {course.thumbnailUrl ? (
            <div className="relative aspect-[16/10] bg-slate-100">
              <Image
                src={course.thumbnailUrl}
                alt=""
                fill
                className="object-cover"
                sizes="(max-width: 640px) 100vw, 33vw"
              />
              <span
                className={`absolute right-3 top-3 rounded-full px-2.5 py-0.5 text-xs font-medium ${statusBadgeClass(course.status)}`}
              >
                {course.status}
              </span>
            </div>
          ) : (
            <div className="flex aspect-[16/10] items-center justify-center bg-slate-100 px-4">
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusBadgeClass(course.status)}`}
              >
                {course.status}
              </span>
            </div>
          )}

          <div className="flex flex-1 flex-col p-5">
            <h3 className="mb-2 line-clamp-2 font-semibold text-slate-900">
              {course.title}
            </h3>
            {course.lessonCount != null ? (
              <p className="mb-4 text-xs text-slate-500">
                {course.lessonCount} lesson
                {course.lessonCount === 1 ? "" : "s"}
              </p>
            ) : (
              <div className="mb-4" />
            )}
            <Link
              href={getLmsUrl(`/courses/${course.slug}`)}
              className="mt-auto"
            >
              <Button className="w-full" size="sm" variant="outline">
                <Eye className="h-3.5 w-3.5" />
                Preview on LMS
              </Button>
            </Link>
          </div>
        </Card>
      ))}
    </div>
  );
}
