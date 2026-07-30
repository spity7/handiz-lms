"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, ChevronDown, Lock } from "lucide-react";
import type { CourseModule, Lesson } from "@/types/course";
import LessonTypeIcon from "@/components/courses/LessonTypeIcon";
import { ProgressBar, ProgressValue } from "@/components/ui";
import {
  getProgressFillClass,
  getProgressRatioClass,
  getProgressTrackClass,
} from "@/lib/progressColors";
import {
  getLessonDisplayTitle,
  getLessonDurationLabel,
  getModuleProgress,
} from "@/lib/lessonUi";

type Props = {
  courseSlug: string;
  curriculum: CourseModule[];
  currentLessonSlug: string;
  progressMap: Record<string, boolean>;
  enrollmentProgress?: number;
  onNavigate?: () => void;
};

function findModuleForLesson(
  curriculum: CourseModule[],
  lessonSlug: string,
): string | null {
  for (const mod of curriculum) {
    if ((mod.lessons || []).some((lesson) => lesson.slug === lessonSlug)) {
      return mod._id;
    }
  }
  return null;
}

function countCompletedLessons(
  curriculum: CourseModule[],
  progressMap: Record<string, boolean>,
) {
  let completed = 0;
  let total = 0;
  for (const mod of curriculum) {
    for (const lesson of mod.lessons || []) {
      total += 1;
      if (progressMap[lesson._id]) completed += 1;
    }
  }
  return { completed, total };
}

function buildGlobalLessonNumbers(modules: CourseModule[]) {
  const map = new Map<string, number>();
  let n = 0;
  for (const mod of modules) {
    for (const lesson of mod.lessons || []) {
      n += 1;
      map.set(lesson._id, n);
    }
  }
  return map;
}

function ModuleProgressBar({
  percent,
  completed,
  total,
}: {
  percent: number;
  completed: number;
  total: number;
}) {
  const tierPercent = percent === 100 ? 100 : percent;

  return (
    <div className="flex items-center gap-2">
      <div
        className={`h-1.5 min-w-0 flex-1 overflow-hidden rounded-full ${getProgressTrackClass(tierPercent)}`}
      >
        <div
          className={`h-full rounded-full transition-all duration-500 ease-out ${getProgressFillClass(tierPercent)}`}
          style={{ width: `${percent}%` }}
        />
      </div>
      <span
        className={`shrink-0 text-xs font-medium tabular-nums ${getProgressRatioClass(completed, total)}`}
      >
        {completed}/{total}
      </span>
    </div>
  );
}

function isGenericModuleTitle(title: string, moduleIndex: number) {
  const normalized = title.trim().toLowerCase();
  return (
    normalized === `module ${moduleIndex + 1}` ||
    normalized === `module ${moduleIndex + 1}.`
  );
}

