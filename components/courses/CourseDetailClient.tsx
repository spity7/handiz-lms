"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Check,
  ChevronDown,
  ChevronRight,
  Clock,
  Eye,
  FileText,
  HelpCircle,
  Loader2,
  Lock,
  Play,
  BookOpen,
  Users,
  User,
  Download,
} from "lucide-react";
import type {
  Course,
  CourseInstructor,
  CourseModule,
  Enrollment,
  Lesson,
} from "@/types/course";
import {
  createCheckout,
  enrollFree,
  fetchCourseBySlug,
  fetchCourseProgress,
  filterVisibleCurriculum,
  formatDuration,
  getFirstLesson,
  getContinueLesson,
  getSignInUrl,
  buildLessonProgressMap,
} from "@/lib/courses";
import {
  formatUsd,
  getCourseSalePrice,
  getPublicPriceDisplay,
} from "@/lib/coursePricing";
import { useAuthUser } from "@/hooks/useAuthUser";
import {
  Badge,
  Button,
  Card,
  ProgressBar,
  ProgressValue,
} from "@/components/ui";
import { getLmsUrl } from "@/lib/urls";
import { buildCourseInterestWhatsAppUrl } from "@/lib/courseContact";
import {
  hasPendingLessonIntent,
  openCourseContactWhatsApp,
  redirectToSignInForLesson,
  resolveLessonIntent,
} from "@/lib/courseLessonAccess";
import WhatsAppContactButton from "@/components/courses/WhatsAppContactButton";
import LessonTypeIcon from "@/components/courses/LessonTypeIcon";
import { getLessonDurationLabel } from "@/lib/lessonUi";

const primaryButtonLg =
  "inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-base font-medium text-white shadow-sm shadow-indigo-600/20 transition-all hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2";

function getInstructorName(instructor?: CourseInstructor) {
  if (!instructor) return null;
  const name = [instructor.firstname, instructor.lastname]
    .filter(Boolean)
    .join(" ");
  return name || instructor.username || null;
}

function getModuleDurationMinutes(mod: CourseModule) {
  let total = 0;
  for (const lesson of mod.lessons || []) {
    const sec = lesson.video?.durationSeconds;
    if (sec) total += Math.ceil(sec / 60);
  }
  return total > 0 ? total : null;
}

type LevelBadgeVariant = "beginner" | "intermediate" | "advanced";

function normalizeCourseLevel(level?: string): LevelBadgeVariant {
  const normalized = (level || "").trim().toLowerCase();
  if (normalized === "intermediate") return "intermediate";
  if (normalized === "advanced") return "advanced";
  return "beginner";
}

const HERO_LEVEL_BADGE: Record<
  LevelBadgeVariant,
  { shell: string; dot: string }
> = {
  beginner: {
    shell:
      "border-teal-300/40 bg-gradient-to-br from-teal-400/25 via-teal-950/35 to-slate-950/55 text-teal-50 shadow-[0_8px_32px_rgba(0,0,0,0.35)]",
    dot: "bg-teal-300 shadow-[0_0_12px_rgba(45,212,191,0.65)]",
  },
  intermediate: {
    shell:
      "border-violet-300/40 bg-gradient-to-br from-violet-400/25 via-violet-950/35 to-slate-950/55 text-violet-50 shadow-[0_8px_32px_rgba(0,0,0,0.35)]",
    dot: "bg-violet-300 shadow-[0_0_12px_rgba(196,181,253,0.65)]",
  },
  advanced: {
    shell:
      "border-amber-300/45 bg-gradient-to-br from-amber-400/28 via-amber-950/30 to-slate-950/55 text-amber-50 shadow-[0_8px_32px_rgba(0,0,0,0.35)]",
    dot: "bg-amber-300 shadow-[0_0_12px_rgba(252,211,77,0.65)]",
  },
};

const INLINE_LEVEL_BADGE: Record<
  LevelBadgeVariant,
  { shell: string; dot: string }
> = {
  beginner: {
    shell: "border-teal-200/80 bg-teal-50 text-teal-800 ring-teal-500/10",
    dot: "bg-teal-500",
  },
  intermediate: {
    shell:
      "border-violet-200/80 bg-violet-50 text-violet-800 ring-violet-500/10",
    dot: "bg-violet-500",
  },
  advanced: {
    shell: "border-amber-200/80 bg-amber-50 text-amber-900 ring-amber-500/10",
    dot: "bg-amber-500",
  },
};

