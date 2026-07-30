import { Check, Download, FileText, HelpCircle, Play } from "lucide-react";
import type { Lesson } from "@/types/course";

type Props = {
  type: Lesson["type"];
  subdued?: boolean;
  preview?: boolean;
  completed?: boolean;
  active?: boolean;
  size?: "sm" | "md";
};

export default function LessonTypeIcon({
  type,
  subdued = false,
  preview = false,
  completed = false,
  active = false,
  size = "md",
}: Props) {
  const shell = active
    ? "bg-white/20 text-white ring-1 ring-white/30"
    : completed
      ? "bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100"
      : subdued
        ? "bg-slate-100 text-slate-400"
        : preview
          ? "bg-emerald-50 text-emerald-600"
          : "bg-indigo-50 text-indigo-600";
  const iconClass = size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5";
  const boxClass = size === "sm" ? "h-6 w-6 rounded-md" : "h-7 w-7 rounded-md";

  let icon;
  if (completed && !active) {
    icon = <Check className={iconClass} strokeWidth={2.5} />;
  } else {
    switch (type) {
      case "video":
        icon = <Play className={iconClass} />;
        break;
      case "quiz":
        icon = <HelpCircle className={iconClass} />;
        break;
      case "download":
        icon = <Download className={iconClass} />;
        break;
      default:
        icon = <FileText className={iconClass} />;
    }
  }

  return (
    <span
      className={`flex shrink-0 items-center justify-center ${boxClass} ${shell}`}
    >
      {icon}
    </span>
  );
}
