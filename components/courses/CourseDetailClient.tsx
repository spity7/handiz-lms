"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ChevronDown, Clock, Eye, Lock, Play, BookOpen } from "lucide-react";
import type { Course, CourseModule, Enrollment } from "@/types/course";
import {
  createCheckout,
  enrollFree,
  filterVisibleCurriculum,
  formatDuration,
  getFirstLesson,
  getSignInUrl,
} from "@/lib/courses";
import {
  formatUsd,
  getCourseSalePrice,
  getPublicPriceDisplay,
} from "@/lib/coursePricing";
import { useAuthUser } from "@/hooks/useAuthUser";
import { Badge, Button, Card, ProgressBar } from "@/components/ui";
import { getLmsUrl } from "@/lib/urls";

export default function CourseDetailClient({
  course,
  curriculum,
  enrollment,
  isEnrolled,
}: {
  course: Course;
  curriculum: CourseModule[];
  enrollment: Enrollment | null;
  isEnrolled: boolean;
}) {
  const { isAuthenticated } = useAuthUser();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [openModules, setOpenModules] = useState<Record<string, boolean>>(
    () => {
      const initial: Record<string, boolean> = {};
      curriculum.forEach((m) => {
        initial[m._id] = true;
      });
      return initial;
    },
  );

  const firstLesson = getFirstLesson(curriculum);
  const visibleCurriculum = filterVisibleCurriculum(curriculum);
  const priceDisplay = getPublicPriceDisplay(course.pricing);
  const salePrice = getCourseSalePrice(course.pricing);

  const handleEnroll = async () => {
    if (!isAuthenticated) {
      window.location.href = getSignInUrl(`/courses/${course.slug}`);
      return;
    }

    setLoading(true);
    setError("");
    try {
      if (priceDisplay.isFree) {
        await enrollFree(course._id);
        window.location.href = firstLesson
          ? getLmsUrl(`/courses/${course.slug}/learn/${firstLesson.slug}`)
          : getLmsUrl(`/courses/${course.slug}`);
      } else {
        const { url } = await createCheckout(course._id);
        window.location.href = url;
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const continueHref = firstLesson
    ? getLmsUrl(
        `/courses/${course.slug}/learn/${enrollment?.lastLessonId?.slug || firstLesson.slug}`,
      )
    : getLmsUrl(`/courses/${course.slug}`);

  const toggleModule = (id: string) => {
    setOpenModules((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="grid gap-8 lg:grid-cols-3 lg:gap-12">
        <div className="lg:col-span-2">
          {course.thumbnailUrl && (
            <div className="relative mb-6 aspect-[16/9] overflow-hidden rounded-2xl bg-slate-100 shadow-lg">
              <Image
                src={course.thumbnailUrl}
                alt={course.title}
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 66vw"
                priority
              />
            </div>
          )}

          <div className="mb-4 flex flex-wrap items-center gap-2">
            {course.level && <Badge variant="muted">{course.level}</Badge>}
            <span className="flex items-center gap-1 text-sm text-slate-500">
              <BookOpen className="h-4 w-4" />
              {course.lessonCount || 0} lessons
            </span>
            {course.totalDurationMinutes ? (
              <span className="flex items-center gap-1 text-sm text-slate-500">
                <Clock className="h-4 w-4" />
                {formatDuration(course.totalDurationMinutes)}
              </span>
            ) : null}
          </div>

          <h1 className="mb-4 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            {course.title}
          </h1>

          {course.excerpt && (
            <p className="mb-6 text-lg leading-relaxed text-slate-600">
              {course.excerpt}
            </p>
          )}

          {course.description && (
            <div
              className="prose prose-slate max-w-none text-slate-600"
              dangerouslySetInnerHTML={{ __html: course.description }}
            />
          )}
        </div>

        <div className="lg:col-span-1">
          <Card className="sticky top-24">
            {isEnrolled ? (
              <div className="space-y-4">
                <div>
                  <div className="mb-2 flex justify-between text-sm">
                    <span className="font-medium text-slate-700">
                      Your progress
                    </span>
                    <span className="text-indigo-600">
                      {enrollment?.progressPercent || 0}%
                    </span>
                  </div>
                  <ProgressBar value={enrollment?.progressPercent || 0} />
                </div>
                <Link href={continueHref}>
                  <Button className="w-full" size="lg">
                    <Play className="h-4 w-4" />
                    Continue Learning
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  {priceDisplay.compareAt != null ? (
                    <div className="space-y-2">
                      {priceDisplay.promoLabel && (
                        <Badge variant="success">
                          {priceDisplay.promoLabel}
                        </Badge>
                      )}
                      <div className="flex items-baseline gap-2">
                        <span className="text-lg text-slate-400 line-through">
                          {formatUsd(priceDisplay.compareAt)}
                        </span>
                        <span className="text-3xl font-bold text-emerald-600">
                          {priceDisplay.isFree
                            ? "Free"
                            : priceDisplay.primaryLabel}
                        </span>
                      </div>
                      {priceDisplay.savings != null &&
                        priceDisplay.savings > 0 && (
                          <p className="text-sm text-slate-500">
                            You save {formatUsd(priceDisplay.savings)}
                          </p>
                        )}
                      {priceDisplay.expirationLabel && (
                        <Badge variant="warning">
                          {priceDisplay.expirationLabel}
                        </Badge>
                      )}
                    </div>
                  ) : (
                    <p className="text-3xl font-bold text-emerald-600">
                      {priceDisplay.primaryLabel}
                    </p>
                  )}
                </div>

                <Button
                  className="w-full"
                  size="lg"
                  disabled={loading}
                  onClick={handleEnroll}
                >
                  {loading
                    ? "Please wait..."
                    : priceDisplay.isFree
                      ? "Enroll for Free"
                      : `Buy for ${formatUsd(salePrice)}`}
                </Button>

                {error && <p className="text-sm text-red-600">{error}</p>}
              </div>
            )}
          </Card>
        </div>
      </div>

      <section className="mt-16">
        <h2 className="mb-6 text-2xl font-bold text-slate-900">Curriculum</h2>
        <div className="space-y-3">
          {visibleCurriculum.map((mod) => {
            const isOpen = openModules[mod._id] !== false;
            return (
              <div
                key={mod._id}
                className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm"
              >
                <button
                  type="button"
                  onClick={() => toggleModule(mod._id)}
                  className="flex w-full items-center justify-between px-5 py-4 text-left transition-colors hover:bg-slate-50"
                >
                  <span className="font-semibold text-slate-900">
                    {mod.title}
                  </span>
                  <span className="flex items-center gap-3">
                    <span className="text-sm text-slate-500">
                      {mod.lessons?.length || 0} lessons
                    </span>
                    <ChevronDown
                      className={`h-5 w-5 text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
                    />
                  </span>
                </button>

                {isOpen && (
                  <ul className="border-t border-slate-100">
                    {(mod.lessons || []).map((lesson) => {
                      const canOpen = lesson.isPreview || isEnrolled;
                      return (
                        <li
                          key={lesson._id}
                          className="flex items-center justify-between gap-4 border-b border-slate-50 px-5 py-3 last:border-0"
                        >
                          <span className="flex items-center gap-2 text-sm text-slate-700">
                            {lesson.locked && !lesson.isPreview && (
                              <Lock className="h-4 w-4 text-slate-400" />
                            )}
                            {lesson.isPreview && (
                              <Eye className="h-4 w-4 text-indigo-500" />
                            )}
                            {lesson.title}
                          </span>
                          {canOpen ? (
                            <Link
                              href={getLmsUrl(
                                `/courses/${course.slug}/learn/${lesson.slug}`,
                              )}
                            >
                              <Button variant="outline" size="sm">
                                {lesson.isPreview ? "Preview" : "Open"}
                              </Button>
                            </Link>
                          ) : (
                            <Badge variant="muted">Locked</Badge>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
