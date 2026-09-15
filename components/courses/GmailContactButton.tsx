import type { ComponentProps } from "react";

function GmailIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
    >
      <path d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.91 1.528-1.145C21.69 2.28 24 3.434 24 5.457z" />
    </svg>
  );
}

type GmailContactButtonProps = {
  href: string;
  className?: string;
  size?: "default" | "lg";
  label?: string;
} & Pick<ComponentProps<"a">, "onClick">;

export default function GmailContactButton({
  href,
  className = "",
  size = "default",
  label = "Contact us on Gmail",
  onClick,
}: GmailContactButtonProps) {
  const sizeClass =
    size === "lg"
      ? "gap-2 rounded-xl px-6 py-3 text-base"
      : "gap-2 rounded-xl px-4 py-2.5 text-sm";

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={onClick}
      className={`inline-flex w-full items-center justify-center font-medium text-white shadow-sm transition-colors hover:bg-[#C5221F] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EA4335] focus-visible:ring-offset-2 ${sizeClass} bg-[#EA4335] ${className}`}
    >
      <GmailIcon className="h-5 w-5 shrink-0" />
      {label}
    </a>
  );
}
