"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Download,
  FileText,
  HelpCircle,
  List,
  Shield,
  X,
} from "lucide-react";
import type { CourseModule } from "@/types/course";
import CurriculumSidebar from "@/components/courses/CurriculumSidebar";
import dynamic from "next/dynamic";

const VdoCipherPlayer = dynamic(
  () => import("@/components/courses/VdoCipherPlayer"),
  { ssr: false },
);
import {
  fetchCourseProgress,
  fetchLesson,
  getLessonResumeSeconds,
  refreshLessonPlaybackOtp,
  getAdjacentLessons,
  submitQuizAttempt,
  updateLessonProgress,
  type LessonDeviceErrorCode,
  type LessonFetchResult,
} from "@/lib/courses";
import { getLessonPosition, getLessonTypeLabel } from "@/lib/lessonUi";
import {
  clampProgress,
  getProgressFillClass,
  getProgressTrackClass,
} from "@/lib/progressColors";
import {
  Badge,
  Button,
  Card,
  ProgressBar,
  ProgressValue,
} from "@/components/ui";
import { getLmsUrl } from "@/lib/urls";
import { useAuthUser } from "@/hooks/useAuthUser";
import { canPreviewLmsContent } from "@/lib/lmsCourseAccess";
import LessonDeviceBlockedCard from "@/components/courses/LessonDeviceBlockedCard";

type Props = {
  courseSlug: string;
  courseTitle: string;
  courseId: string;
  lessonSlug: string;
  curriculum: CourseModule[];
  initialProgress: Record<string, { completed: boolean; lastPosition: number }>;
  initialEnrollmentProgress?: number;
  isStaff?: boolean;
  lessonProgression?: "sequential" | "open";
};

const OPTION_LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

function isLessonError(
  data: LessonFetchResult,
): data is Extract<LessonFetchResult, { error: string }> {
  return Boolean(data && "error" in data);
}

function isLessonDeviceError(data: LessonFetchResult): data is Extract<
  LessonFetchResult,
  { error: string }
> & {
  errorcode: LessonDeviceErrorCode;
} {
  return (
    isLessonError(data) &&
    (data.errorcode === "DEVICE_REGISTERED_ELSEWHERE" ||
      data.errorcode === "LESSON_ACCESS_BLOCKED")
  );
}

function isImageUrl(url: string, fileType?: string) {
  if (fileType?.startsWith("image/")) return true;
  return /\.(avif|gif|jpe?g|png|svg|webp)(\?.*)?$/i.test(url);
}

function resourceFileName(url: string, title?: string, index = 0) {
  const trimmedTitle = title?.trim();
  if (trimmedTitle) return trimmedTitle;
  const fromUrl = url.split("/").pop()?.split("?")[0];
  if (fromUrl) return fromUrl;
  return `resource-${index + 1}`;
}

function LessonVideoSkeleton() {
  return (
    <div className="animate-pulse space-y-5">
      <div className="mb-2 h-6 w-24 rounded-md bg-slate-100" />
      <div className="h-8 w-2/3 max-w-lg rounded-lg bg-slate-200" />
      <div className="aspect-video w-full rounded-2xl bg-slate-200" />
      <div className="h-4 w-56 rounded bg-slate-100" />
    </div>
  );
}

function LessonLoadingSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-10 rounded-xl bg-slate-200" />
      <div className="h-8 w-2/3 max-w-md rounded-lg bg-slate-200" />
      <div className="space-y-4 rounded-2xl border border-slate-200 p-6">
        <div className="h-4 w-24 rounded bg-slate-100" />
        <div className="h-6 w-full rounded bg-slate-100" />
        <div className="space-y-2">
          <div className="h-12 rounded-xl bg-slate-100" />
          <div className="h-12 rounded-xl bg-slate-100" />
          <div className="h-12 rounded-xl bg-slate-100" />
        </div>
      </div>
    </div>
  );
}

