"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Download, List, Shield, X } from "lucide-react";
import type { CourseModule } from "@/types/course";
import CurriculumSidebar from "@/components/courses/CurriculumSidebar";
import VdoCipherPlayer from "@/components/courses/VdoCipherPlayer";
import {
  fetchLesson,
  getAdjacentLessons,
  submitQuizAttempt,
  updateLessonProgress,
  type LessonFetchResult,
} from "@/lib/courses";
import { Button, Card, ProgressBar, Spinner } from "@/components/ui";
import { getLmsUrl } from "@/lib/urls";

type Props = {
  courseSlug: string;
  lessonSlug: string;
  curriculum: CourseModule[];
  initialProgress: Record<string, { completed: boolean; lastPosition: number }>;
  initialEnrollmentProgress?: number;
  isStaff?: boolean;
};

function isLessonError(
  data: LessonFetchResult,
): data is { error: string; encodingStatus?: string } {
  return Boolean(data && "error" in data);
}

export default function CoursePlayer({
  courseSlug,
  lessonSlug,
  curriculum,
  initialProgress,
  initialEnrollmentProgress = 0,
  isStaff = false,
}: Props) {
  const router = useRouter();
  const [lessonData, setLessonData] = useState<LessonFetchResult>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [quizError, setQuizError] = useState("");
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
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadLesson = useCallback(async () => {
    setLoading(true);
    setQuizResult(null);
    const data = await fetchLesson(courseSlug, lessonSlug);
    setLessonData(data);
    setLoading(false);

    if (
      data &&
      !isLessonError(data) &&
      data.enrollment?.progressPercent !== undefined
    ) {
      setEnrollmentProgress(data.enrollment.progressPercent);
    }
  }, [courseSlug, lessonSlug]);

  useEffect(() => {
    loadLesson();
  }, [loadLesson]);

  const applyProgressResult = useCallback(
    (
      result: {
        enrollmentProgress?: number;
        lessonProgress?: { completed?: boolean };
      } | null,
      lessonId?: string,
    ) => {
      if (result?.enrollmentProgress !== undefined) {
        setEnrollmentProgress(result.enrollmentProgress);
      }
      if (result?.lessonProgress?.completed && lessonId) {
        setProgressMap((prev) => ({ ...prev, [lessonId]: true }));
      }
    },
    [],
  );

  const saveProgress = useCallback(
    async (markComplete = false) => {
      if (!lessonData || isLessonError(lessonData) || !lessonData.lesson)
        return null;
      const payload = {
        watchedSeconds: 0,
        lastPosition: 0,
        markComplete,
      };
      const result = await updateLessonProgress(lessonData.lesson._id, payload);
      applyProgressResult(result, lessonData.lesson._id);
      return result;
    },
    [lessonData, applyProgressResult],
  );

  useEffect(() => {
    const handleBeforeUnload = () => {
      if (
        lessonData &&
        !isLessonError(lessonData) &&
        lessonData.lesson?.type !== "video"
      ) {
        saveProgress(true);
      } else {
        saveProgress();
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [saveProgress, lessonData]);

  const handleQuizSubmit = async () => {
    if (!lessonData || isLessonError(lessonData) || !lessonData.quiz) return;
    setQuizError("");
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
      } else if (lessonData && !isLessonError(lessonData)) {
        await saveProgress(false);
      }
      router.push(`/courses/${courseSlug}/learn/${targetSlug}`);
    } finally {
      setNavigating(false);
    }
  };

  const { prev, next } = getAdjacentLessons(curriculum, lessonSlug);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (!lessonData || isLessonError(lessonData)) {
    const message = isLessonError(lessonData)
      ? lessonData.error
      : "Lesson not found or access denied.";
    const processing =
      isLessonError(lessonData) &&
      lessonData.encodingStatus &&
      lessonData.encodingStatus !== "ready";

    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <Card>
          <p
            className={`mb-4 text-sm ${processing ? "text-indigo-600" : "text-amber-700"}`}
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

  const { course, lesson, playback, quiz } = lessonData;
  const isNonVideoLesson = lesson.type !== "video";
  const lessonCompleted = progressMap[lesson._id];
  const canProceedFromQuiz =
    lesson.type !== "quiz" || lessonCompleted || quizResult?.passed;
  const canProceedFromVideo = lesson.type !== "video" || lessonCompleted;
  const canProceed = canProceedFromQuiz && canProceedFromVideo;

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      {isStaff && (
        <div className="mb-4 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm text-indigo-800">
          Admin preview mode
        </div>
      )}

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <List className="h-4 w-4" />
            Lessons
          </button>
          <h1 className="text-lg font-semibold text-slate-900">
            {course.title}
          </h1>
        </div>
        <div className="flex items-center gap-3 sm:min-w-[200px]">
          <ProgressBar value={enrollmentProgress} className="flex-1" />
          <span className="text-sm font-medium text-indigo-600">
            {enrollmentProgress}%
          </span>
        </div>
      </div>

      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-slate-900/40"
            aria-label="Close lesson menu"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 w-[min(100%,20rem)] overflow-y-auto bg-white p-4 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-900">
                Curriculum
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
            <CurriculumSidebar
              courseSlug={courseSlug}
              curriculum={curriculum}
              currentLessonSlug={lessonSlug}
              progressMap={progressMap}
              onNavigate={() => setSidebarOpen(false)}
            />
          </div>
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-12">
        <div className="hidden lg:col-span-3 lg:block">
          <CurriculumSidebar
            courseSlug={courseSlug}
            curriculum={curriculum}
            currentLessonSlug={lessonSlug}
            progressMap={progressMap}
          />
        </div>

        <div className="lg:col-span-9">
          <Card>
            <h2 className="mb-6 text-xl font-bold text-slate-900">
              {lesson.title}
            </h2>

            {lesson.type === "video" && playback && (
              <>
                <VdoCipherPlayer
                  otp={playback.otp}
                  playbackInfo={playback.playbackInfo}
                  onProgress={(seconds) => {
                    void updateLessonProgress(lesson._id, {
                      watchedSeconds: seconds,
                      lastPosition: seconds,
                    }).then((result) =>
                      applyProgressResult(result, lesson._id),
                    );
                  }}
                  onComplete={() => saveProgress(true)}
                />
                <p className="mb-6 flex items-center gap-2 text-sm text-slate-500">
                  <Shield className="h-4 w-4" />
                  This video is DRM-protected. Downloading and screen recording
                  are prohibited.
                </p>
              </>
            )}

            {lesson.type === "video" && !playback && (
              <div
                className={`mb-6 rounded-xl p-4 text-sm ${
                  lesson.video?.encodingStatus &&
                  lesson.video.encodingStatus !== "ready"
                    ? "bg-indigo-50 text-indigo-700"
                    : "bg-amber-50 text-amber-700"
                }`}
              >
                {lesson.video?.encodingStatus &&
                lesson.video.encodingStatus !== "ready"
                  ? "This video is still processing. Please check back shortly."
                  : "Video playback is unavailable. Please contact support if this persists."}
              </div>
            )}

            {lesson.type === "quiz" && quiz && (
              <div className="mb-6 space-y-4">
                {quiz.questions.map((q, qi) => (
                  <div
                    key={qi}
                    className="rounded-xl border border-slate-200 p-4"
                  >
                    <p className="mb-3 font-medium text-slate-900">
                      {q.prompt}
                    </p>
                    <div className="space-y-2">
                      {q.options.map((opt, oi) => (
                        <label
                          key={oi}
                          className={`flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 text-sm transition-colors ${
                            quizAnswers[qi] === oi
                              ? "border-indigo-300 bg-indigo-50"
                              : "border-slate-200 hover:border-slate-300"
                          } ${quizResult?.passed ? "pointer-events-none opacity-60" : ""}`}
                        >
                          <input
                            type="radio"
                            name={`q-${qi}`}
                            className="text-indigo-600"
                            checked={quizAnswers[qi] === oi}
                            disabled={!!quizResult?.passed}
                            onChange={() =>
                              setQuizAnswers((prev) => ({ ...prev, [qi]: oi }))
                            }
                          />
                          {opt}
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
                {quizResult ? (
                  <div
                    className={`rounded-xl p-4 text-sm font-medium ${
                      quizResult.passed
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-amber-50 text-amber-700"
                    }`}
                  >
                    Score: {quizResult.score}% —{" "}
                    {quizResult.passed ? "Passed!" : "Try again"}
                  </div>
                ) : (
                  <>
                    {quizError && (
                      <p className="text-sm text-red-600">{quizError}</p>
                    )}
                    <Button onClick={handleQuizSubmit}>Submit Quiz</Button>
                  </>
                )}
              </div>
            )}

            <div className="lesson-prose">
              {lesson.contentBlocks?.map((block, i) => (
                <div key={i}>
                  {block.type === "title" && <h3>{block.content}</h3>}
                  {block.type === "description" && <p>{block.content}</p>}
                  {block.type === "quote" && (
                    <blockquote>{block.content}</blockquote>
                  )}
                  {block.type === "code" && (
                    <pre>
                      <code>{block.content}</code>
                    </pre>
                  )}
                  {block.type === "image" && block.content && (
                    <img
                      src={block.content}
                      alt=""
                      className="my-4 rounded-xl select-none"
                      draggable={false}
                      onContextMenu={(e) => e.preventDefault()}
                    />
                  )}
                </div>
              ))}
            </div>

            {(lesson.type === "download" ||
              (lesson.resources && lesson.resources.length > 0)) && (
              <div className="mb-6">
                <h3 className="mb-3 text-sm font-semibold text-slate-900">
                  Downloads
                </h3>
                <ul className="space-y-2">
                  {(lesson.resources || []).map((resource, i) => (
                    <li
                      key={i}
                      className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3"
                    >
                      <span className="text-sm text-slate-700">
                        {resource.title || `Resource ${i + 1}`}
                      </span>
                      {resource.url && (
                        <a
                          href={resource.url}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                          target="_blank"
                          rel="noopener noreferrer"
                          download
                        >
                          <Download className="h-4 w-4" />
                          Download
                        </a>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="mt-8 flex items-center justify-between border-t border-slate-100 pt-6">
              {prev ? (
                <Button
                  variant="outline"
                  disabled={navigating}
                  onClick={() => handleNavigate(prev.slug)}
                >
                  <ArrowLeft className="h-4 w-4" />
                  Previous
                </Button>
              ) : (
                <span />
              )}
              {next ? (
                <Button
                  disabled={navigating || !canProceed}
                  onClick={() =>
                    handleNavigate(next.slug, {
                      markComplete: isNonVideoLesson,
                    })
                  }
                >
                  {navigating ? "Saving..." : "Next"}
                  <ArrowRight className="h-4 w-4" />
                </Button>
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
                  Mark Complete
                </Button>
              )}
            </div>
            {!canProceed && (
              <p className="mt-3 text-sm text-slate-500">
                {!canProceedFromVideo
                  ? "Watch at least 90% of the video before continuing."
                  : "Pass the quiz before continuing."}
              </p>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
