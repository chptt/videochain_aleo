
"use client";

import { useEffect, useRef, useState } from "react";

interface Props {
  contentId: string;
  sessionId: string;
  wrappedKey: string;
  expiresAt: string;
}

export function VideoPlayer({ contentId, sessionId, expiresAt }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [expired, setExpired] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);

  useEffect(() => {
    const expiry = new Date(expiresAt).getTime();
    const tick = () => {
      const left = Math.max(0, Math.floor((expiry - Date.now()) / 1000));
      setSecondsLeft(left);
      if (left === 0) {
        setExpired(true);
        videoRef.current?.pause();
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [expiresAt]);

  const streamUrl = `/api/stream/${contentId}?sid=${sessionId}`;

  if (expired) {
    return (
      <div className="card flex flex-col items-center gap-3 py-12 text-center">
        <span className="text-4xl">⏰</span>
        <p className="text-yellow-400 font-medium">Session expired</p>
        <p className="text-sm text-gray-500">Refresh the page to re-verify your entitlement.</p>
      </div>
    );
  }

  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
  const ss = String(secondsLeft % 60).padStart(2, "0");

  return (
    <div className="flex flex-col gap-2">
      <div className="relative overflow-hidden rounded-xl bg-black">
        <video
          ref={videoRef}
          src={streamUrl}
          controls
          autoPlay
          className="w-full"
          onContextMenu={(e) => e.preventDefault()}
        />
        {/* Countdown overlay */}
        <div className="absolute bottom-2 left-2 rounded bg-black/60 px-2 py-0.5 text-xs text-gray-300">
          Session: {mm}:{ss}
        </div>
      </div>
      <p className="text-xs text-gray-600 text-center">
        🔒 Encrypted stream — session expires in {mm}:{ss}
      </p>
    </div>
  );
}