export default function CoursePlayer({
  courseSlug,
  courseTitle,
  courseId,
  lessonSlug,
  curriculum,
  initialProgress,
  initialEnrollmentProgress = 0,
  isStaff = false,
  lessonProgression = "open",
}: Props) {
  const router = useRouter();
  const { user } = useAuthUser();
  const effectiveIsStaff = isStaff || canPreviewLmsContent(user);
  const [lessonData, setLessonData] = useState<LessonFetchResult>(null);
  const [loading, setLoading] = useState(true);
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  const [lessonPlaybackResumeSeconds, setLessonPlaybackResumeSeconds] =
    useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [quizError, setQuizError] = useState("");
  const [quizSubmitting, setQuizSubmitting] = useState(false);
  const [progressMap, setProgressMap] = useState<Record<string, boolean>>(
    () => {
      const map: Record<string, boolean> = {};
      Object.entries(initialProgress).forEach(([id, p]) => {
        map[id] = p.completed;
      });
      return map;
    },
  );
  const [enrollmentProgress, setEnrollmentProgress] = useState(
    initialEnrollmentProgress,
  );
  const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>({});
  const [quizResult, setQuizResult] = useState<{
    passed: boolean;
    score: number;
  } | null>(null);
  const [navigating, setNavigating] = useState(false);
  const isFirstLessonSlugEffect = useRef(true);
  const videoPlaybackRef = useRef({ watchedSeconds: 0, lastPosition: 0 });
  const [resumePositionByLesson, setResumePositionByLesson] = useState<
    Record<string, number>
  >(() => {
    const map: Record<string, number> = {};
    for (const [id, entry] of Object.entries(initialProgress)) {
      if (!entry.completed && entry.lastPosition > 0) {
        map[id] = Math.max(map[id] ?? 0, entry.lastPosition);
      }
    }
    return map;
  });

  const lessonPosition = getLessonPosition(curriculum, lessonSlug);

  const mergeProgressPositions = useCallback(
    (
      progressList: {
        lessonId: string;
        completed: boolean;
        lastPosition?: number;
        watchedSeconds?: number;
      }[],
    ) => {
      setResumePositionByLesson((prev) => {
        const next = { ...prev };
        for (const row of progressList) {
          const id = String(row.lessonId);
          if (row.completed) {
            delete next[id];
            continue;
          }
          const pos = Math.max(
            Number(row.lastPosition) || 0,
            Number(row.watchedSeconds) || 0,
          );
          if (pos > 0) {
            next[id] = Math.max(next[id] ?? 0, pos);
          }
        }
        return next;
      });
    },
    [],
  );

  useEffect(() => {
    videoPlaybackRef.current = { watchedSeconds: 0, lastPosition: 0 };
    const lessonId = lessonPosition.lesson?._id;
    const saved = lessonId ? resumePositionByLesson[lessonId] : 0;
    if (saved > 0) {
      videoPlaybackRef.current = {
        watchedSeconds: saved,
        lastPosition: saved,
      };
    }
  }, [lessonSlug, lessonPosition.lesson?._id, resumePositionByLesson]);

  const loadLesson = useCallback(async () => {
    setLoading(true);
    setQuizResult(null);
    setQuizAnswers({});
    const [data, progressPayload] = await Promise.all([
      fetchLesson(courseSlug, lessonSlug),
      fetchCourseProgress(courseId),
    ]);

    mergeProgressPositions(progressPayload.progress);
    setProgressMap((prev) => {
      const next = { ...prev };
      for (const row of progressPayload.progress) {
        if (row.completed) {
          next[String(row.lessonId)] = true;
        }
      }
      return next;
    });

    let resumeSeconds = 0;
    if (data && !isLessonError(data)) {
      resumeSeconds = getLessonResumeSeconds(
        progressPayload.progress,
        data.lesson._id,
      );
    }
    setLessonPlaybackResumeSeconds(resumeSeconds);

    setLessonData(data);
    setLoading(false);
    setInitialLoadDone(true);

    if (
      data &&
      !isLessonError(data) &&
      data.enrollment?.progressPercent !== undefined
    ) {
      setEnrollmentProgress(data.enrollment.progressPercent);
    }
  }, [courseSlug, lessonSlug, courseId, mergeProgressPositions]);

  useEffect(() => {
    loadLesson();
  }, [loadLesson]);

  useLayoutEffect(() => {
    if (isFirstLessonSlugEffect.current) {
      isFirstLessonSlugEffect.current = false;
      return;
    }
    setLoading(true);
    setLessonData(null);
    setLessonPlaybackResumeSeconds(0);
    setQuizResult(null);
    setQuizAnswers({});
  }, [lessonSlug]);

  const applyProgressResult = useCallback(
    (
      result: {
        enrollmentProgress?: number;
        lessonProgress?: {
          completed?: boolean;
          lastPosition?: number;
          watchedSeconds?: number;
        };
      } | null,
      lessonId?: string,
    ) => {
      if (result?.enrollmentProgress !== undefined) {
        setEnrollmentProgress(result.enrollmentProgress);
      }
      if (lessonId && result?.lessonProgress) {
        const lp = result.lessonProgress;
        if (lp.completed) {
          setProgressMap((prev) => ({ ...prev, [lessonId]: true }));
          setResumePositionByLesson((prev) => {
            if (!prev[lessonId]) return prev;
            const next = { ...prev };
            delete next[lessonId];
            return next;
          });
        } else {
          const pos = Math.max(
            Number(lp.lastPosition) || 0,
            Number(lp.watchedSeconds) || 0,
          );
          if (pos > 0) {
            setResumePositionByLesson((prev) => ({
              ...prev,
              [lessonId]: Math.max(prev[lessonId] ?? 0, pos),
            }));
          }
        }
      }
    },
    [],
  );

  const saveProgress = useCallback(
    async (markComplete = false) => {
      if (!lessonData || isLessonError(lessonData) || !lessonData.lesson)
        return null;

      const { lesson } = lessonData;
      const payload: {
        watchedSeconds?: number;
        lastPosition?: number;
        markComplete?: boolean;
      } = {};

      if (markComplete) {
        payload.markComplete = true;
      }

      if (lesson.type === "video") {
        const { watchedSeconds, lastPosition } = videoPlaybackRef.current;
        if (watchedSeconds > 0) {
          payload.watchedSeconds = watchedSeconds;
        }
        if (lastPosition > 0) {
          payload.lastPosition = lastPosition;
        }
      }

      if (!markComplete && Object.keys(payload).length === 0) {
        return null;
      }

      const result = await updateLessonProgress(lesson._id, payload);
      applyProgressResult(result, lesson._id);
      return result;
    },
    [lessonData, applyProgressResult],
  );

  const navigateToLesson = useCallback(
    async (targetSlug: string) => {
      if (targetSlug === lessonSlug) return;
      if (navigating) return;
      setNavigating(true);
      try {
        await saveProgress(false);
        const href = `/courses/${courseSlug}/learn/${targetSlug}`;
        router.prefetch(href);
        router.push(href, { scroll: false });
      } finally {
        setNavigating(false);
      }
    },
    [courseSlug, lessonSlug, navigating, router, saveProgress],
  );

  const handleQuizSubmit = async () => {
    if (!lessonData || isLessonError(lessonData) || !lessonData.quiz) return;
    setQuizError("");
    setQuizSubmitting(true);
    const answers = Object.entries(quizAnswers).map(([qi, selectedIndex]) => ({
      questionIndex: Number(qi),
      selectedIndex,
    }));
    try {
      const result = await submitQuizAttempt(lessonData.quiz._id, answers);
      setQuizResult({ passed: result.passed, score: result.score });
      if (result.passed && lessonData.lesson) {
        setProgressMap((prev) => ({ ...prev, [lessonData.lesson._id]: true }));
        if (result.enrollmentProgress !== undefined) {
          setEnrollmentProgress(result.enrollmentProgress);
        }
      }
    } catch (e) {
      setQuizError(e instanceof Error ? e.message : "Quiz submission failed");
    } finally {
      setQuizSubmitting(false);
    }
  };

  const handleNavigate = async (
    targetSlug: string,
    { markComplete = false }: { markComplete?: boolean } = {},
  ) => {
    if (navigating) return;
    setNavigating(true);
    try {
      if (markComplete) {
        await saveProgress(true);
      } else if (
        lessonData &&
        !isLessonError(lessonData) &&
        lessonData.lesson.type === "video"
      ) {
        await saveProgress(false);
      }
      const href = `/courses/${courseSlug}/learn/${targetSlug}`;
      router.prefetch(href);
      router.push(href, { scroll: false });
    } finally {
      setNavigating(false);
    }
  };

  const { prev, next } = getAdjacentLessons(curriculum, lessonSlug);

  const sidebarProps = {
    courseSlug,
    curriculum,
    currentLessonSlug: lessonSlug,
    progressMap,
    enrollmentProgress,
    isStaff: effectiveIsStaff,
    lessonProgression,
    onLessonLinkClick: navigateToLesson,
  };

  if (loading && !initialLoadDone) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <LessonLoadingSkeleton />
      </div>
    );
  }

  if (initialLoadDone && (loading || !lessonData)) {
    const pendingLesson = lessonPosition.lesson;
    const { prev: switchPrev, next: switchNext } = getAdjacentLessons(
      curriculum,
      lessonSlug,
    );

    return (
      <>
        <div className="sticky top-16 z-30 border-b border-slate-200/80 bg-white/95 backdrop-blur-lg">
          <div className="mx-auto max-w-7xl px-4 py-2.5 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3">
              <button
                type="button"
                className="inline-flex shrink-0 items-center justify-center rounded-lg border border-slate-200 p-2 text-slate-600 transition-colors hover:bg-slate-50 lg:hidden"
                onClick={() => setSidebarOpen(true)}
                aria-label="Open curriculum"
              >
                <List className="h-4 w-4" />
              </button>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <Link
                    href={`/courses/${courseSlug}`}
                    className="truncate transition-colors hover:text-indigo-600"
                  >
                    {courseTitle}
                  </Link>
                  {lessonPosition.index > 0 && (
                    <>
                      <span className="text-slate-300">/</span>
                      <span className="shrink-0 tabular-nums">
                        {lessonPosition.index}/{lessonPosition.total}
                      </span>
                    </>
                  )}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <div className="hidden min-w-[5rem] sm:block">
                  <ProgressBar value={enrollmentProgress} />
                </div>
                <ProgressValue value={enrollmentProgress} asBadge />
              </div>
            </div>
          </div>
        </div>

        {sidebarOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <button
              type="button"
              className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
              aria-label="Close lesson menu"
              onClick={() => setSidebarOpen(false)}
            />
            <div className="absolute inset-y-0 left-0 flex w-[min(100%,22rem)] flex-col bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                <h2 className="text-sm font-semibold text-slate-900">
                  Course content
                </h2>
                <button
                  type="button"
                  className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                  onClick={() => setSidebarOpen(false)}
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                <CurriculumSidebar
                  {...sidebarProps}
                  onLessonLinkClick={async (targetSlug) => {
                    await navigateToLesson(targetSlug);
                    setSidebarOpen(false);
                  }}
                />
              </div>
            </div>
          </div>
        )}

        <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8 lg:py-6 pb-28 lg:pb-8">
          <div className="grid gap-6 lg:grid-cols-12 lg:gap-8">
            <div className="hidden lg:col-span-4 xl:col-span-3 lg:block">
              <CurriculumSidebar {...sidebarProps} />
            </div>
            <div className="lg:col-span-8 xl:col-span-9">
              {pendingLesson ? (
                <header className="mb-5">
                  <div className="mb-2">
                    <Badge variant="default">
                      {getLessonTypeLabel(pendingLesson.type)}
                    </Badge>
                  </div>
                  <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
                    {pendingLesson.title}
                  </h1>
                </header>
              ) : null}
              <LessonVideoSkeleton />
            </div>
          </div>
        </div>

        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200/80 bg-white/95 p-3 backdrop-blur-lg lg:hidden">
          <div className="flex items-center gap-2">
            {switchPrev ? (
              <Button
                variant="outline"
                disabled={navigating || loading}
                onClick={() => handleNavigate(switchPrev.slug)}
                className="min-w-0 flex-1"
              >
                <ArrowLeft className="h-4 w-4" />
                Previous
              </Button>
            ) : (
              <span className="flex-1" />
            )}
            {switchNext ? (
              <Button
                disabled={navigating || loading}
                onClick={() => handleNavigate(switchNext.slug)}
                className="min-w-0 flex-1"
              >
                Next
                <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <span className="flex-1" />
            )}
          </div>
        </div>
      </>
    );
  }

  if (!loading && (!lessonData || isLessonError(lessonData))) {
    const message = isLessonError(lessonData)
      ? lessonData.error
      : "Lesson not found or access denied.";
    const encodingStatus = isLessonError(lessonData)
      ? lessonData.encodingStatus
      : undefined;
    const processing =
      isLessonError(lessonData) &&
      encodingStatus &&
      encodingStatus !== "ready" &&
      encodingStatus !== "failed";
    const encodingFailed =
      isLessonError(lessonData) && encodingStatus === "failed";

    if (lessonData && isLessonDeviceError(lessonData)) {
      return (
        <LessonDeviceBlockedCard
          courseSlug={courseSlug}
          courseTitle={courseTitle}
          courseId={courseId}
          lessonSlug={lessonSlug}
          errorcode={lessonData.errorcode}
          message={lessonData.error}
        />
      );
    }

    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <Card>
          <p
            className={`mb-4 text-sm ${
              encodingFailed
                ? "text-red-700"
                : processing
                  ? "text-indigo-600"
                  : "text-amber-700"
            }`}
          >
            {message}
          </p>
          <Link href={getLmsUrl(`/courses/${courseSlug}`)}>
            <Button variant="outline">Back to course</Button>
          </Link>
        </Card>
      </div>
    );
  }

  if (!lessonData || isLessonError(lessonData)) {
    return null;
  }

  const { course, lesson, playback, quiz } = lessonData;
  const isQuizLesson = lesson.type === "quiz";
  const isNonVideoLesson = lesson.type !== "video";
  const lessonCompleted = Boolean(progressMap[lesson._id]);
  const canProceedFromQuiz =
    !isQuizLesson || lessonCompleted || quizResult?.passed === true;
  const canProceedFromVideo = lesson.type !== "video" || lessonCompleted;
  const canProceed = Boolean(canProceedFromQuiz && canProceedFromVideo);
  const quizAnsweredCount = Object.keys(quizAnswers).length;
  const quizTotalQuestions = quiz?.questions.length ?? 0;
  const quizReadyToSubmit =
    quizAnsweredCount >= quizTotalQuestions && !quizResult;
  const showQuizStickyBar = isQuizLesson && quiz && !quizResult?.passed;

  return (
    <>
      {/* Top bar */}
      <div className="sticky top-16 z-30 border-b border-slate-200/80 bg-white/95 backdrop-blur-lg">
        <div className="mx-auto max-w-7xl px-4 py-2.5 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="inline-flex shrink-0 items-center justify-center rounded-lg border border-slate-200 p-2 text-slate-600 transition-colors hover:bg-slate-50 lg:hidden"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open curriculum"
            >
              <List className="h-4 w-4" />
            </button>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <Link
                  href={`/courses/${courseSlug}`}
                  className="truncate transition-colors hover:text-indigo-600"
                >
                  {course.title}
                </Link>
                {lessonPosition.index > 0 && (
                  <>
                    <span className="text-slate-300">/</span>
                    <span className="shrink-0 tabular-nums">
                      {lessonPosition.index}/{lessonPosition.total}
                    </span>
                  </>
                )}
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <div className="hidden min-w-[5rem] sm:block">
                <ProgressBar value={enrollmentProgress} />
              </div>
              <ProgressValue value={enrollmentProgress} asBadge />
            </div>
          </div>
        </div>
      </div>

      {effectiveIsStaff && (
        <div className="border-b border-indigo-100 bg-indigo-50 px-4 py-1.5 text-center text-xs text-indigo-800">
          Admin preview — progress may not be saved
        </div>
      )}

      {/* Mobile sidebar drawer */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
            aria-label="Close lesson menu"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 flex w-[min(100%,22rem)] flex-col bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <h2 className="text-sm font-semibold text-slate-900">
                Course content
              </h2>
              <button
                type="button"
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                onClick={() => setSidebarOpen(false)}
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <CurriculumSidebar
                {...sidebarProps}
                onLessonLinkClick={async (targetSlug) => {
                  await navigateToLesson(targetSlug);
                  setSidebarOpen(false);
                }}
              />
            </div>
          </div>
        </div>
      )}

      <div
        className={`mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8 lg:py-6 ${
          showQuizStickyBar ? "pb-36 lg:pb-28" : "pb-28 lg:pb-8"
        }`}
      >
        <div className="grid gap-6 lg:grid-cols-12 lg:gap-8">
          <div className="hidden lg:col-span-4 xl:col-span-3 lg:block">
            <CurriculumSidebar {...sidebarProps} />
          </div>

          <div className="lg:col-span-8 xl:col-span-9">
            {/* Lesson meta — single source, no duplicate lesson count */}
            <header className="mb-5">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <Badge variant={lessonCompleted ? "success" : "default"}>
                  {lessonCompleted
                    ? "Completed"
                    : getLessonTypeLabel(lesson.type)}
                </Badge>
                {isQuizLesson && quiz && (
                  <span className="text-xs text-slate-500">
                    {quizTotalQuestions} question
                    {quizTotalQuestions === 1 ? "" : "s"} · pass{" "}
                    {quiz.passingScore}%
                  </span>
                )}
              </div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
                {lesson.title}
              </h1>
            </header>

            {/* Video */}
            {lesson.type === "video" && playback && (
              <>
                <VdoCipherPlayer
                  key={lesson._id}
                  otp={playback.otp}
                  playbackInfo={playback.playbackInfo}
                  ttlSeconds={playback.ttlSeconds}
                  initialResumeSeconds={
                    progressMap[lesson._id]
                      ? 0
                      : lessonPlaybackResumeSeconds ||
                        resumePositionByLesson[lesson._id] ||
                        0
                  }
                  onRefreshPlayback={async () => {
                    const refreshed = await refreshLessonPlaybackOtp(
                      courseSlug,
                      lessonSlug,
                    );
                    return refreshed?.playback ?? null;
                  }}
                  onProgress={(seconds) => {
                    videoPlaybackRef.current = {
                      watchedSeconds: Math.max(
                        videoPlaybackRef.current.watchedSeconds,
                        seconds,
                      ),
                      lastPosition: seconds,
                    };
                    void updateLessonProgress(lesson._id, {
                      watchedSeconds: seconds,
                      lastPosition: seconds,
                    }).then((result) =>
                      applyProgressResult(result, lesson._id),
                    );
                  }}
                  onComplete={() => saveProgress(true)}
                />
                <p className="mb-5 flex items-center gap-2 text-xs text-slate-500">
                  <Shield className="h-3.5 w-3.5 shrink-0" />
                  DRM-protected — downloading and screen recording prohibited.
                </p>
              </>
            )}

            {lesson.type === "video" && !playback && (
              <div
                className={`mb-5 rounded-2xl border px-4 py-4 text-sm ${
                  lesson.video?.encodingStatus === "failed"
                    ? "border-red-100 bg-red-50 text-red-700"
                    : lesson.video?.encodingStatus &&
                        lesson.video.encodingStatus !== "ready"
                      ? "border-indigo-100 bg-indigo-50 text-indigo-700"
                      : "border-amber-100 bg-amber-50 text-amber-700"
                }`}
              >
                {lesson.video?.encodingStatus === "failed"
                  ? "Video encoding failed. Please contact support."
                  : lesson.video?.encodingStatus &&
                      lesson.video.encodingStatus !== "ready"
                    ? "This video is still processing. Please check back shortly."
                    : "Video playback is unavailable. Please contact support if this persists."}
              </div>
            )}

            {/* Quiz — flat panel, no card-in-card */}
            {isQuizLesson && quiz && (
              <div className="quiz-panel">
                {!quizResult && (
                  <div className="mb-5 flex items-center gap-3 rounded-xl border border-indigo-100 bg-indigo-50/50 px-4 py-3">
                    <HelpCircle className="h-5 w-5 shrink-0 text-indigo-600" />
                    <p className="text-sm text-slate-700">
                      Select an answer for each question, then submit to
                      continue.
                    </p>
                  </div>
                )}

                {/* Answer progress dots */}
                {!quizResult && quizTotalQuestions > 1 && (
                  <div className="mb-5">
                    <div className="mb-1.5 flex items-center justify-between text-xs">
                      <span className="text-slate-500">Quiz progress</span>
                      <ProgressValue
                        value={clampProgress(
                          (quizAnsweredCount / quizTotalQuestions) * 100,
                        )}
                        className="text-xs"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      {quiz.questions.map((_, qi) => {
                        const quizPercent = clampProgress(
                          (quizAnsweredCount / quizTotalQuestions) * 100,
                        );
                        const answered = quizAnswers[qi] !== undefined;
                        return (
                          <span
                            key={qi}
                            className={`h-2 flex-1 rounded-full transition-all duration-300 ${
                              answered
                                ? getProgressFillClass(quizPercent)
                                : getProgressTrackClass(quizPercent)
                            }`}
                            title={`Question ${qi + 1}`}
                          />
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="space-y-6">
                  {quiz.questions.map((q, qi) => (
                    <section
                      key={qi}
                      className={`rounded-2xl border bg-white p-5 shadow-sm transition-shadow ${
                        quizAnswers[qi] !== undefined
                          ? "border-indigo-200/80"
                          : "border-slate-200/80"
                      }`}
                    >
                      <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-400">
                        Question {qi + 1}
                      </p>
                      <p className="mb-4 text-base font-medium leading-relaxed text-slate-900">
                        {q.prompt}
                      </p>
                      <div className="space-y-2" role="radiogroup">
                        {q.options.map((opt, oi) => {
                          const selected = quizAnswers[qi] === oi;
                          return (
                            <label
                              key={oi}
                              className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3.5 py-3 text-sm transition-all ${
                                selected
                                  ? "border-indigo-400 bg-indigo-50 shadow-sm shadow-indigo-100"
                                  : "border-slate-200 hover:border-slate-300 hover:bg-slate-50/80"
                              } ${quizResult?.passed ? "pointer-events-none opacity-60" : ""}`}
                            >
                              <span
                                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
                                  selected
                                    ? "bg-indigo-600 text-white"
                                    : "bg-slate-100 text-slate-600"
                                }`}
                              >
                                {OPTION_LETTERS[oi] ?? oi + 1}
                              </span>
                              <input
                                type="radio"
                                name={`q-${qi}`}
                                className="sr-only"
                                checked={selected}
                                disabled={!!quizResult?.passed}
                                onChange={() =>
                                  setQuizAnswers((prev) => ({
                                    ...prev,
                                    [qi]: oi,
                                  }))
                                }
                              />
                              <span className="flex-1 leading-relaxed">
                                {opt}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </section>
                  ))}
                </div>

                {quizResult && (
                  <div
                    className={`mt-6 flex items-start gap-3 rounded-2xl border p-4 ${
                      quizResult.passed
                        ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                        : "border-amber-200 bg-amber-50 text-amber-800"
                    }`}
                  >
                    {quizResult.passed ? (
                      <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                    ) : (
                      <HelpCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                    )}
                    <div className="text-sm">
                      <p className="font-semibold">
                        {quizResult.passed ? "Passed!" : "Not quite"}{" "}
                        <span className="font-normal">
                          — Score: {quizResult.score}%
                        </span>
                      </p>
                      <p className="mt-0.5">
                        {quizResult.passed
                          ? "You can continue to the next lesson."
                          : "Review your answers and try again."}
                      </p>
                      {!quizResult.passed && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-3"
                          onClick={() => {
                            setQuizResult(null);
                            setQuizAnswers({});
                          }}
                        >
                          Try again
                        </Button>
                      )}
                    </div>
                  </div>
                )}

                {quizError && (
                  <p className="mt-4 text-sm text-red-600">{quizError}</p>
                )}
              </div>
            )}

            {/* Text / downloads content */}
            {(lesson.contentBlocks?.length ||
              lesson.type === "download" ||
              (lesson.resources && lesson.resources.length > 0)) && (
              <Card
                className={`${isQuizLesson ? "mt-6" : ""} lesson-content-card`}
              >
                {lesson.contentBlocks && lesson.contentBlocks.length > 0 && (
                  <div className="lesson-prose">
                    {lesson.contentBlocks.map((block, i) => (
                      <div key={i}>
                        {block.type === "title" && <h3>{block.content}</h3>}
                        {block.type === "description" && <p>{block.content}</p>}
                        {block.type === "quote" && (
                          <blockquote>{block.content}</blockquote>
                        )}
                        {block.type === "image" && block.content && (
                          <figure className="my-4">
                            <img
                              src={block.content}
                              alt=""
                              className="w-full rounded-xl select-none"
                              draggable={false}
                              onContextMenu={(e) => e.preventDefault()}
                            />
                            <figcaption className="mt-2 flex justify-end">
                              <a
                                href={block.content}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                                target="_blank"
                                rel="noopener noreferrer"
                                download
                              >
                                <Download className="h-4 w-4" />
                                Download
                              </a>
                            </figcaption>
                          </figure>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {(lesson.type === "download" ||
                  (lesson.resources && lesson.resources.length > 0)) && (
                  <div>
                    <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-900">
                      <Download className="h-4 w-4 text-indigo-600" />
                      Downloads & resources
                    </h3>
                    <ul className="space-y-3">
                      {(lesson.resources || []).map((resource, i) => {
                        const showImagePreview =
                          resource.url &&
                          isImageUrl(resource.url, resource.fileType);

                        return (
                          <li
                            key={i}
                            className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50/30"
                          >
                            <div className="flex items-center justify-between gap-3 px-4 py-3">
                              <div className="flex min-w-0 items-center gap-3">
                                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-indigo-600 ring-1 ring-slate-200/80">
                                  <FileText className="h-4 w-4" />
                                </span>
                                <span className="truncate text-sm font-medium text-slate-800">
                                  {resource.title || `Resource ${i + 1}`}
                                </span>
                              </div>
                              {resource.url && (
                                <a
                                  href={resource.url}
                                  className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-sm font-medium text-indigo-600 ring-1 ring-slate-200/80 hover:bg-indigo-50"
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  download={resourceFileName(
                                    resource.url,
                                    resource.title,
                                    i,
                                  )}
                                >
                                  <Download className="h-4 w-4" />
                                  Download
                                </a>
                              )}
                            </div>
                            {showImagePreview && (
                              <div className="border-t border-slate-100 bg-white px-4 py-3">
                                <img
                                  src={resource.url}
                                  alt={resource.title || `Resource ${i + 1}`}
                                  className="mx-auto max-h-80 w-full rounded-lg object-contain"
                                />
                              </div>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
              </Card>
            )}

            {!canProceed && !isQuizLesson && (
              <div className="mt-5 rounded-xl border border-amber-100 bg-amber-50/80 px-4 py-3 text-sm text-amber-800">
                Watch at least 90% of the video before continuing.
              </div>
            )}

            {/* Desktop navigation */}
            <div className="mt-8 hidden rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm lg:block">
              <div className="flex items-center gap-4">
                {prev ? (
                  <button
                    type="button"
                    disabled={navigating}
                    onClick={() => handleNavigate(prev.slug)}
                    className="group flex min-w-0 flex-1 items-center gap-3 rounded-xl border border-slate-200 px-4 py-3 text-left transition-colors hover:border-slate-300 hover:bg-slate-50 disabled:opacity-50"
                  >
                    <ArrowLeft className="h-4 w-4 shrink-0 text-slate-400 group-hover:text-indigo-600" />
                    <span className="min-w-0">
                      <span className="block text-xs text-slate-500">
                        Previous
                      </span>
                      <span className="block truncate text-sm font-medium text-slate-900">
                        {prev.title}
                      </span>
                    </span>
                  </button>
                ) : (
                  <div className="flex-1" />
                )}

                {next ? (
                  <button
                    type="button"
                    disabled={navigating || !canProceed}
                    onClick={() =>
                      handleNavigate(next.slug, {
                        markComplete: isNonVideoLesson,
                      })
                    }
                    className="group flex min-w-0 flex-1 items-center justify-end gap-3 rounded-xl border border-slate-200 px-4 py-3 text-right transition-colors hover:border-indigo-200 hover:bg-indigo-50/50 disabled:opacity-50"
                  >
                    <span className="min-w-0">
                      <span className="block text-xs text-slate-500">Next</span>
                      <span className="block truncate text-sm font-medium text-slate-900">
                        {next.title}
                      </span>
                    </span>
                    <ArrowRight className="h-4 w-4 shrink-0 text-slate-400 group-hover:text-indigo-600" />
                  </button>
                ) : (
                  <Button
                    variant="success"
                    disabled={navigating || !canProceed}
                    onClick={async () => {
                      setNavigating(true);
                      await saveProgress(true);
                      setNavigating(false);
                    }}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    {navigating ? "Saving..." : "Complete course"}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile bottom bar */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200/80 bg-white/95 p-3 shadow-[0_-8px_30px_rgba(15,23,42,0.08)] backdrop-blur-lg lg:hidden">
        {showQuizStickyBar ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>
                {quizAnsweredCount}/{quizTotalQuestions} answered
              </span>
              {!canProceed && (
                <span className="text-amber-600">Pass quiz to continue</span>
              )}
            </div>
            <Button
              className="w-full"
              disabled={!quizReadyToSubmit || quizSubmitting}
              onClick={handleQuizSubmit}
            >
              {quizSubmitting
                ? "Submitting..."
                : quizReadyToSubmit
                  ? "Submit quiz"
                  : `Answer all ${quizTotalQuestions} questions`}
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            {prev ? (
              <Button
                variant="outline"
                disabled={navigating}
                onClick={() => handleNavigate(prev.slug)}
                className="min-w-0 flex-1"
              >
                <ArrowLeft className="h-4 w-4" />
                Previous
              </Button>
            ) : (
              <span className="flex-1" />
            )}
            {next ? (
              <Button
                disabled={navigating || !canProceed}
                onClick={() =>
                  handleNavigate(next.slug, {
                    markComplete: isNonVideoLesson,
                  })
                }
                className="min-w-0 flex-1"
              >
                {navigating ? "Saving..." : "Next"}
                <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                variant="success"
                disabled={navigating || !canProceed}
                className="min-w-0 flex-1"
                onClick={async () => {
                  setNavigating(true);
                  await saveProgress(true);
                  setNavigating(false);
                }}
              >
                Complete
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Desktop quiz sticky submit */}
      {showQuizStickyBar && (
        <div className="fixed inset-x-0 bottom-0 z-40 hidden border-t border-slate-200/80 bg-white/95 px-4 py-3 shadow-[0_-8px_30px_rgba(15,23,42,0.08)] backdrop-blur-lg lg:block">
          <div className="mx-auto flex max-w-3xl items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-900">
                {quizAnsweredCount}/{quizTotalQuestions} questions answered
              </p>
              <p className="text-xs text-slate-500">
                Submit your answers to unlock the next lesson
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              {quizError && <p className="text-sm text-red-600">{quizError}</p>}
              <Button
                disabled={!quizReadyToSubmit || quizSubmitting}
                onClick={handleQuizSubmit}
              >
                {quizSubmitting
                  ? "Submitting..."
                  : quizReadyToSubmit
                    ? "Submit quiz"
                    : "Answer all questions"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