function HeroLevelBadge({ level }: { level: string }) {
  const variant = normalizeCourseLevel(level);
  const { shell, dot } = HERO_LEVEL_BADGE[variant];

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 backdrop-blur-md sm:gap-3 sm:px-5 sm:py-2.5 lg:px-6 lg:py-3 ${shell}`}
    >
      <span
        className={`h-2 w-2 shrink-0 rounded-full ring-2 ring-white/25 sm:h-3 sm:w-3 ${dot}`}
        aria-hidden
      />
      <span className="text-[10px] font-semibold uppercase leading-none tracking-[0.08em] sm:text-sm lg:text-base">
        {level}
      </span>
    </span>
  );
}

function InlineLevelBadge({ level }: { level: string }) {
  const variant = normalizeCourseLevel(level);
  const { shell, dot } = INLINE_LEVEL_BADGE[variant];

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs font-semibold uppercase tracking-wide ring-1 ring-inset ${shell}`}
    >
      <span
        className={`h-1.5 w-1.5 shrink-0 rounded-full ${dot}`}
        aria-hidden
      />
      {level}
    </span>
  );
}

function isModuleComplete(
  mod: CourseModule,
  progressMap: Record<string, boolean>,
) {
  const lessons = mod.lessons || [];
  if (lessons.length === 0) return false;
  return lessons.every((lesson) => progressMap[lesson._id]);
}

function Alert({
  variant,
  children,
}: {
  variant: "error" | "success";
  children: ReactNode;
}) {
  const styles =
    variant === "error"
      ? "border-red-200 bg-red-50 text-red-800"
      : "border-emerald-200 bg-emerald-50 text-emerald-800";
  return (
    <p
      className={`rounded-xl border px-3 py-2.5 text-sm leading-snug ${styles}`}
      role="alert"
    >
      {children}
    </p>
  );
}

function EnrollmentCardContent({
  isEnrolled,
  enrollment,
  continueHref,
  continueLesson,
  priceDisplay,
  salePrice,
  loading,
  error,
  success,
  onEnroll,
  lessonCount,
  totalDurationMinutes,
  whatsAppHref,
}: {
  isEnrolled: boolean;
  enrollment: Enrollment | null;
  continueHref: string;
  continueLesson: Lesson | null;
  priceDisplay: ReturnType<typeof getPublicPriceDisplay>;
  salePrice: number;
  loading: boolean;
  error: string;
  success: string;
  onEnroll: () => void;
  lessonCount: number;
  totalDurationMinutes?: number;
  whatsAppHref: string;
}) {
  return (
    <div className="space-y-6">
      <ul className="grid gap-2">
        <li className="flex items-center gap-3 rounded-xl bg-slate-50 px-3 py-2.5 text-sm text-slate-700 ring-1 ring-slate-100">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
            <BookOpen className="h-4 w-4" />
          </span>
          <span className="font-medium">
            {lessonCount} lesson{lessonCount === 1 ? "" : "s"}
          </span>
        </li>
        {totalDurationMinutes ? (
          <li className="flex items-center gap-3 rounded-xl bg-slate-50 px-3 py-2.5 text-sm text-slate-700 ring-1 ring-slate-100">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-600">
              <Clock className="h-4 w-4" />
            </span>
            <span className="font-medium">
              {formatDuration(totalDurationMinutes)} of content
            </span>
          </li>
        ) : null}
        <li className="flex items-center gap-3 rounded-xl bg-slate-50 px-3 py-2.5 text-sm text-slate-700 ring-1 ring-slate-100">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
            <Check className="h-4 w-4" strokeWidth={2.5} />
          </span>
          <span className="font-medium">Learn at your own pace</span>
        </li>
      </ul>

      {isEnrolled ? (
        <div className="space-y-4">
          <div>
            <div className="mb-2 flex justify-between text-sm">
              <span className="font-medium text-slate-700">Your progress</span>
              <ProgressValue value={enrollment?.progressPercent || 0} />
            </div>
            <ProgressBar value={enrollment?.progressPercent || 0} />
          </div>
          {continueLesson && (
            <p className="text-sm text-slate-500">
              Up next:{" "}
              <span className="font-medium text-slate-700">
                {continueLesson.title}
              </span>
            </p>
          )}
          <Link href={continueHref} className={primaryButtonLg}>
            <Play className="h-4 w-4" />
            Continue learning
          </Link>
        </div>
      ) : (
        <div className="space-y-5">
          <div className="rounded-xl bg-slate-50 p-4 ring-1 ring-slate-100">
            {priceDisplay.compareAt != null ? (
              <div className="space-y-3">
                {priceDisplay.promoLabel && (
                  <Badge variant="success">{priceDisplay.promoLabel}</Badge>
                )}
                <div className="flex flex-wrap items-end gap-x-3 gap-y-1">
                  <span className="text-base text-slate-400 line-through">
                    {formatUsd(priceDisplay.compareAt)}
                  </span>
                  <span className="text-3xl font-bold tracking-tight text-emerald-600">
                    {priceDisplay.isFree ? "Free" : priceDisplay.primaryLabel}
                  </span>
                </div>
                {priceDisplay.savings != null && priceDisplay.savings > 0 && (
                  <p className="text-sm font-medium text-emerald-700/80">
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
              <p className="text-3xl font-bold tracking-tight text-emerald-600">
                {priceDisplay.primaryLabel}
              </p>
            )}
          </div>

          <Button
            className="w-full shadow-md shadow-indigo-600/15"
            size="lg"
            disabled={loading}
            onClick={onEnroll}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Please wait…
              </>
            ) : priceDisplay.isFree ? (
              "Enroll for free"
            ) : (
              `Buy for ${formatUsd(salePrice)}`
            )}
          </Button>

          <WhatsAppContactButton href={whatsAppHref} size="lg" />

          {success && <Alert variant="success">{success}</Alert>}
          {error && <Alert variant="error">{error}</Alert>}
        </div>
      )}
    </div>
  );
}

