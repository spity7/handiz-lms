"use client";

import { useEffect, useRef } from "react";

type Props = {
  otp: string;
  playbackInfo: string;
  onProgress?: (seconds: number) => void;
  onComplete?: () => void;
};

export default function VdoCipherPlayer({
  otp,
  playbackInfo,
  onProgress,
  onComplete,
}: Props) {
  const lastReported = useRef(0);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (!event.origin.includes("vdocipher.com")) return;
      const data = event.data;
      if (!data || typeof data !== "object") return;

      if (data.event === "timeupdate" && typeof data.currentTime === "number") {
        const sec = Math.floor(data.currentTime);
        if (sec - lastReported.current >= 5) {
          lastReported.current = sec;
          onProgress?.(sec);
        }
      }

      if (data.event === "ended" || data.event === "complete") {
        onComplete?.();
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [onProgress, onComplete]);

  const src = `https://player.vdocipher.com/v2/?otp=${encodeURIComponent(otp)}&playbackInfo=${encodeURIComponent(playbackInfo)}`;

  return (
    <div
      className="relative mb-6 aspect-video overflow-hidden rounded-2xl bg-slate-900 shadow-lg select-none"
      onContextMenu={(e) => e.preventDefault()}
    >
      <iframe
        src={src}
        className="absolute inset-0 h-full w-full border-0"
        allow="encrypted-media"
        allowFullScreen
        title="Course video"
      />
    </div>
  );
}
