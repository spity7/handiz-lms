"use client";

import { useEffect, useRef } from "react";

const VDO_API_SCRIPT = "https://player.vdocipher.com/v2/api.js";

type VdoPlayerInstance = {
  video: {
    addEventListener: (event: string, handler: () => void) => void;
    removeEventListener: (event: string, handler: () => void) => void;
    currentTime: number;
  };
};

declare global {
  interface Window {
    VdoPlayer?: {
      getInstance: (iframe: HTMLIFrameElement) => VdoPlayerInstance;
    };
  }
}

function loadVdoApi(): Promise<void> {
  if (window.VdoPlayer) return Promise.resolve();

  const existing = document.querySelector<HTMLScriptElement>(
    `script[src="${VDO_API_SCRIPT}"]`,
  );
  if (existing) {
    return new Promise((resolve, reject) => {
      if (window.VdoPlayer) {
        resolve();
        return;
      }
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () =>
        reject(new Error("Failed to load VdoCipher API")),
      );
    });
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = VDO_API_SCRIPT;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load VdoCipher API"));
    document.body.appendChild(script);
  });
}

async function getPlayerInstance(
  iframe: HTMLIFrameElement,
): Promise<VdoPlayerInstance | null> {
  await loadVdoApi();
  if (!window.VdoPlayer) return null;

  for (let attempt = 0; attempt < 10; attempt += 1) {
    try {
      return window.VdoPlayer.getInstance(iframe);
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }

  return null;
}

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
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const lastReported = useRef(0);
  const onProgressRef = useRef(onProgress);
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onProgressRef.current = onProgress;
    onCompleteRef.current = onComplete;
  }, [onProgress, onComplete]);

  useEffect(() => {
    lastReported.current = 0;
    const iframe = iframeRef.current;
    if (!iframe) return;

    let cancelled = false;
    let cleanup: (() => void) | undefined;

    const setupPlayer = async () => {
      const player = await getPlayerInstance(iframe);
      if (cancelled || !player) return;

      const handleTimeUpdate = () => {
        const sec = Math.floor(player.video.currentTime || 0);
        if (sec - lastReported.current >= 5) {
          lastReported.current = sec;
          onProgressRef.current?.(sec);
        }
      };

      const handleEnded = () => {
        onCompleteRef.current?.();
      };

      player.video.addEventListener("timeupdate", handleTimeUpdate);
      player.video.addEventListener("ended", handleEnded);

      cleanup = () => {
        player.video.removeEventListener("timeupdate", handleTimeUpdate);
        player.video.removeEventListener("ended", handleEnded);
      };
    };

    const handleIframeLoad = () => {
      void setupPlayer();
    };

    iframe.addEventListener("load", handleIframeLoad);
    if (iframe.contentWindow) {
      void setupPlayer();
    }

    return () => {
      cancelled = true;
      iframe.removeEventListener("load", handleIframeLoad);
      cleanup?.();
    };
  }, [otp, playbackInfo]);

  const src = `https://player.vdocipher.com/v2/?otp=${encodeURIComponent(otp)}&playbackInfo=${encodeURIComponent(playbackInfo)}`;

  return (
    <div
      className="relative mb-6 aspect-video overflow-hidden rounded-2xl bg-slate-900 shadow-lg select-none"
      onContextMenu={(e) => e.preventDefault()}
    >
      <iframe
        ref={iframeRef}
        src={src}
        className="absolute inset-0 h-full w-full border-0"
        allow="encrypted-media"
        allowFullScreen
        title="Course video"
      />
    </div>
  );
}