export default function CurriculumSidebar({
  courseSlug,
  curriculum,
  currentLessonSlug,
  progressMap,
  enrollmentProgress = 0,
  onNavigate,
}: Props) {
  const activeLessonRef = useRef<HTMLAnchorElement>(null);

  const visibleModules = useMemo(
    () => curriculum.filter((mod) => (mod.lessons || []).length > 0),
    [curriculum],
  );

  const globalLessonNumbers = useMemo(
    () => buildGlobalLessonNumbers(visibleModules),
    [visibleModules],
  );

  const activeModuleId = useMemo(
    () => findModuleForLesson(curriculum, currentLessonSlug),
    [curriculum, currentLessonSlug],
  );

  const [openModules, setOpenModules] = useState<Record<string, boolean>>(
    () => {
      const initial: Record<string, boolean> = {};
      curriculum.forEach((mod) => {
        initial[mod._id] = mod._id === activeModuleId;
      });
      return initial;
    },
  );

  useEffect(() => {
    if (!activeModuleId) return;
    setOpenModules((prev) => ({ ...prev, [activeModuleId]: true }));
  }, [activeModuleId]);

  useEffect(() => {
    activeLessonRef.current?.scrollIntoView({
      block: "nearest",
      behavior: "smooth",
    });
  }, [currentLessonSlug]);

  const toggleModule = (moduleId: string) => {
    setOpenModules((prev) => ({ ...prev, [moduleId]: !prev[moduleId] }));
  };

  const { completed: lessonsCompleted, total: lessonsTotal } =
    countCompletedLessons(visibleModules, progressMap);

  return (
    <aside className="curriculum-sidebar lg:sticky lg:top-[4.5rem] lg:max-h-[calc(100dvh-5.5rem)] lg:overflow-y-auto lg:pr-1">
      <Link
        href={`/courses/${courseSlug}`}
        className="mb-4 inline-flex items-center gap-1.5 rounded-lg px-1 py-1 text-sm font-medium text-slate-600 transition-colors hover:text-indigo-600"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to course
      </Link>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {/* Header */}
        <div className="border-b border-slate-100 bg-slate-50/60 px-4 py-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-slate-900">Curriculum</h2>
            <ProgressValue value={enrollmentProgress} asBadge />
          </div>
          <ProgressBar value={enrollmentProgress} size="md" />
          <p className="mt-2.5 text-xs text-slate-500">
            <span className="font-medium text-slate-700">
              {lessonsCompleted} of {lessonsTotal}
            </span>{" "}
            lessons completed · {visibleModules.length} module
            {visibleModules.length === 1 ? "" : "s"}
          </p>
        </div>

        {/* Modules */}
        <div className="divide-y divide-slate-100">
          {visibleModules.map((mod, moduleIndex) => {
            const isOpen = openModules[mod._id] ?? false;
            const isActiveModule = mod._id === activeModuleId;
            const { completed, total } = getModuleProgress(mod, progressMap);
            const modulePercent =
              total > 0 ? Math.round((completed / total) * 100) : 0;
            const moduleDone = total > 0 && completed === total;
            const moduleLabel = isGenericModuleTitle(mod.title, moduleIndex)
              ? `Module ${moduleIndex + 1}`
              : mod.title;

            return (
              <div key={mod._id}>
                <button
                  type="button"
                  onClick={() => toggleModule(mod._id)}
                  className={[
                    "flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors",
                    isOpen ? "border-b border-slate-100" : "",
                    isActiveModule
                      ? "bg-indigo-50/40 hover:bg-indigo-50/60"
                      : "hover:bg-slate-50/80",
                  ].join(" ")}
                  aria-expanded={isOpen}
                >
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
                      moduleDone
                        ? "bg-emerald-500 text-white"
                        : isActiveModule
                          ? "bg-indigo-600 text-white"
                          : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {moduleDone ? (
                      <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
                    ) : (
                      moduleIndex + 1
                    )}
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-semibold text-slate-900">
                        {moduleLabel}
                      </span>
                      <ChevronDown
                        className={`h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
                      />
                    </span>
                    <div className="mt-2">
                      <ModuleProgressBar
                        percent={modulePercent}
                        completed={completed}
                        total={total}
                      />
                    </div>
                  </span>
                </button>

                <div
                  className={`grid transition-[grid-template-rows] duration-200 ease-out ${
                    isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                  }`}
                >
                  <div className="overflow-hidden">
                    <div
                      className={[
                        "mb-3 ml-[3.75rem] mr-3 mt-2 rounded-xl border border-l-[3px] p-1.5",
                        isActiveModule
                          ? "border-indigo-200/70 border-l-indigo-500 bg-indigo-50/25"
                          : "border-slate-200/80 border-l-slate-300 bg-slate-50/60",
                      ].join(" ")}
                    >
                      <ul className="space-y-0.5">
                        {(mod.lessons || []).map((lesson: Lesson) => {
                          const isActive = lesson.slug === currentLessonSlug;
                          const lessonCompleted = progressMap[lesson._id];
                          const locked = lesson.locked && !lesson.isPreview;
                          const duration = getLessonDurationLabel(lesson);
                          const lessonNumber =
                            globalLessonNumbers.get(lesson._id) ?? 0;
                          const displayTitle = getLessonDisplayTitle(
                            lesson.title,
                            lessonNumber,
                          );

                          if (locked) {
                            return (
                              <li key={lesson._id}>
                                <span className="flex items-center gap-2.5 rounded-lg px-2.5 py-2.5 text-slate-400">
                                  <LessonTypeIcon
                                    type={lesson.type}
                                    subdued
                                    size="sm"
                                  />
                                  <span className="min-w-0 flex-1 truncate text-sm">
                                    {displayTitle}
                                  </span>
                                  <Lock className="h-3.5 w-3.5 shrink-0" />
                                </span>
                              </li>
                            );
                          }

                          return (
                            <li key={lesson._id}>
                              <Link
                                ref={isActive ? activeLessonRef : undefined}
                                href={`/courses/${courseSlug}/learn/${lesson.slug}`}
                                onClick={onNavigate}
                                aria-current={isActive ? "page" : undefined}
                                className={[
                                  "group flex items-center gap-2 rounded-lg transition-colors",
                                  isActive
                                    ? "bg-indigo-600 px-2 py-1.5 text-white shadow-sm"
                                    : [
                                        "px-2.5 py-2 hover:bg-white/80",
                                        lessonCompleted
                                          ? "text-slate-600"
                                          : "text-slate-700",
                                      ].join(" "),
                                ].join(" ")}
                              >
                                <LessonTypeIcon
                                  type={lesson.type}
                                  completed={lessonCompleted}
                                  active={isActive}
                                  size="sm"
                                />
                                <span className="min-w-0 flex-1">
                                  <span
                                    className={`block truncate text-sm leading-tight ${
                                      isActive
                                        ? "font-semibold text-white"
                                        : lessonCompleted
                                          ? "font-medium"
                                          : "font-medium text-slate-800"
                                    }`}
                                  >
                                    {displayTitle}
                                  </span>
                                </span>
                                {duration ? (
                                  <span
                                    className={`shrink-0 rounded-md px-1.5 py-0.5 text-[11px] font-medium tabular-nums ${
                                      isActive
                                        ? "bg-indigo-500/50 text-indigo-50"
                                        : "bg-slate-100 text-slate-500"
                                    }`}
                                  >
                                    {duration}
                                  </span>
                                ) : null}
                              </Link>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </aside>
  );
}
