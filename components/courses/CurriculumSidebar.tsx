import Link from "next/link";
import { CheckCircle2, Circle, Lock } from "lucide-react";
import type { CourseModule, Lesson } from "@/types/course";

export default function CurriculumSidebar({
  courseSlug,
  curriculum,
  currentLessonSlug,
  progressMap,
  onNavigate,
}: {
  courseSlug: string;
  curriculum: CourseModule[];
  currentLessonSlug: string;
  progressMap: Record<string, boolean>;
  onNavigate?: () => void;
}) {
  return (
    <aside className="lg:sticky lg:top-24">
      <Link
        href="/my-courses"
        className="mb-4 inline-flex items-center text-sm text-slate-500 transition-colors hover:text-indigo-600"
      >
        ← My Courses
      </Link>

      <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
        {curriculum
          .filter((mod) => (mod.lessons || []).length > 0)
          .map((mod) => (
            <div key={mod._id} className="mb-5 last:mb-0">
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                {mod.title}
              </h3>
              <ul className="space-y-0.5">
                {(mod.lessons || []).map((lesson: Lesson) => {
                  const isActive = lesson.slug === currentLessonSlug;
                  const completed = progressMap[lesson._id];
                  const locked = lesson.locked && !lesson.isPreview;

                  if (locked) {
                    return (
                      <li key={lesson._id}>
                        <span className="flex items-center gap-2 rounded-lg px-2 py-2 text-sm text-slate-400">
                          <Lock className="h-4 w-4 shrink-0" />
                          <span className="line-clamp-2">{lesson.title}</span>
                        </span>
                      </li>
                    );
                  }

                  return (
                    <li key={lesson._id}>
                      <Link
                        href={`/courses/${courseSlug}/learn/${lesson.slug}`}
                        onClick={onNavigate}
                        className={`flex items-center gap-2 rounded-lg px-2 py-2 text-sm transition-colors ${
                          isActive
                            ? "bg-indigo-50 font-medium text-indigo-700"
                            : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                        }`}
                      >
                        {completed ? (
                          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                        ) : (
                          <Circle className="h-4 w-4 shrink-0 text-slate-300" />
                        )}
                        <span className="line-clamp-2">{lesson.title}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
      </div>
    </aside>
  );
}