export default function CourseDetailClient({
  course,
  curriculum,
  enrollment: initialEnrollment,
  isEnrolled: initialIsEnrolled,
  isStaff = false,
  enrolledQuery,
  paymentQuery,
  enrollContactQuery,
  lessonIntentQuery,
  lessonProgress: initialLessonProgress = {},
}: {
  course: Course;
  curriculum: CourseModule[];
  enrollment: Enrollment | null;
  isEnrolled: boolean;
  isStaff?: boolean;
  enrolledQuery?: string;
  paymentQuery?: string;
  enrollContactQuery?: string;
  lessonIntentQuery?: string;
  lessonProgress?: Record<string, boolean>;
}) {
  const router = useRouter();
  const { isAuthenticated, user, loading: authLoading } = useAuthUser();
  const enrollContactHandled = useRef(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [enrollment, setEnrollment] = useState(initialEnrollment);
  const [isEnrolled, setIsEnrolled] = useState(initialIsEnrolled);
  const [lessonProgress, setLessonProgress] = useState(initialLessonProgress);
  const [openModules, setOpenModules] = useState<Record<string, boolean>>(
    () => {
      const initial: Record<string, boolean> = {};
      curriculum.forEach((m, index) => {
        initial[m._id] = index < 3;
      });
      return initial;
    },
  );

  const firstLesson = getFirstLesson(curriculum);
  const visibleCurriculum = isStaff
    ? curriculum
    : filterVisibleCurriculum(curriculum);
  const priceDisplay = getPublicPriceDisplay(course.pricing);
  const salePrice = getCourseSalePrice(course.pricing);
  const instructorName = getInstructorName(course.instructorId);
  const lessonCount =
    course.lessonCount ??
    visibleCurriculum.reduce((n, m) => n + (m.lessons?.length || 0), 0);

  const heroDesktop =
    course.heroImageDesktopUrl || course.thumbnailUrl || undefined;
  const heroMobile =
    course.heroImageMobileUrl || course.heroImageDesktopUrl || heroDesktop;

  const previewLesson = useMemo(() => {
    for (const mod of visibleCurriculum) {
      const preview = mod.lessons?.find((l) => l.isPreview);
      if (preview) return preview;
    }
    return null;
  }, [visibleCurriculum]);

  const whatsAppHref = useMemo(() => {
    const userLabel = user
      ? [user.firstname, user.lastname].filter(Boolean).join(" ") ||
        user.email ||
        user.username
      : undefined;
    return buildCourseInterestWhatsAppUrl({
      courseTitle: course.title,
      courseId: course._id,
      userId: user?._id,
      userLabel,
    });
  }, [course._id, course.title, user]);

  useEffect(() => {
    if (paymentQuery === "failed") {
      setError("Payment was cancelled or failed. Please try again.");
    }
  }, [paymentQuery]);

  useEffect(() => {
    if (!isAuthenticated) return;

    let cancelled = false;

    const refreshEnrollment = async () => {
      const data = await fetchCourseBySlug(course.slug, true);
      if (!data || cancelled) return;

      setIsEnrolled(data.isEnrolled);
      setEnrollment(data.enrollment);

      if (data.isEnrolled) {
        const { progress } = await fetchCourseProgress(course._id);
        if (!cancelled) {
          setLessonProgress(buildLessonProgressMap(progress));
        }
      } else if (!cancelled) {
        setLessonProgress({});
      }

      if (enrolledQuery === "true" && data.isEnrolled) {
        setSuccess("You are enrolled! Redirecting to your first lesson…");
        const targetLesson = getFirstLesson(data.curriculum);
        const target = targetLesson
          ? `/courses/${course.slug}/learn/${targetLesson.slug}`
          : `/courses/${course.slug}`;
        router.replace(getLmsUrl(target));
      }
    };

    refreshEnrollment();

    return () => {
      cancelled = true;
    };
  }, [course._id, course.slug, enrolledQuery, isAuthenticated, router]);

  useEffect(() => {
    if (enrollContactHandled.current) return;
    if (authLoading || !isAuthenticated) return;
    if (!hasPendingLessonIntent(course.slug, enrollContactQuery)) return;

    let cancelled = false;

    const handlePostLoginLessonIntent = async () => {
      const lessonSlug = resolveLessonIntent(course.slug, lessonIntentQuery);
      const data = await fetchCourseBySlug(course.slug, true);
      if (!data || cancelled) return;

      setIsEnrolled(data.isEnrolled);
      setEnrollment(data.enrollment);

      enrollContactHandled.current = true;

      if (data.isEnrolled || data.isStaff) {
        const target = lessonSlug
          ? `/courses/${course.slug}/learn/${lessonSlug}`
          : `/courses/${course.slug}`;
        router.replace(target);
        return;
      }

      const userLabel = user
        ? [user.firstname, user.lastname].filter(Boolean).join(" ") ||
          user.email ||
          user.username
        : undefined;
      const href = buildCourseInterestWhatsAppUrl({
        courseTitle: course.title,
        courseId: course._id,
        userId: user?._id,
        userLabel,
      });
      openCourseContactWhatsApp(href);
    };

    void handlePostLoginLessonIntent().catch(() => {
      enrollContactHandled.current = false;
    });

    return () => {
      cancelled = true;
    };
  }, [
    authLoading,
    course._id,
    course.slug,
    course.title,
    enrollContactQuery,
    isAuthenticated,
    lessonIntentQuery,
    router,
    user,
  ]);

  const handleEnroll = async () => {
    if (!isAuthenticated) {
      window.location.href = getSignInUrl(`/courses/${course.slug}`);
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");
    try {
      if (priceDisplay.isFree) {
        await enrollFree(course._id);
        const target = firstLesson
          ? `/courses/${course.slug}/learn/${firstLesson.slug}`
          : `/courses/${course.slug}`;
        window.location.href = getLmsUrl(target);
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

  const continueLesson = getContinueLesson(curriculum, enrollment);
  const continueHref = continueLesson
    ? getLmsUrl(`/courses/${course.slug}/learn/${continueLesson.slug}`)
    : getLmsUrl(`/courses/${course.slug}`);

  const toggleModule = (id: string) => {
    setOpenModules((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const canOpenLesson = (lesson: Lesson) => {
    if (isStaff) return true;
    if (lesson.isPreview) return true;
    if (isEnrolled && !lesson.locked) return true;
    return false;
  };

  const isSequentiallyLockedLesson = (lesson: Lesson) =>
    !isStaff && isEnrolled && Boolean(lesson.locked) && !lesson.isPreview;

  const handleLockedLessonClick = (lesson: Lesson) => {
    if (isSequentiallyLockedLesson(lesson)) return;

    if (!isAuthenticated) {
      redirectToSignInForLesson(course.slug, lesson.slug);
      return;
    }

    if (isEnrolled || isStaff) {
      router.push(`/courses/${course.slug}/learn/${lesson.slug}`);
      return;
    }

    openCourseContactWhatsApp(whatsAppHref);
  };

  const enrollmentCardProps = {
    isEnrolled,
    enrollment,
    continueHref,
    continueLesson,
    priceDisplay,
    salePrice,
    loading,
    error,
    success,
    onEnroll: handleEnroll,
    lessonCount,
    totalDurationMinutes: course.totalDurationMinutes,
    whatsAppHref,
  };

  return (
    <div className="pb-28 lg:pb-12">
      <div className="mx-auto max-w-7xl px-4 pt-6 sm:px-6 lg:px-8 lg:pt-8">
        <nav
          className="mb-6 flex flex-wrap items-center gap-2 text-sm text-slate-500"
          aria-label="Breadcrumb"
        >
          <Link
            href="/my-courses"
            className="inline-flex items-center gap-1.5 rounded-lg px-1 py-0.5 transition-colors hover:text-indigo-600"
          >
            <ArrowLeft className="h-4 w-4" />
            My courses
          </Link>
          <ChevronRight className="h-4 w-4 text-slate-300" aria-hidden />
          <span className="truncate font-medium text-slate-700">
            {course.title}
          </span>
        </nav>

        {isStaff && (
          <div className="mb-6 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm text-indigo-800">
            Admin preview — unpublished content may be visible.
          </div>
        )}

        {(heroDesktop || heroMobile) && (
          <section className="relative mb-10 overflow-hidden rounded-3xl bg-slate-900 shadow-xl shadow-slate-900/10">
            <div className="relative aspect-[16/10] sm:aspect-[21/9]">
              <Image
                src={heroDesktop || heroMobile!}
                alt=""
                fill
                className="object-cover"
                sizes="100vw"
                priority
              />
              <div
                className="absolute inset-0 bg-gradient-to-t from-slate-950/95 via-slate-900/55 to-slate-900/25"
                aria-hidden
              />

              {course.level && (
                <div className="absolute top-4 left-4 z-10 sm:top-5 sm:left-5 lg:top-6 lg:left-6">
                  <HeroLevelBadge level={course.level} />
                </div>
              )}

              {course.tags && course.tags.length > 0 && (
                <div className="absolute top-4 right-4 z-10 flex max-w-[55%] flex-wrap justify-end gap-1.5 sm:top-5 sm:right-5 sm:gap-2 lg:top-6 lg:right-6">
                  {course.tags.slice(0, 3).map((tag) => (
                    <span
                      key={tag}
                      className="rounded-md border border-white/25 bg-slate-950/45 px-2 py-0.5 text-[10px] font-medium leading-tight text-white shadow-md backdrop-blur-md sm:rounded-lg sm:px-3 sm:py-1.5 sm:text-xs"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              <div className="absolute inset-x-0 bottom-0 p-5 sm:p-8 lg:p-10">
                <h1 className="max-w-3xl text-balance text-xl font-bold leading-tight tracking-tight text-white sm:text-3xl sm:leading-tight lg:text-4xl">
                  {course.title}
                </h1>
                {course.excerpt && (
                  <p className="mt-2 max-w-2xl line-clamp-2 text-pretty text-sm leading-snug text-slate-200 sm:mt-3 sm:line-clamp-none sm:text-lg sm:leading-relaxed">
                    {course.excerpt}
                  </p>
                )}
                <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-slate-300">
                  <span className="inline-flex items-center gap-1.5">
                    <BookOpen className="h-4 w-4 text-indigo-300" />
                    {lessonCount} lessons
                  </span>
                  {course.totalDurationMinutes ? (
                    <span className="inline-flex items-center gap-1.5">
                      <Clock className="h-4 w-4 text-indigo-300" />
                      {formatDuration(course.totalDurationMinutes)}
                    </span>
                  ) : null}
                  {course.enrollmentCount != null &&
                  course.enrollmentCount > 0 ? (
                    <span className="inline-flex items-center gap-1.5">
                      <Users className="h-4 w-4 text-indigo-300" />
                      {course.enrollmentCount.toLocaleString()} enrolled
                    </span>
                  ) : null}
                  {instructorName && (
                    <span className="inline-flex items-center gap-1.5">
                      <User className="h-4 w-4 text-indigo-300" />
                      {instructorName}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </section>
        )}

        <div className="grid gap-10 lg:grid-cols-3 lg:gap-12">
          <div className="min-w-0 lg:col-span-2">
            {!heroDesktop && !heroMobile && (
              <>
                <div className="mb-4 flex flex-wrap items-center gap-2">
                  {course.level && <InlineLevelBadge level={course.level} />}
                  <span className="flex items-center gap-1 text-sm text-slate-500">
                    <BookOpen className="h-4 w-4" />
                    {lessonCount} lessons
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
              </>
            )}

            {course.heroHighlights && course.heroHighlights.length > 0 && (
              <section className="mb-8" aria-label="Course highlights">
                <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
                  What you&apos;ll learn
                </h2>
                <ul className="grid gap-2.5 sm:grid-cols-2 sm:gap-3">
                  {course.heroHighlights.map((item) => (
                    <li
                      key={item}
                      className="flex gap-3 rounded-2xl border border-slate-200/70 bg-white px-4 py-3.5 shadow-sm transition-shadow hover:shadow-md"
                    >
                      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 ring-1 ring-emerald-500/20">
                        <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
                      </span>
                      <span className="text-sm leading-snug text-slate-700">
                        {item}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {!heroDesktop && instructorName && (
              <p className="mb-6 flex items-center gap-2 text-sm text-slate-600">
                <User className="h-4 w-4 text-slate-400" />
                Instructor:{" "}
                <span className="font-medium text-slate-900">
                  {instructorName}
                </span>
              </p>
            )}

            {previewLesson && !isEnrolled && (
              <div className="mb-8 overflow-hidden rounded-2xl border border-indigo-200/70 bg-gradient-to-br from-indigo-50/90 via-white to-violet-50/50 shadow-sm">
                <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
                  <div className="flex min-w-0 gap-4">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-600/25">
                      <Play className="h-5 w-5 fill-white/20" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900">
                        Free preview available
                      </p>
                      <p className="mt-1 text-sm leading-snug text-slate-600">
                        Watch{" "}
                        <span className="font-medium text-slate-800">
                          {previewLesson.title}
                        </span>{" "}
                        before you enroll — no payment required.
                      </p>
                    </div>
                  </div>
                  <Link
                    href={getLmsUrl(
                      `/courses/${course.slug}/learn/${previewLesson.slug}`,
                    )}
                    className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-indigo-700 shadow-sm ring-1 ring-indigo-200/80 transition-all hover:bg-indigo-50 hover:ring-indigo-300"
                  >
                    <Eye className="h-4 w-4" />
                    Start preview
                  </Link>
                </div>
              </div>
            )}

            {course.description && (
              <section className="course-about mb-4 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
                <div className="border-b border-slate-100 bg-slate-50/60 px-5 py-4 sm:px-6">
                  <h2 className="text-lg font-bold tracking-tight text-slate-900 sm:text-xl">
                    About this course
                  </h2>
                  <p className="mt-0.5 text-sm text-slate-500">
                    Goals, prerequisites, and what to expect
                  </p>
                </div>
                <div
                  className="course-prose max-w-none px-5 py-5 sm:px-6 sm:py-6"
                  dangerouslySetInnerHTML={{ __html: course.description }}
                />
              </section>
            )}

            <div className="mt-8 lg:hidden">
              <Card className="shadow-md shadow-slate-200/30 ring-1 ring-slate-100/80">
                <EnrollmentCardContent {...enrollmentCardProps} />
              </Card>
            </div>
          </div>

          <div className="hidden lg:col-span-1 lg:block">
            <Card className="sticky top-24 shadow-lg shadow-slate-200/40 ring-1 ring-slate-100/80">
              <EnrollmentCardContent {...enrollmentCardProps} />
            </Card>
          </div>
        </div>

        <section className="mt-16" aria-labelledby="curriculum-heading">
          <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.06),0_8px_40px_rgba(15,23,42,0.04)]">
            <div className="border-b border-slate-100 bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 px-5 py-4 sm:px-6 sm:py-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                <h2
                  id="curriculum-heading"
                  className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl"
                >
                  Course curriculum
                </h2>

                <div className="flex flex-wrap items-center gap-x-6 gap-y-2 sm:justify-end">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 ring-1 ring-indigo-100/80">
                      <BookOpen className="h-4 w-4" strokeWidth={2} />
                    </span>
                    <div>
                      <p className="text-base font-semibold tabular-nums leading-none text-slate-900">
                        {lessonCount}
                      </p>
                      <p className="mt-0.5 text-[11px] font-medium text-slate-500">
                        Lessons
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-50 text-violet-600 ring-1 ring-violet-100/80">
                      <Clock className="h-4 w-4" strokeWidth={2} />
                    </span>
                    <div>
                      <p className="text-base font-semibold leading-none text-slate-900">
                        {course.totalDurationMinutes
                          ? formatDuration(course.totalDurationMinutes)
                          : "—"}
                      </p>
                      <p className="mt-0.5 text-[11px] font-medium text-slate-500">
                        Total duration
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <p className="mt-2 max-w-2xl text-sm leading-snug text-slate-600">
                A structured path from start to finish. Open any available
                lesson or try a free preview before you enroll.
              </p>
            </div>

            <div className="px-4 py-5 sm:px-6 sm:py-6">
              {visibleCurriculum.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 px-6 py-12 text-center">
                  <BookOpen className="mx-auto h-8 w-8 text-slate-300" />
                  <p className="mt-3 text-sm font-medium text-slate-600">
                    Curriculum coming soon
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    Lessons will appear here once they are published.
                  </p>
                </div>
              ) : (
                <div className="relative space-y-3">
                  {visibleCurriculum.map((mod, moduleIndex) => {
                    const isOpen = openModules[mod._id] === true;
                    const moduleLessonCount = mod.lessons?.length || 0;
                    const moduleDuration = getModuleDurationMinutes(mod);
                    const isLast = moduleIndex === visibleCurriculum.length - 1;
                    const moduleComplete = isModuleComplete(
                      mod,
                      lessonProgress,
                    );
                    const moduleMeta = [
                      `${moduleLessonCount} lesson${moduleLessonCount === 1 ? "" : "s"}`,
                      moduleDuration ? formatDuration(moduleDuration) : null,
                    ]
                      .filter(Boolean)
                      .join(" · ");

                    return (
                      <div
                        key={mod._id}
                        className="relative flex gap-3 sm:gap-4"
                      >
                        <div className="flex w-8 shrink-0 flex-col items-center pt-3">
                          {!isLast && (
                            <div
                              className={`absolute left-4 top-10 bottom-0 w-px -translate-x-1/2 sm:left-[1.125rem] ${
                                moduleComplete
                                  ? "bg-emerald-300"
                                  : "bg-slate-200"
                              }`}
                              aria-hidden
                            />
                          )}
                          <span
                            className={`relative z-[1] flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold tabular-nums ${
                              moduleComplete
                                ? "bg-emerald-600 text-white ring-2 ring-emerald-100"
                                : isOpen
                                  ? "bg-indigo-600 text-white ring-2 ring-indigo-100"
                                  : "border border-slate-200 bg-white text-slate-600"
                            }`}
                          >
                            {moduleComplete ? (
                              <Check className="h-4 w-4" strokeWidth={2.5} />
                            ) : (
                              moduleIndex + 1
                            )}
                          </span>
                        </div>

                        <div className="min-w-0 flex-1 pb-1">
                          <div
                            className={`overflow-hidden rounded-xl border bg-white transition-shadow ${
                              isOpen
                                ? "border-slate-200 shadow-sm"
                                : "border-slate-200/90 shadow-sm hover:border-slate-300 hover:shadow"
                            }`}
                          >
                            <button
                              type="button"
                              onClick={() => toggleModule(mod._id)}
                              className={`flex w-full cursor-pointer items-center gap-3 px-3.5 py-3 text-left transition-colors sm:px-4 ${
                                isOpen
                                  ? "bg-slate-50/80"
                                  : "hover:bg-slate-50/60"
                              }`}
                              aria-expanded={isOpen}
                            >
                              <span className="min-w-0 flex-1">
                                <span className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                                  <span className="min-w-0">
                                    <span className="text-[15px] font-semibold leading-snug text-slate-900 sm:text-base">
                                      {mod.title}
                                    </span>
                                    {mod.description && (
                                      <>
                                        <span
                                          className="mx-2 text-slate-300"
                                          aria-hidden
                                        >
                                          ·
                                        </span>
                                        <span className="text-sm font-normal text-slate-500">
                                          {mod.description}
                                        </span>
                                      </>
                                    )}
                                  </span>
                                  <span className="shrink-0 text-xs tabular-nums text-slate-500">
                                    {moduleMeta}
                                  </span>
                                </span>
                              </span>
                              <span
                                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-slate-500 transition-colors ${
                                  isOpen
                                    ? "bg-white text-indigo-600 shadow-sm ring-1 ring-slate-200/80"
                                    : "bg-slate-100/80"
                                }`}
                              >
                                <ChevronDown
                                  className={`h-4 w-4 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
                                />
                              </span>
                            </button>

                            <div
                              className={`grid transition-[grid-template-rows] duration-200 ease-out ${
                                isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                              }`}
                            >
                              <div className="overflow-hidden">
                                <ul className="border-t border-slate-100">
                                  {(mod.lessons || []).map((lesson) => {
                                    const canOpen = canOpenLesson(lesson);
                                    const sequentiallyLocked =
                                      isSequentiallyLockedLesson(lesson);
                                    const showEnrollmentPrompt =
                                      !canOpen && !sequentiallyLocked;
                                    const duration =
                                      getLessonDurationLabel(lesson);
                                    const isPreview = lesson.isPreview;
                                    const lessonCompleted =
                                      lessonProgress[lesson._id] === true;

                                    const rowClass = `group flex w-full items-center gap-3 px-3.5 py-2.5 text-left transition-colors sm:px-4 sm:py-3 ${
                                      lessonCompleted
                                        ? "border-l-2 border-l-emerald-400 hover:bg-emerald-50/40"
                                        : canOpen
                                          ? isPreview
                                            ? "border-l-2 border-l-emerald-400 hover:bg-emerald-50/50"
                                            : "border-l-2 border-l-transparent hover:border-l-indigo-500 hover:bg-indigo-50/30"
                                          : showEnrollmentPrompt
                                            ? "cursor-pointer border-l-2 border-l-transparent hover:border-l-amber-400 hover:bg-amber-50/40"
                                            : "border-l-2 border-l-transparent bg-slate-50/40"
                                    }`;

                                    const rowInner = (
                                      <>
                                        <LessonTypeIcon
                                          type={lesson.type}
                                          subdued={!canOpen && !lessonCompleted}
                                          preview={
                                            isPreview &&
                                            canOpen &&
                                            !lessonCompleted
                                          }
                                          completed={lessonCompleted}
                                        />
                                        <span className="min-w-0 flex-1">
                                          <span
                                            className={`block text-sm font-medium leading-snug ${
                                              lessonCompleted
                                                ? "text-slate-500"
                                                : canOpen
                                                  ? "text-slate-800 group-hover:text-slate-900"
                                                  : "text-slate-500"
                                            }`}
                                          >
                                            {lesson.title}
                                          </span>
                                          {lesson.sequentiallyLocked &&
                                            !canOpen && (
                                              <span className="mt-0.5 block text-xs text-slate-400">
                                                Complete the previous lesson
                                                first
                                              </span>
                                            )}
                                        </span>
                                        <span className="flex shrink-0 items-center gap-2">
                                          {isPreview && (
                                            <Badge variant="success">
                                              Preview
                                            </Badge>
                                          )}
                                          <span className="min-w-[2.75rem] text-right text-xs tabular-nums text-slate-400">
                                            {duration ?? ""}
                                          </span>
                                          {canOpen ? (
                                            lessonCompleted ? (
                                              <Check className="h-4 w-4 text-emerald-500" />
                                            ) : (
                                              <ChevronRight className="h-4 w-4 text-slate-300 transition-colors group-hover:text-indigo-600" />
                                            )
                                          ) : (
                                            <Lock className="h-3.5 w-3.5 shrink-0 text-slate-300" />
                                          )}
                                        </span>
                                      </>
                                    );

                                    return (
                                      <li
                                        key={lesson._id}
                                        className="border-b border-slate-100 last:border-b-0"
                                      >
                                        {canOpen ? (
                                          <Link
                                            href={getLmsUrl(
                                              `/courses/${course.slug}/learn/${lesson.slug}`,
                                            )}
                                            className={rowClass}
                                          >
                                            {rowInner}
                                          </Link>
                                        ) : showEnrollmentPrompt ? (
                                          <button
                                            type="button"
                                            onClick={() =>
                                              handleLockedLessonClick(lesson)
                                            }
                                            className={rowClass}
                                          >
                                            {rowInner}
                                          </button>
                                        ) : (
                                          <div className={rowClass}>
                                            {rowInner}
                                          </div>
                                        )}
                                      </li>
                                    );
                                  })}
                                </ul>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </section>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200/80 bg-white/95 p-4 shadow-[0_-8px_30px_rgba(15,23,42,0.08)] backdrop-blur-lg lg:hidden">
        {isEnrolled ? (
          <Link href={continueHref} className={primaryButtonLg}>
            <Play className="h-4 w-4" />
            Continue learning
          </Link>
        ) : (
          <div className="flex flex-col gap-2">
            <Button
              className="w-full"
              size="lg"
              disabled={loading}
              onClick={handleEnroll}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Please wait…
                </>
              ) : priceDisplay.isFree ? (
                "Enroll for free"
              ) : (
                `Enroll · ${formatUsd(salePrice)}`
              )}
            </Button>
            <WhatsAppContactButton href={whatsAppHref} />
          </div>
        )}
      </div>
    </div>
  );
}
