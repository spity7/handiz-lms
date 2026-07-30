export type ProgressTier =
  | "empty"
  | "start"
  | "early"
  | "mid"
  | "late"
  | "complete";

const FILL: Record<ProgressTier, string> = {
  empty: "bg-slate-300",
  start: "bg-amber-500",
  early: "bg-sky-500",
  mid: "bg-indigo-500",
  late: "bg-violet-500",
  complete: "bg-emerald-500",
};

const TRACK: Record<ProgressTier, string> = {
  empty: "bg-slate-100",
  start: "bg-amber-100",
  early: "bg-sky-100",
  mid: "bg-indigo-100",
  late: "bg-violet-100",
  complete: "bg-emerald-100",
};

const TEXT: Record<ProgressTier, string> = {
  empty: "text-slate-500",
  start: "text-amber-700",
  early: "text-sky-700",
  mid: "text-indigo-700",
  late: "text-violet-700",
  complete: "text-emerald-700",
};

const BADGE: Record<ProgressTier, string> = {
  empty: "bg-slate-100 text-slate-600 ring-slate-200/80",
  start: "bg-amber-50 text-amber-800 ring-amber-200/80",
  early: "bg-sky-50 text-sky-800 ring-sky-200/80",
  mid: "bg-indigo-50 text-indigo-800 ring-indigo-200/80",
  late: "bg-violet-50 text-violet-800 ring-violet-200/80",
  complete: "bg-emerald-50 text-emerald-800 ring-emerald-200/80",
};

export function clampProgress(value: number) {
  return Math.min(100, Math.max(0, Math.round(value)));
}

export function getProgressTier(value: number): ProgressTier {
  const v = clampProgress(value);
  if (v === 0) return "empty";
  if (v === 100) return "complete";
  if (v <= 25) return "start";
  if (v <= 50) return "early";
  if (v <= 75) return "mid";
  return "late";
}

export function getProgressFillClass(value: number) {
  return FILL[getProgressTier(value)];
}

export function getProgressTrackClass(value: number) {
  return TRACK[getProgressTier(value)];
}

export function getProgressTextClass(value: number) {
  return TEXT[getProgressTier(value)];
}

export function getProgressBadgeClass(value: number) {
  return BADGE[getProgressTier(value)];
}

export function getProgressRatioClass(completed: number, total: number) {
  if (total <= 0) return getProgressTextClass(0);
  return getProgressTextClass(Math.round((completed / total) * 100));
}
