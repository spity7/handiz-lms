"use client";

import { useEffect, useRef, useState } from "react";

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

async function seekVideoTo(
  player: VdoPlayerInstance,
  seconds: number,
): Promise<boolean> {
  try {
    (player.video as unknown as { currentTime: number }).currentTime = seconds;
    return true;
  } catch {
    return false;
  }
}

function attachResumeWhenReady(
  player: VdoPlayerInstance,
  seconds: number,
  onSeeked: (sec: number) => void,
) {
  if (seconds <= 0) return () => {};

  let seekApplied = false;
  const target = Math.max(0, Math.floor(seconds));

  const trySeek = () => {
    if (seekApplied) return;
    void seekVideoTo(player, target).then((ok) => {
      if (ok) {
        seekApplied = true;
        onSeeked(target);
      }
    });
  };

  const events = ["loadedmetadata", "loadeddata", "canplay"] as const;
  const handlers = events.map((event) => {
    const handler = () => trySeek();
    player.video.addEventListener(event, handler);
    return { event, handler };
  });

  trySeek();

  return () => {
    for (const { event, handler } of handlers) {
      player.video.removeEventListener(event, handler);
    }
  };
}

type PlaybackTokens = {
  otp: string;
  playbackInfo: string;
};

type Props = {
  otp: string;
  playbackInfo: string;
  ttlSeconds?: number;
  initialResumeSeconds?: number;
  onRefreshPlayback?: () => Promise<PlaybackTokens | null>;
  onProgress?: (seconds: number) => void;
  onComplete?: () => void;
};

export default function VdoCipherPlayer({
  otp,
  playbackInfo,
  ttlSeconds = 300,
  initialResumeSeconds = 0,
  onRefreshPlayback,
  onProgress,
  onComplete,
}: Props) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const lastReported = useRef(0);
  const resumeAtRef = useRef(0);
  const onProgressRef = useRef(onProgress);
  const onCompleteRef = useRef(onComplete);
  const onRefreshRef = useRef(onRefreshPlayback);
  const [tokens, setTokens] = useState<PlaybackTokens>({
    otp,
    playbackInfo,
  });

  useEffect(() => {
    onProgressRef.current = onProgress;
    onCompleteRef.current = onComplete;
    onRefreshRef.current = onRefreshPlayback;
  }, [onProgress, onComplete, onRefreshPlayback]);

  useEffect(() => {
    setTokens({ otp, playbackInfo });
  }, [otp, playbackInfo]);

  useEffect(() => {
    if (!onRefreshRef.current) return;

    const refreshMs = Math.max(60_000, (ttlSeconds - 45) * 1000);
    const timer = window.setInterval(() => {
      void (async () => {
        const iframe = iframeRef.current;
        if (iframe) {
          try {
            const player = await getPlayerInstance(iframe);
            if (player) {
              resumeAtRef.current = Math.floor(player.video.currentTime || 0);
            }
          } catch {
            resumeAtRef.current = lastReported.current;
          }
        }

        const next = await onRefreshRef.current?.();
        if (next?.otp && next?.playbackInfo) {
          setTokens(next);
        }
      })();
    }, refreshMs);

    return () => window.clearInterval(timer);
  }, [ttlSeconds]);

  useEffect(() => {
    const resumeAt = Math.max(0, Math.floor(initialResumeSeconds));
    resumeAtRef.current = resumeAt;
    lastReported.current = resumeAt > 0 ? Math.max(0, resumeAt - 6) : 0;

    const iframe = iframeRef.current;
    if (!iframe) return;

    let cancelled = false;
    let cleanupProgress: (() => void) | undefined;
    let cleanupResume: (() => void) | undefined;

    const setupPlayer = async () => {
      const player = await getPlayerInstance(iframe);
      if (cancelled || !player) return;

      cleanupResume?.();
      cleanupResume = attachResumeWhenReady(
        player,
        resumeAtRef.current,
        (sec) => {
          lastReported.current = Math.max(0, sec - 1);
        },
      );

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

      cleanupProgress = () => {
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
      cleanupResume?.();
      cleanupProgress?.();
    };
  }, [tokens.otp, tokens.playbackInfo, initialResumeSeconds]);

  const src = `https://player.vdocipher.com/v2/?otp=${encodeURIComponent(tokens.otp)}&playbackInfo=${encodeURIComponent(tokens.playbackInfo)}`;

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
